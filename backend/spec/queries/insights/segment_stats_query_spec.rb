require "rails_helper"

# Every expected number below is worked out by hand (ADR 0019).
RSpec.describe Insights::SegmentStatsQuery do
  let(:india) { create(:country, code: "IN", name: "India", currency_code: "INR") }
  let(:us) { create(:country, code: "US", name: "United States", currency_code: "USD") }
  let(:engineering) { create(:department, name: "Engineering") }
  let(:sales) { create(:department, name: "Sales") }

  before do
    travel_to Date.new(2026, 10, 30)
    create(:exchange_rate, currency_code: "INR", rate_to_usd: "0.012", as_of: Date.new(2026, 10, 1))
    create(:exchange_rate, currency_code: "USD", rate_to_usd: "1.0", as_of: Date.new(2026, 10, 1))

    create(:employee, country: india, department: engineering, current_salary: "1000000", hire_date: Date.new(2026, 3, 1))
    create(:employee, country: india, department: engineering, current_salary: "2000000", hire_date: Date.new(2024, 1, 1))
    create(:employee, country: india, department: sales, current_salary: "3000000", hire_date: Date.new(2020, 1, 1))
    # 100,000 USD is 100,000 × 1.0 / 0.012 = 8,333,333.33 INR.
    create(:employee, country: us, department: engineering, current_salary: "100000", hire_date: Date.new(2015, 6, 1))
    # Former employees don't count.
    create(:employee, :terminated, country: india, department: engineering, current_salary: "9000000")
  end

  def stats(**params)
    described_class.new(**params).call
  end

  def row(result, label)
    result[:rows].find { |r| r[:label] == label }
  end

  describe "by country" do
    it "gives each country's figures in its own currency, unconverted" do
      expect(row(stats(by: "country"), "India")).to include(
        headcount: 3, currency: "INR", min: "1000000.0", median: "2000000.0", mean: "2000000.0",
        max: "3000000.0", payroll: "6000000.0"
      )
    end

    it "adds the median and payroll in INR, so countries can be compared on a chart" do
      expect(row(stats(by: "country"), "United States")).to include(
        currency: "USD", median: "100000.0", converted: { currency: "INR", median: "8333333.33", payroll: "8333333.33" }
      )
    end
  end

  describe "across countries" do
    it "converts every salary to INR before working out the figures", :aggregate_failures do
      result = stats(by: "department")

      expect(result).to include(currency: "INR", converted: true, rates_as_of: Date.new(2026, 10, 1))
      expect(row(result, "Engineering")).to include(
        headcount: 3, min: "1000000.0", median: "2000000.0", mean: "3777777.78", max: "8333333.33",
        payroll: "11333333.33"
      )
    end

    it "uses the country's own currency when filtered to one country", :aggregate_failures do
      result = stats(by: "department", country_code: "in")

      expect(result).to include(currency: "INR", converted: false)
      expect(row(result, "Engineering")).to include(headcount: 2, median: "1500000.0", payroll: "3000000.0")
    end

    it "names currencies with no exchange rate instead of silently leaving people out", :aggregate_failures do
      brazil = create(:country, code: "BR", currency_code: "BRL")
      create(:employee, country: brazil, department: engineering, current_salary: "500000")

      result = stats(by: "department")

      expect(result[:excluded_currencies]).to eq([ "BRL" ])
      expect(row(result, "Engineering")[:headcount]).to eq(3)
    end
  end

  describe "by tenure" do
    it "puts everyone in a band by hire date, and lists every band in order" do
      result = stats(by: "tenure")

      expect(result[:rows].map { |r| [ r[:label], r[:headcount] ] }).to eq([
        [ "Under 1 year", 1 ], [ "1–3 years", 1 ], [ "3–5 years", 0 ], [ "5–10 years", 1 ], [ "10+ years", 1 ]
      ])
    end
  end

  it "groups by job title too" do
    expect(stats(by: "job_title")[:rows].sum { |r| r[:headcount] }).to eq(4)
  end

  it "falls back to countries for an unknown segment" do
    expect(stats(by: "favourite_colour")[:by]).to eq("country")
  end
end
