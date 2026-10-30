require "rails_helper"

RSpec.describe DepartmentBudget, type: :model do
  subject(:budget) { build(:department_budget) }

  # Fixed "today", so this year is 2026.
  before { travel_to Date.new(2026, 10, 30) }

  it "is valid when built from the factory" do
    expect(budget).to be_valid
  end

  describe "associations and required fields" do
    it { is_expected.to belong_to(:department) }
    it { is_expected.to validate_presence_of(:amount) }
    it { is_expected.to validate_presence_of(:year) }
  end

  describe "amount" do
    it "rejects zero" do
      budget.amount = 0

      expect(budget).not_to be_valid
    end

    it "rejects an amount too large for the money column" do
      budget.amount = 10**13

      expect(budget.tap(&:valid?).errors[:amount]).to eq([ "is too large" ])
    end
  end

  # Comparisons use today's payroll, so only this year's budget can be set or changed (ADR 0020).
  it "must be for this year", :aggregate_failures do
    expect(build(:department_budget, year: 2025).tap(&:valid?).errors[:year]).to eq([ "must be this year (2026)" ])
    expect(build(:department_budget, year: 2027)).not_to be_valid
  end

  it "allows one budget per department and year" do
    saved = create(:department_budget)
    duplicate = build(:department_budget, department: saved.department, year: saved.year)

    expect(duplicate.tap(&:valid?).errors[:year]).to eq([ "already has a budget for this department" ])
  end

  it "refuses to save an edit made on a stale copy" do
    saved = create(:department_budget)
    stale_copy = described_class.find(saved.id)
    saved.update!(amount: "11000000")

    expect { stale_copy.update!(amount: "12000000") }.to raise_error(ActiveRecord::StaleObjectError)
  end

  # Budgets are the first model on the audit trail (ADR 0012, 0020).
  it "records setting the budget and each change of amount", :aggregate_failures do
    saved = create(:department_budget, amount: "1000000")
    saved.update!(amount: "1200000")

    expect(saved.audits.pluck(:action)).to eq(%w[create update])
    expect(saved.audits.last.audited_changes["amount"].map(&:to_d)).to eq([ 1_000_000, 1_200_000 ])
  end

  describe "database constraints" do
    it "rejects a second budget for the same department and year" do
      saved = create(:department_budget)
      row = saved.attributes.slice("department_id", "year", "amount")

      expect { described_class.insert_all!([ row ]) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "rejects an amount that isn't positive" do
      row = { department_id: create(:department).id, year: 2026, amount: 0 }

      expect { described_class.insert_all!([ row ]) }
        .to raise_error(ActiveRecord::StatementInvalid, /department_budgets_amount_positive/)
    end
  end
end
