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

    it "rejects a currency that is not the country's currency" do
      employee.country = build(:country, currency_code: "INR")
      employee.current_currency = "USD"

      expect(employee).not_to be_valid
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
end
