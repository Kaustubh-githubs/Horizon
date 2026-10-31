require "rails_helper"

RSpec.describe Employee, type: :model do
  subject(:employee) { build(:employee) }

  it "is valid when built from the factory" do
    expect(employee).to be_valid
  end

  describe "associations and required fields" do
    it { is_expected.to belong_to(:country) }
    it { is_expected.to belong_to(:department) }
    it { is_expected.to belong_to(:job_title) }
    it { is_expected.to have_many(:salary_revisions).dependent(:restrict_with_exception) }
    it { is_expected.to validate_presence_of(:full_name) }
    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_presence_of(:hire_date) }
    it { is_expected.to validate_presence_of(:current_salary) }
  end

  describe "employee code" do
    it "is built by the database from the id, padded to six digits" do
      saved = create(:employee)

      expect(saved.employee_code).to eq(format("EMP-%06d", saved.id))
    end

    it "cannot be changed once assigned" do
      saved = create(:employee)

      expect { saved.employee_code = "EMP-999999" }.to raise_error(ActiveRecord::ReadonlyAttributeError)
    end
  end

  describe "email" do
    it "rejects an address without an @" do
      employee.email = "asha.acme.test"

      expect(employee).not_to be_valid
    end

    it "rejects an address another employee already has, whatever its case" do
      create(:employee, email: "asha@acme.test")
      employee.email = "ASHA@acme.test"

      expect(employee).not_to be_valid
    end
  end

  describe "normalization" do
    it "trims and lowercases the email" do
      expect(described_class.new(email: " Asha@ACME.test ").email).to eq("asha@acme.test")
    end

    it "squishes extra whitespace in the full name" do
      expect(described_class.new(full_name: "  Asha   Rao ").full_name).to eq("Asha Rao")
    end

    it "trims and uppercases the currency" do
      expect(described_class.new(current_currency: " inr ").current_currency).to eq("INR")
    end
  end

  describe "status and termination" do
    it "starts as active" do
      expect(described_class.new).to be_active
    end

    it "is valid when terminated with a date" do
      expect(build(:employee, :terminated)).to be_valid
    end

    it "requires a termination date when terminated" do
      employee.status = "terminated"

      expect(employee).not_to be_valid
    end

    it "rejects a termination date on an active employee" do
      employee.terminated_on = Date.new(2026, 6, 30)

      expect(employee).not_to be_valid
    end

    it "rejects a termination date before the hire date" do
      employee.assign_attributes(status: "terminated", hire_date: Date.new(2024, 1, 15), terminated_on: Date.new(2023, 12, 31))

      expect(employee).not_to be_valid
    end

    it "rejects an unknown status" do
      employee.status = "fired"

      expect(employee).not_to be_valid
    end
  end

  describe "salary" do
    it "rejects a salary of zero" do
      employee.current_salary = 0

      expect(employee).not_to be_valid
    end

    it "rejects a salary too large for the money column, instead of overflowing on save" do
      employee.current_salary = 10**13

      expect(employee.tap(&:valid?).errors[:current_salary]).to eq([ "is too large" ])
    end

    # The column keeps two decimals, so a third would be rounded away without anyone noticing (ADR 0006).
    it "rejects more than two decimal places instead of rounding them" do
      employee.current_salary = "1200000.999"

      expect(employee.tap(&:valid?).errors[:current_salary]).to eq([ "can have at most 2 decimal places" ])
    end

    it "accepts two decimal places, and zeros after them" do
      employee.current_salary = "1200000.500"

      expect(employee).to be_valid
    end

    it "rejects a currency that is not the country's currency" do
      employee.country = build(:country, currency_code: "INR")
      employee.current_currency = "USD"

      expect(employee).not_to be_valid
    end
  end

  it "rejects a hire date in the future" do
    employee.hire_date = Date.current.tomorrow

    expect(employee).not_to be_valid
  end

  # A date that doesn't exist casts to nothing, which used to read as "can't be blank".
  describe "dates that don't exist" do
    it "says a hire date like 30 February isn't a valid date" do
      employee.hire_date = "2026-02-30"

      expect(employee.tap(&:valid?).errors[:hire_date]).to eq([ "is not a valid date" ])
    end

    it "says the same for a last working day like month 13" do
      employee.assign_attributes(status: "terminated", terminated_on: "2026-13-45")

      expect(employee.tap(&:valid?).errors[:terminated_on]).to eq([ "is not a valid date" ])
    end
  end

  describe "lengths" do
    it "rejects a name longer than 120 characters" do
      employee.full_name = "A" * 121

      expect(employee.tap(&:valid?).errors[:full_name]).to eq([ "is too long (maximum is 120 characters)" ])
    end

    it "rejects an email longer than 254 characters" do
      employee.email = "#{'a' * 250}@acme.test"

      expect(employee.tap(&:valid?).errors[:email]).to include("is too long (maximum is 254 characters)")
    end
  end

  # Salary history starts on the hire date and is in the country's currency (ADR 0017).
  describe "fields fixed after creation" do
    let(:saved) { create(:employee) }

    it "doesn't allow the country to change" do
      expect { saved.country = create(:country) }.to raise_error(ActiveRecord::ReadonlyAttributeError)
    end

    it "doesn't allow the hire date to change" do
      expect { saved.hire_date = saved.hire_date.yesterday }.to raise_error(ActiveRecord::ReadonlyAttributeError)
    end
  end

  describe "#terminate!" do
    let(:saved) { create(:employee, hire_date: Date.new(2024, 1, 15)) }

    it "marks the employee terminated on the given date" do
      saved.terminate!(on: Date.new(2026, 6, 30))

      expect(saved.reload).to have_attributes(status: "terminated", terminated_on: Date.new(2026, 6, 30))
    end

    it "rejects a date in the future" do
      expect { saved.terminate!(on: Date.current.tomorrow) }
        .to raise_error(ActiveRecord::RecordInvalid, /can't be in the future/)
    end

    it "rejects a date before the latest salary change" do
      create(:salary_revision, employee: saved, effective_from: Date.new(2026, 7, 1), reason: "annual_raise")

      expect { saved.terminate!(on: Date.new(2026, 6, 30)) }
        .to raise_error(ActiveRecord::RecordInvalid, /can't be before the latest salary change/)
    end

    it "refuses to terminate someone who is already terminated" do
      saved.terminate!(on: Date.new(2026, 6, 30))

      expect { saved.terminate!(on: Date.new(2026, 7, 1)) }
        .to raise_error(ActiveRecord::RecordInvalid, /Former employees can't be changed/)
    end
  end

  describe "terminated employees" do
    let(:saved) { create(:employee, :terminated) }

    it "can't be changed" do
      expect(saved.update(full_name: "Asha R.")).to be(false)
    end

    it "still count as valid when nothing is being changed" do
      expect(saved).to be_valid
    end
  end

  it "refuses to save an edit made on a stale copy" do
    saved = create(:employee)
    stale_copy = described_class.find(saved.id)
    saved.update!(full_name: "Asha Rao")

    expect { stale_copy.update!(full_name: "Asha R.") }.to raise_error(ActiveRecord::StaleObjectError)
  end

  # These rules protect data written without the model, such as the seed script's bulk inserts.
  describe "database constraints" do
    let(:country) { create(:country, currency_code: "INR") }
    let(:valid_row) do
      { full_name: "Asha Rao", email: "asha@acme.test", hire_date: Date.new(2024, 1, 15),
        country_id: country.id, department_id: create(:department).id, job_title_id: create(:job_title).id,
        current_salary: "1200000.00", current_currency: "INR" }
    end

    def insert_employee(overrides = {})
      described_class.insert_all!([ valid_row.merge(overrides) ])
    end

    it "accepts a valid row and assigns it a code" do
      insert_employee

      expect(described_class.last.employee_code).to match(/\AEMP-\d{6,}\z/)
    end

    it "keeps every digit of the code for ids above 999999" do
      insert_employee(id: 1_234_567)

      expect(described_class.find(1_234_567).employee_code).to eq("EMP-1234567")
    end

    it "rejects a duplicate email" do
      insert_employee

      expect { insert_employee }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "rejects a country that does not exist" do
      expect { insert_employee(country_id: 0) }.to raise_error(ActiveRecord::InvalidForeignKey)
    end

    it "rejects a salary that is not positive" do
      expect { insert_employee(current_salary: "0") }
        .to raise_error(ActiveRecord::StatementInvalid, /employees_current_salary_positive/)
    end

    it "rejects a terminated employee without a termination date" do
      expect { insert_employee(status: "terminated") }
        .to raise_error(ActiveRecord::StatementInvalid, /employees_termination_consistent/)
    end

    it "rejects a termination date before the hire date" do
      expect { insert_employee(status: "terminated", terminated_on: Date.new(2023, 12, 31)) }
        .to raise_error(ActiveRecord::StatementInvalid, /employees_terminated_after_hire/)
    end

    it "rejects an unknown status" do
      # Raw SQL, because the enum refuses to cast "fired" before it reaches the database.
      sql = described_class.sanitize_sql_array([ <<~SQL, *valid_row.values_at(:country_id, :department_id, :job_title_id) ])
        INSERT INTO employees (full_name, email, hire_date, status, country_id, department_id, job_title_id,
                               current_salary, current_currency, created_at, updated_at)
        VALUES ('Asha Rao', 'asha@acme.test', '2024-01-15', 'fired', ?, ?, ?, 1200000, 'INR', NOW(), NOW())
      SQL

      expect { described_class.with_connection { |c| c.execute(sql) } }
        .to raise_error(ActiveRecord::StatementInvalid, /employees_status_valid/)
    end
  end

  # Employees are on the audit trail (ADR 0012).
  it "records each change, without the generated employee code", :aggregate_failures do
    saved = create(:employee, full_name: "Asha Rao")
    saved.update!(full_name: "Asha R. Rao")

    expect(saved.audits.pluck(:action)).to eq(%w[create update])
    expect(saved.audits.first.audited_changes).not_to have_key("employee_code")
    expect(saved.audits.last.audited_changes).to eq("full_name" => [ "Asha Rao", "Asha R. Rao" ])
  end
end
