require "rails_helper"

# This year's budgets (ADR 0020): each department's yearly payroll of active staff, in INR, against
# its budget, and the combined figure. Every number is worked out by hand.
RSpec.describe Budgets::OverviewQuery do
  let(:result) { described_class.new.call }

  before do
    travel_to Date.new(2026, 10, 30)
    create(:exchange_rate, currency_code: "INR", rate_to_usd: "0.012", as_of: Date.new(2026, 10, 1))
    create(:exchange_rate, currency_code: "USD", rate_to_usd: "1.0", as_of: Date.new(2026, 10, 1))
    india = create(:country, code: "IN", name: "India", currency_code: "INR")
    us = create(:country, code: "US", name: "United States", currency_code: "USD")
    uk = create(:country, code: "GB", name: "United Kingdom", currency_code: "GBP")
    engineering, sales, finance, hr = %w[Engineering Sales Finance HR].map { |name| create(:department, name:) }

    # Engineering: 1,200,000 + 1,800,000 + 100,000 USD (8,333,333.33) = 11,333,333.33 against
    # 12,000,000 (94.4%, near the limit; 12.7 months). The terminated salary doesn't count.
    create(:employee, country: india, department: engineering, current_salary: "1200000")
    create(:employee, country: india, department: engineering, current_salary: "1800000")
    create(:employee, :terminated, country: india, department: engineering, current_salary: "9000000")
    create(:employee, country: us, department: engineering, current_salary: "100000")
    create(:department_budget, department: engineering, amount: "12000000")
    # Sales: 1,000,000 against 900,000 (111.1%, over; 10.8 months). GBP has no rate.
    create(:employee, country: india, department: sales, current_salary: "1000000")
    create(:employee, country: uk, department: sales, current_salary: "50000")
    create(:department_budget, department: sales, amount: "900000")
    # Finance: 500,000 against 1,000,000 (50%, under; 24 months).
    create(:employee, country: india, department: finance, current_salary: "500000")
    create(:department_budget, department: finance, amount: "1000000")
    # HR: staff, and only last year's budget, which doesn't count.
    create(:employee, country: india, department: hr, current_salary: "400000")
    build(:department_budget, department: hr, year: 2025, amount: "1").save!(validate: false)
  end

  def department(name)
    result[:departments].find { |d| d[:name] == name }
  end

  it "covers this year, in INR, and names the currencies it can't convert" do
    expect(result).to include(year: 2026, currency: "INR", rates_as_of: Date.new(2026, 10, 1),
                              excluded_currencies: [ "GBP" ])
  end

  it "lists every department by name" do
    expect(result[:departments].pluck(:name)).to eq(%w[Engineering Finance HR Sales])
  end

  describe "a department" do
    it "compares its active staff's yearly payroll, in INR, with its budget" do
      expect(department("Engineering")).to include(
        headcount: 3, payroll: "11333333.33", budget: include(amount: "12000000.0"),
        utilisation_percent: 94.4, status: "near", runway_months: 12.7
      )
    end

    it "is over budget above 100%" do
      expect(department("Sales")).to include(status: "over", utilisation_percent: 111.1, runway_months: 10.8)
    end

    it "is under budget below 90%" do
      expect(department("Finance")).to include(status: "under", utilisation_percent: 50.0, runway_months: 24.0)
    end

    it "says when it has no budget for this year" do
      expect(department("HR")).to include(status: "no_budget", headcount: 1, payroll: "400000.0", budget: nil,
                                          utilisation_percent: nil, runway_months: nil)
    end

    it "counts staff whose pay can't be converted, but leaves their pay out" do
      expect(department("Sales")).to include(headcount: 2, payroll: "1000000.0")
    end

    # 100,040 against 100,000 is 100.04%, shown as 100.0%: near the limit, not "Over budget · 100%".
    it "decides the status on the % it shows" do
      legal = create(:department, name: "Legal")
      create(:employee, department: legal, country: Country.find_by!(code: "IN"), current_salary: "100040")
      create(:department_budget, department: legal, amount: "100000")

      expect(department("Legal")).to include(utilisation_percent: 100.0, status: "near")
    end
  end

  describe "the combined budget" do
    # Budgets 12,000,000 + 900,000 + 1,000,000 = 13,900,000;
    # their payroll 11,333,333.33 + 1,000,000 + 500,000 = 12,833,333.33.
    it "adds up the departments that have a budget" do
      expect(result[:total]).to include(
        unbudgeted_departments: 1, budget: "13900000.0", payroll: "12833333.33",
        utilisation_percent: 92.3, status: "near", runway_months: 13.0
      )
    end

    it "has no status before any budget is set" do
      DepartmentBudget.delete_all

      expect(result[:total]).to include(unbudgeted_departments: 4, budget: nil, utilisation_percent: nil,
                                        status: "no_budget")
    end
  end
end
