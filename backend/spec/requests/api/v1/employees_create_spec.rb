require "rails_helper"

RSpec.describe "POST /api/v1/employees", type: :request do
  let(:india) { create(:country, code: "IN", currency_code: "INR") }
  let(:valid_params) do
    { full_name: "Asha Rao", email: "asha@acme.test", hire_date: "2026-03-01", country_id: india.id,
      department_id: create(:department).id, job_title_id: create(:job_title).id, current_salary: "1800000" }
  end

  before { sign_in }

  it "creates the employee and returns it", :aggregate_failures do
    post "/api/v1/employees", params: valid_params, as: :json

    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to include("full_name" => "Asha Rao", "current_salary" => "1800000.0",
                                            "current_currency" => "INR", "status" => "active")
  end

  it "answers 422 with each error under its form field", :aggregate_failures do
    post "/api/v1/employees", params: valid_params.merge(full_name: "", department_id: 0), as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body["errors"]).to include("full_name" => [ "can't be blank" ],
                                                      "department_id" => [ "must exist" ])
  end

  it "rejects a hire date in the future" do
    post "/api/v1/employees", params: valid_params.merge(hire_date: Date.current.tomorrow.iso8601), as: :json

    expect(response.parsed_body["errors"]).to include("hire_date" => [ "can't be in the future" ])
  end
end
