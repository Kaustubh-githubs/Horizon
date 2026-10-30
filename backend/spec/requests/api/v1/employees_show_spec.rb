require "rails_helper"

RSpec.describe "GET /api/v1/employees/:id", type: :request do
  before { sign_in }

  it "returns the employee" do
    employee = create(:employee, full_name: "Asha Rao")

    get "/api/v1/employees/#{employee.id}"

    expect(response.parsed_body).to include("id" => employee.id, "full_name" => "Asha Rao",
                                            "country" => hash_including("id" => employee.country_id))
  end

  it "answers 404 in the usual error shape for an unknown id", :aggregate_failures do
    get "/api/v1/employees/0"

    expect(response).to have_http_status(:not_found)
    expect(response.parsed_body).to eq("errors" => { "base" => [ "Employee not found" ] })
  end
end
