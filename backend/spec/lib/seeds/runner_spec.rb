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

    expect { run }.not_to(change { [ Country.count, JobTitle.count, Employee.count, SalaryRevision.count ] })
  end
end
