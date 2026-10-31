require "rails_helper"

# An employee's audit log (ADR 0012, 0021): every saved change to them or their salary revisions,
# column by column, with who, when and why. Newest first.
RSpec.describe "GET /api/v1/employees/:id/audits", type: :request do
  let(:user) { create(:user, name: "Asha Rao") }
  let(:india) { create(:country, code: "IN", name: "India", currency_code: "INR") }
  let(:engineering) { create(:department, name: "Engineering") }
  let(:engineer) { create(:job_title, name: "Software Engineer") }

  before do
    sign_in(user)
    travel_to Time.utc(2026, 10, 30, 12, 0)
  end

  # Adds someone through the API, as HR would, and returns their id.
  def add_employee
    post "/api/v1/employees", params: { full_name: "Ravi Kumar", email: "ravi@acme.test", hire_date: "2026-10-01",
                                        country_id: india.id, department_id: engineering.id,
                                        job_title_id: engineer.id, current_salary: "1200000" }, as: :json
    response.parsed_body.fetch("id")
  end

  def change_salary(id, **params)
    post "/api/v1/employees/#{id}/salary_revisions", params: { lock_version: Employee.find(id).lock_version, **params },
                                                       as: :json
  end

  def edit(id, **params)
    patch "/api/v1/employees/#{id}", params: { lock_version: Employee.find(id).lock_version, **params }, as: :json
  end

  def audit_log(id)
    get "/api/v1/employees/#{id}/audits"
    response.parsed_body
  end

  it "lists every save of the employee and their salary revisions, newest first, with who" do
    id = add_employee
    edit(id, department_id: create(:department, name: "Sales").id)

    expect(audit_log(id).map { |row| row.values_at("model", "action", "changed_by") }).to eq([
      [ "employee", "update", "Asha Rao" ], [ "salary_revision", "create", "Asha Rao" ],
      [ "employee", "create", "Asha Rao" ]
    ])
  end

  it "shows every column that was set, with names instead of ids" do
    id = add_employee

    expect(audit_log(id).last).to include(
      "currency" => "INR",
      "changes" => include({ "field" => "department", "from" => nil, "to" => "Engineering" },
                           { "field" => "status", "from" => nil, "to" => "active" },
                           { "field" => "current_salary", "from" => nil, "to" => "1200000.0" },
                           { "field" => "current_currency", "from" => nil, "to" => "INR" })
    )
  end

  it "shows the old and new value of each changed column" do
    id = add_employee
    edit(id, email: "ravi.k@acme.test")

    expect(audit_log(id).first["changes"]).to eq([
      { "field" => "email", "from" => "ravi@acme.test", "to" => "ravi.k@acme.test" }
    ])
  end

  it "gives a salary change's reason, next to the salary copy it changed", :aggregate_failures do
    id = add_employee
    change_salary(id, amount: "1300000", reason: "annual_raise")
    employee_row, revision_row = audit_log(id).first(2)

    expect(revision_row).to include("model" => "salary_revision", "reason" => "annual_raise",
                                    "changes" => include({ "field" => "amount", "from" => nil, "to" => "1300000.0" }))
    expect(employee_row["changes"]).to eq([ { "field" => "current_salary", "from" => "1200000.0", "to" => "1300000.0" } ])
  end

  it "shows the end of employment as a status change" do
    id = add_employee
    post "/api/v1/employees/#{id}/termination", params: { terminated_on: "2026-10-30", lock_version: 0 }, as: :json

    expect(audit_log(id).first["changes"]).to eq([
      { "field" => "status", "from" => "active", "to" => "terminated" },
      { "field" => "terminated_on", "from" => nil, "to" => "2026-10-30" }
    ])
  end

  it "records nothing for a change that was refused" do
    id = add_employee
    patch "/api/v1/employees/#{id}", params: { full_name: "Ravi K. Kumar", lock_version: 5 }, as: :json

    expect(audit_log(id).size).to eq(2)
  end

  it "has no name for a change made outside the app" do
    employee = create(:employee)

    expect(audit_log(employee.id)).to match([ include("model" => "employee", "action" => "create", "changed_by" => nil) ])
  end

  it "is empty for an employee loaded in bulk, like the seed" do
    employee = create(:employee)
    Audited::Audit.delete_all

    expect(audit_log(employee.id)).to eq([])
  end

  it "answers 404 for an unknown employee" do
    get "/api/v1/employees/0/audits"

    expect(response).to have_http_status(:not_found)
  end
end
