require "rails_helper"

RSpec.describe "GET /api/v1/lookups", type: :request do
  it "requires login" do
    get "/api/v1/lookups"

    expect(response).to have_http_status(:unauthorized)
  end

  it "returns countries, departments and job titles sorted by name", :aggregate_failures do
    sign_in
    create(:country, code: "US", name: "United States", currency_code: "USD")
    create(:country, code: "IN", name: "India", currency_code: "INR")
    create(:department, name: "Sales")
    create(:job_title, name: "Account Executive")

    get "/api/v1/lookups"

    expect(response.parsed_body["countries"]).to eq([
      { "code" => "IN", "name" => "India", "currency_code" => "INR" },
      { "code" => "US", "name" => "United States", "currency_code" => "USD" }
    ])
    expect(response.parsed_body["departments"].pluck("name")).to include("Sales")
    expect(response.parsed_body["job_titles"].pluck("name")).to include("Account Executive")
  end
end
