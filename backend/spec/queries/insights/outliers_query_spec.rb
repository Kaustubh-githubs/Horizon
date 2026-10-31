require "rails_helper"

# A ★ marks someone paid more than the threshold (40% by default) below or above the median of
# their peers: active employees with the same job title in the same country (ADR 0019).
RSpec.describe Insights::OutliersQuery do
  let(:india) { create(:country, code: "IN", currency_code: "INR") }
  let(:us) { create(:country, code: "US", currency_code: "USD") }
  let(:engineer) { create(:job_title, name: "Software Engineer") }

  # Seven Indian engineers: the median is 1,000,000, so 500,000 is 50% below, 700,000 is 30% below
  # and 1,600,000 is 60% above.
  let!(:underpaid) { create(:employee, full_name: "Underpaid", country: india, job_title: engineer, current_salary: "500000") }
  let!(:typical) { create(:employee, full_name: "Typical", country: india, job_title: engineer, current_salary: "1000000") }

  before do
    create(:employee, full_name: "Overpaid", country: india, job_title: engineer, current_salary: "1600000")
    create(:employee, full_name: "Slightly low", country: india, job_title: engineer, current_salary: "700000")
    create_list(:employee, 3, country: india, job_title: engineer, current_salary: "1000000")
    # A former employee neither counts towards the median nor gets a star.
    create(:employee, :terminated, country: india, job_title: engineer, current_salary: "10000000")
    # Only two US engineers: too few to judge, however different their pay.
    create(:employee, country: us, job_title: engineer, current_salary: "100000")
    create(:employee, country: us, job_title: engineer, current_salary: "1000000")
  end

  # Threshold and direction go to the list; the rest are the page's filters (Insights::Filters).
  def names(**params)
    options = params.slice(:threshold, :direction)
    filters = Insights::Filters.new(**params.except(:threshold, :direction))
    described_class.new(**options, filters:).call.map(&:full_name)
  end

  it "lists only people matching the filters, compared with everyone in their role and country" do
    flagged = described_class.new(filters: Insights::Filters.new(department_id: underpaid.department_id)).call

    expect(flagged.map { |e| [ e.full_name, e.peer_count, e.deviation_percent.to_d.round(1) ] })
      .to eq([ [ "Underpaid", 7, -50.0 ] ])
  end

  it "flags people far from their peers' median, furthest first" do
    expect(names).to eq(%w[Overpaid Underpaid])
  end

  it "reports each person's peer median, peer count and % from the median" do
    flagged = described_class.new.call.index_by(&:full_name)

    expect(flagged.transform_values { |e| [ e.peer_median.to_d, e.peer_count, e.deviation_percent.to_d.round(1) ] })
      .to eq("Overpaid" => [ 1_000_000, 7, 60.0 ], "Underpaid" => [ 1_000_000, 7, -50.0 ])
  end

  it "filters to people paid below or above their peers" do
    expect([ names(direction: "below"), names(direction: "above") ]).to eq([ %w[Underpaid], %w[Overpaid] ])
  end

  it "uses the threshold HR picks, counting a difference equal to it" do
    expect([ names(threshold: 20), names(threshold: 50) ])
      .to eq([ [ "Overpaid", "Underpaid", "Slightly low" ], %w[Overpaid Underpaid] ])
  end

  it "uses 40% for a threshold outside 20–50%" do
    expect([ names(threshold: 5), names(threshold: 55) ]).to all(eq(%w[Overpaid Underpaid]))
  end

  it "filters by country" do
    expect(names(country_code: "us")).to be_empty
  end

  it "refuses an unknown country, like the segment figures" do
    expect { names(country_code: "xx") }.to raise_error(ActiveRecord::RecordNotFound)
  end

  describe ".position" do
    it "says how one employee compares with their peers, and whether they get a star" do
      expect(described_class.position(underpaid)).to include(flagged: true, direction: "below", deviation_percent: -50.0,
                                                             peer_median: "1000000.0", peer_count: 7)
    end

    it "doesn't flag someone close to the median" do
      expect(described_class.position(typical)).to include(flagged: false, deviation_percent: 0.0)
    end

    # The banner and the list must agree: 39.96% below rounds to 40.0 for display, but isn't 40%.
    it "agrees with the list just under the threshold", :aggregate_failures do
      uk = create(:country, code: "GB", currency_code: "GBP")
      close = create(:employee, country: uk, job_title: engineer, current_salary: "600400")
      create_list(:employee, 4, country: uk, job_title: engineer, current_salary: "1000000")

      expect(described_class.position(close)).to include(flagged: false, deviation_percent: -40.0)
      expect(names(country_code: "gb")).to be_empty
    end

    it "doesn't judge a group smaller than five" do
      expect(described_class.position(Employee.find_by!(country: us, current_salary: 100_000)))
        .to include(flagged: false, enough_peers: false, peer_count: 2)
    end
  end
end
