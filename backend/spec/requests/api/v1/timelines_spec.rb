require "rails_helper"

# The employee timeline (ADR 0021). The query spec covers the events; this covers the endpoint.
RSpec.describe "GET /api/v1/employees/:id/timeline", type: :request do
  let(:user) { create(:user, name: "Asha Rao") }

  before do
    sign_in(user)
    travel_to Time.utc(2026, 10, 31, 12, 0)
  end

  it "returns the employee's events newest first, with their currency" do
    employee = create(:employee, hire_date: Date.new(2025, 10, 1),
                                 country: create(:country, code: "IN", currency_code: "INR"))
    create(:salary_revision, employee:, amount: "1000000", effective_from: Date.new(2025, 10, 1), reason: "hire")

    get "/api/v1/employees/#{employee.id}/timeline"

    expect(response.parsed_body).to include(
      "currency" => "INR",
      "events" => [ include("kind" => "anniversary", "date" => "2026-10-01", "years" => 1),
                    include("kind" => "joined", "date" => "2025-10-01") ]
    )
  end

  it "names who recorded a salary change" do
    employee = create(:employee, hire_date: Date.new(2025, 10, 1), current_salary: "1000000")
    post "/api/v1/employees/#{employee.id}/salary_revisions",
         params: { amount: "1100000", reason: "annual_raise", lock_version: employee.lock_version }, as: :json

    get "/api/v1/employees/#{employee.id}/timeline"

    expect(response.parsed_body["events"]).to include(include("kind" => "salary_change", "changed_by" => "Asha Rao"))
  end

  it "answers 404 for an unknown employee" do
    get "/api/v1/employees/0/timeline"

    expect(response).to have_http_status(:not_found)
  end
end
