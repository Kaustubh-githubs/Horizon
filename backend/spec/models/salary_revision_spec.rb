require "rails_helper"

RSpec.describe SalaryRevision, type: :model do
  subject(:revision) { build(:salary_revision) }

  # Fixed "today" so date rules give the same result on any day.
  before { travel_to Date.new(2026, 10, 28) }

  it "is valid when built from the factory" do
    expect(revision).to be_valid
  end

  describe "associations and required fields" do
    it { is_expected.to belong_to(:employee) }
    it { is_expected.to validate_presence_of(:amount) }
    it { is_expected.to validate_presence_of(:currency) }
    it { is_expected.to validate_presence_of(:effective_from) }

    it do
      expect(revision).to define_enum_for(:reason)
        .with_values(hire: "hire", annual_raise: "annual_raise", promotion: "promotion",
                     market_adjustment: "market_adjustment", correction: "correction")
        .backed_by_column_of_type(:string)
        .validating
    end
  end

  describe "amount and currency" do
    it "rejects an amount of zero" do
      revision.amount = 0

      expect(revision).not_to be_valid
    end

    it "rejects an amount too large for the money column" do
      revision.amount = 10**13

      expect(revision.tap(&:valid?).errors[:amount]).to eq([ "is too large" ])
    end

    it "rejects more than two decimal places instead of rounding them (ADR 0006)" do
      revision.amount = "1300000.555"

      expect(revision.tap(&:valid?).errors[:amount]).to eq([ "can have at most 2 decimal places" ])
    end

    it "trims and uppercases the currency" do
      expect(described_class.new(currency: " inr ").currency).to eq("INR")
    end

    it "rejects a currency that is not the employee's country currency" do
      revision.employee = build(:employee, country: build(:country, currency_code: "INR"), current_currency: "INR")
      revision.currency = "USD"

      expect(revision).not_to be_valid
    end
  end

  it "can't be added for a former employee" do
    revision.employee = create(:employee, :terminated)

    expect(revision.tap(&:valid?).errors[:base]).to eq([ "Former employees' salaries can't be changed" ])
  end

  describe "effective date" do
    it "accepts today" do
      revision.effective_from = Date.new(2026, 10, 28)

      expect(revision).to be_valid
    end

    it "rejects a date in the future" do
      revision.effective_from = Date.new(2026, 10, 29)

      expect(revision).not_to be_valid
    end

    it "rejects a date before the employee was hired" do
      revision.employee.hire_date = Date.new(2024, 1, 15)
      revision.effective_from = Date.new(2024, 1, 14)

      expect(revision).not_to be_valid
    end

    # Keeps history in order, so the latest revision is always the current salary (ADR 0004).
    it "rejects a date before the employee's latest revision" do
      employee = create(:employee, hire_date: Date.new(2024, 1, 15))
      create(:salary_revision, employee:, effective_from: Date.new(2026, 10, 28))
      later = build(:salary_revision, employee:, effective_from: Date.new(2026, 10, 27), reason: "correction")

      expect(later.tap(&:valid?).errors[:effective_from]).to eq([ "can't be before the latest salary change (28 Oct 2026)" ])
    end
  end

  describe "append-only history" do
    let!(:saved) { create(:salary_revision) }

    it "cannot be edited once saved" do
      expect { saved.update(amount: "1300000.00") }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end

    it "cannot be deleted once saved" do
      expect { saved.destroy }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end

    it "keeps the employee from being deleted while history exists" do
      expect { saved.employee.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end
  end

  # These rules protect data written without the model, such as the seed script's bulk inserts.
  describe "database constraints" do
    let(:employee) { create(:employee) }
    let(:valid_row) do
      { employee_id: employee.id, amount: "1200000.00", currency: employee.current_currency,
        effective_from: employee.hire_date, reason: "hire" }
    end

    def insert_revision(overrides = {})
      described_class.insert_all!([ valid_row.merge(overrides) ])
    end

    # Raw SQL for values the model would fix or refuse before they reach the database.
    def insert_raw(currency:, reason:)
      sql = described_class.sanitize_sql_array([ <<~SQL, employee.id, currency, reason ])
        INSERT INTO salary_revisions (employee_id, amount, currency, effective_from, reason, created_at, updated_at)
        VALUES (?, 1200000, ?, '2024-01-15', ?, NOW(), NOW())
      SQL
      described_class.with_connection { |connection| connection.execute(sql) }
    end

    it "rejects an employee that does not exist" do
      expect { insert_revision(employee_id: 0) }.to raise_error(ActiveRecord::InvalidForeignKey)
    end

    it "rejects an amount that is not positive" do
      expect { insert_revision(amount: "0") }
        .to raise_error(ActiveRecord::StatementInvalid, /salary_revisions_amount_positive/)
    end

    it "rejects a lowercase currency" do
      expect { insert_raw(currency: "inr", reason: "hire") }
        .to raise_error(ActiveRecord::StatementInvalid, /salary_revisions_currency_format/)
    end

    it "rejects an unknown reason" do
      expect { insert_raw(currency: "INR", reason: "bonus") }
        .to raise_error(ActiveRecord::StatementInvalid, /salary_revisions_reason_valid/)
    end
  end

  # Salary changes show in the employee's change history (ADR 0012).
  it "records each new revision against its employee" do
    saved = create(:salary_revision)

    expect(saved.audits.sole).to have_attributes(action: "create", associated: saved.employee)
  end
end
