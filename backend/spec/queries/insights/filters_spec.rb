require "rails_helper"

# The filters every insight shares (ADR 0019): read and checked once, applied the same way.
RSpec.describe Insights::Filters do
  let(:india) { create(:country, code: "IN", name: "India", currency_code: "INR") }
  let(:engineering) { create(:department, name: "Engineering") }

  before { travel_to Date.new(2026, 10, 31) }

  it "narrows employees by any combination of country, department, job title and tenure" do
    match = create(:employee, country: india, department: engineering, hire_date: Date.new(2024, 6, 1))
    create(:employee, country: india, department: engineering, hire_date: Date.new(2026, 6, 1)) # under a year
    create(:employee, country: india, hire_date: Date.new(2024, 6, 1)) # another department

    filters = described_class.new(country_code: "in", department_id: engineering.id, tenure: "1_3")

    expect(filters.apply(Employee.all)).to contain_exactly(match)
  end

  it "uses one country's own currency, and INR across countries", :aggregate_failures do
    expect(described_class.new(country_code: india.code).currency).to eq("INR")
    expect(described_class.new(country_code: create(:country, code: "US", currency_code: "USD").code).currency)
      .to eq("USD")
    expect(described_class.new(department_id: engineering.id)).to have_attributes(currency: "INR", converted?: true)
  end

  it "describes what it applies, for the page" do
    expect(described_class.new(country_code: india.code.downcase, tenure: "5_10").to_h).to eq(
      country: { code: "IN", name: "India" }, department: nil, job_title: nil,
      tenure: { key: "5_10", label: "5–10 years" }
    )
  end

  it "rejects values that don't exist, so a bad link is a 404", :aggregate_failures do
    expect { described_class.new(country_code: "xx") }.to raise_error(ActiveRecord::RecordNotFound)
    expect { described_class.new(department_id: 0) }.to raise_error(ActiveRecord::RecordNotFound)
    expect { described_class.new(job_title_id: 0) }.to raise_error(ActiveRecord::RecordNotFound)
    expect { described_class.new(tenure: "forever") }.to raise_error(ActiveRecord::RecordNotFound)
  end
end
