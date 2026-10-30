require "rails_helper"

# Writes to the database, so it seeds 50 employees, not 10,000, to keep the suite fast.
RSpec.describe Seeds::Runner do
  let(:today) { Date.new(2026, 10, 28) }

  # A method, not `subject`, because subject is memoized and the re-run test must really run twice.
  def run
    described_class.new(count: 50, seed: 42, today:, out: StringIO.new).call
  end

  before { travel_to today }

  it "seeds the reference data", :aggregate_failures do
    run

    expect(Country.count).to eq(Seeds::ReferenceData::COUNTRIES.size)
    expect(ExchangeRate.count).to eq(Seeds::ReferenceData::EXCHANGE_RATES.size)
    expect(Department.count).to eq(Seeds::ReferenceData::DEPARTMENTS.size)
    expect(JobTitle.count).to eq(Seeds::ReferenceData::JOB_TITLES.size)
  end

  it "creates an HR Manager who can log in with the demo password" do
    described_class.new(count: 0, today:, out: StringIO.new, demo_password: "a-demo-password").call

    user = User.authenticate_by(email_address: Seeds::Runner::DEMO_USER_EMAIL, password: "a-demo-password")
    expect(user.persona.key).to eq(Persona::HR_MANAGER)
  end

  it "seeds employees with their full salary history", :aggregate_failures do
    expected = Seeds::EmployeeGenerator.new(count: 50, seed: 42, today:).call

    run

    expect(Employee.count).to eq(50)
    expect(SalaryRevision.count).to eq(expected.sum { |employee| employee[:revisions].size })
  end

  it "links each employee to their own history, so the current salary matches their latest revision" do
    run

    mismatched = Employee.includes(:salary_revisions).reject do |employee|
      employee.current_salary == employee.salary_revisions.max_by { |r| [ r.effective_from, r.id ] }.amount
    end

    expect(mismatched).to be_empty
  end

  # insert_all skips model validations, so prove the rows would have passed them anyway.
  it "creates rows that also pass model validations", :aggregate_failures do
    run

    expect(Employee.includes(:country).reject(&:valid?)).to be_empty
    expect(SalaryRevision.includes(employee: :country).reject(&:valid?)).to be_empty
  end

  it "does not duplicate anything when run again" do
    run

    expect { run }.not_to(change do
      [ Country.count, JobTitle.count, Persona.count, User.count, Employee.count, SalaryRevision.count,
        DepartmentBudget.count ]
    end)
  end

  # So the Budgets page has something to show (ADR 0020).
  describe "budgets" do
    it "sets this year's budget for every department with active staff" do
      run

      with_staff = Employee.active.distinct.pluck(:department_id).sort
      expect(DepartmentBudget.where(year: today.year).pluck(:department_id).sort).to eq(with_staff)
    end

    it "makes a mix of over, near and under budget for the demo" do
      run

      expect(Budgets::OverviewQuery.new.call[:departments].pluck(:status)).to include("over", "near", "under")
    end

    it "starts each budget's history with it being set" do
      run

      expect(DepartmentBudget.all.map { |budget| budget.audits.pluck(:action) }).to all(eq([ "create" ]))
    end

    it "adds budgets to a database that already has employees" do
      run
      DepartmentBudget.delete_all

      expect { run }.to change(DepartmentBudget, :count).from(0)
    end
  end
end
