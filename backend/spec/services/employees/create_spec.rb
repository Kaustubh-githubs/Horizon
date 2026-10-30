require "rails_helper"

RSpec.describe Employees::Create do
  let(:india) { create(:country, code: "IN", currency_code: "INR") }
  let(:attributes) do
    { full_name: "Asha Rao", email: "asha@acme.test", hire_date: Date.new(2026, 3, 1), country_id: india.id,
      department_id: create(:department).id, job_title_id: create(:job_title).id, current_salary: "1800000" }
  end

  def create_employee(overrides = {})
    described_class.new(attributes.merge(overrides)).call
  end

  it "saves an active employee paid in the country's currency" do
    expect(create_employee).to be_persisted
      .and have_attributes(status: "active", current_salary: 1_800_000, current_currency: "INR")
  end

  it "ignores a currency sent by the caller, since it always follows the country" do
    expect(create_employee(current_currency: "USD").current_currency).to eq("INR")
  end

  it "records the salary as a hire revision that takes effect today, the day it's recorded" do
    revision = create_employee.salary_revisions.sole

    expect(revision).to have_attributes(amount: 1_800_000, currency: "INR", reason: "hire", effective_from: Date.current)
  end

  # Someone added after they started: we only know today's pay, so history mustn't claim
  # they were hired on it back on 1 March (ADR 0017).
  it "doesn't date the salary back to an earlier hire date" do
    expect(create_employee.salary_revisions.sole.effective_from).not_to eq(Date.new(2026, 3, 1))
  end

  it "saves nothing and raises when the employee is invalid", :aggregate_failures do
    expect { create_employee(full_name: "") }.to raise_error(ActiveRecord::RecordInvalid)
    expect(Employee.count).to eq(0)
  end

  it "keeps the employee out if the hire revision can't be saved", :aggregate_failures do
    allow(SalaryRevision).to receive(:create!).and_raise(ActiveRecord::RecordInvalid)

    expect { create_employee }.to raise_error(ActiveRecord::RecordInvalid)
    expect(Employee.count).to eq(0)
  end
end
