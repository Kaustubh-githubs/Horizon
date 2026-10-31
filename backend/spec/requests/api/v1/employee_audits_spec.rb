require "rails_helper"

# An employee's change history (ADR 0012): one entry per thing HR did, with who and when.
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

  def history(id)
    get "/api/v1/employees/#{id}/audits"
    response.parsed_body
  end

  it "starts with the employee being added, with their first salary, as one entry" do
    id = add_employee

    expect(history(id)).to match([
      include("kind" => "added", "changed_by" => "Asha Rao", "currency" => "INR",
              "changes" => include({ "field" => "department", "from" => nil, "to" => "Engineering" },
                                   { "field" => "job_title", "from" => nil, "to" => "Software Engineer" },
                                   { "field" => "salary", "from" => nil, "to" => "1200000.0" }))
    ])
  end

  it "records an edit, with names instead of ids" do
    id = add_employee
    edit(id, email: "ravi.k@acme.test", department_id: create(:department, name: "Sales").id)

    expect(history(id).first).to include(
      "kind" => "edited", "changed_by" => "Asha Rao",
      "changes" => [ { "field" => "email", "from" => "ravi@acme.test", "to" => "ravi.k@acme.test" },
                     { "field" => "department", "from" => "Engineering", "to" => "Sales" } ]
    )
  end

  it "records a salary change once, from the old salary to the new, with its reason" do
    id = add_employee
    change_salary(id, amount: "1300000", reason: "annual_raise")

    expect(history(id).first).to include(
      "kind" => "salary_change", "reason" => "annual_raise",
      "changes" => [ { "field" => "salary", "from" => "1200000.0", "to" => "1300000.0" } ]
    )
  end

  it "records a promotion as one entry, with the new job title and salary" do
    id = add_employee
    change_salary(id, amount: "1500000", reason: "promotion",
                      job_title_id: create(:job_title, name: "Senior Software Engineer").id)

    expect(history(id).first).to include(
      "kind" => "salary_change", "reason" => "promotion",
      "changes" => [ { "field" => "job_title", "from" => "Software Engineer", "to" => "Senior Software Engineer" },
                     { "field" => "salary", "from" => "1200000.0", "to" => "1500000.0" } ]
    )
  end

  it "records the end of employment" do
    id = add_employee
    post "/api/v1/employees/#{id}/termination", params: { terminated_on: "2026-10-30", lock_version: 0 }, as: :json

    expect(history(id).first).to include(
      "kind" => "ended", "changes" => [ { "field" => "terminated_on", "from" => nil, "to" => "2026-10-30" } ]
    )
  end

  it "lists entries newest first" do
    id = add_employee
    change_salary(id, amount: "1300000", reason: "annual_raise")
    edit(id, full_name: "Ravi K. Kumar")

    expect(history(id).pluck("kind")).to eq(%w[edited salary_change added])
  end

  it "records nothing for a change that was refused" do
    id = add_employee
    patch "/api/v1/employees/#{id}", params: { full_name: "Ravi K. Kumar", lock_version: 5 }, as: :json

    expect(history(id).pluck("kind")).to eq(%w[added])
  end

  it "has no name for a change made outside the app" do
    employee = create(:employee)

    expect(history(employee.id)).to match([ include("kind" => "added", "changed_by" => nil) ])
  end

  it "is empty for an employee loaded in bulk, like the seed" do
    employee = create(:employee)
    Audited::Audit.delete_all

    expect(history(employee.id)).to eq([])
  end

  it "answers 404 for an unknown employee" do
    get "/api/v1/employees/0/audits"

    expect(response).to have_http_status(:not_found)
  end
end
