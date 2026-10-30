require "rails_helper"

# Salary changes effective in the last 12 months, by reason (ADR 0019). Each change is compared
# with the employee's previous salary; costs are converted to INR. Worked out by hand.
RSpec.describe Insights::PayChangesQuery do
  let(:india) { create(:country, code: "IN", currency_code: "INR") }
  let(:us) { create(:country, code: "US", currency_code: "USD") }
  let(:result) { described_class.new.call }

  def revise(employee, amount, reason, on)
    create(:salary_revision, employee:, amount:, reason:, effective_from: on)
  end

  before do
    travel_to Date.new(2026, 10, 30)
    create(:exchange_rate, currency_code: "INR", rate_to_usd: "0.012", as_of: Date.new(2026, 10, 1))
    create(:exchange_rate, currency_code: "USD", rate_to_usd: "1.0", as_of: Date.new(2026, 10, 1))

    asha = create(:employee, country: india, hire_date: Date.new(2024, 1, 15), current_salary: "1320000")
    revise(asha, "1000000", "hire", Date.new(2024, 1, 15))
    revise(asha, "1050000", "annual_raise", Date.new(2025, 4, 1)) # more than 12 months ago: left out
    revise(asha, "1100000", "annual_raise", Date.new(2026, 4, 1))  # +50,000, +4.76%
    revise(asha, "1320000", "promotion", Date.new(2026, 6, 1))     # +220,000, +20%

    # Someone who has since left: their correction still happened. -10,000 USD is -833,333.33 INR.
    john = create(:employee, country: us, hire_date: Date.new(2023, 1, 1), current_salary: "90000")
    revise(john, "100000", "hire", Date.new(2023, 1, 1))
    revise(john, "90000", "correction", Date.new(2026, 5, 1))
    john.terminate!(on: Date.new(2026, 9, 30))
  end

  def row(reason)
    result[:rows].find { |r| r[:reason] == reason }
  end

  it "covers the last 12 months, in INR" do
    expect(result).to include(since: Date.new(2025, 10, 30), currency: "INR", rates_as_of: Date.new(2026, 10, 1))
  end

  it "counts each reason's changes, their average % and what they added to yearly pay", :aggregate_failures do
    expect(row("annual_raise")).to eq(reason: "annual_raise", count: 1, average_percent: 4.8, yearly_cost: "50000.0")
    expect(row("promotion")).to eq(reason: "promotion", count: 1, average_percent: 20.0, yearly_cost: "220000.0")
    expect(row("correction")).to eq(reason: "correction", count: 1, average_percent: -10.0, yearly_cost: "-833333.33")
  end

  it "leaves out hires, which aren't changes" do
    expect(row("hire")).to be_nil
  end

  it "totals every change" do
    expect(result[:total]).to eq(count: 3, average_percent: 4.9, yearly_cost: "-563333.33")
  end
end
