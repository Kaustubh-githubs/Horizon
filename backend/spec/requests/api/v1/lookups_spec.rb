require "rails_helper"

RSpec.describe "GET /api/v1/lookups", type: :request do
  it "requires login" do
    get "/api/v1/lookups"

    expect(response).to have_http_status(:unauthorized)
  end

  context "when logged in" do
    before do
      sign_in
      # Created out of order, so the spec proves the response is sorted.
      create(:country, code: "US", name: "United States", currency_code: "USD")
      create(:country, code: "IN", name: "India", currency_code: "INR")
      create(:department, name: "Sales")
      create(:department, name: "Engineering")
      create(:job_title, name: "Software Engineer")
      create(:job_title, name: "Account Executive")
    end

    it "returns countries, departments and job titles sorted by name", :aggregate_failures do
      get "/api/v1/lookups"

      expect(response.parsed_body["countries"]).to match([
        { "id" => Integer, "code" => "IN", "name" => "India", "currency_code" => "INR" },
        { "id" => Integer, "code" => "US", "name" => "United States", "currency_code" => "USD" }
      ])
      expect(response.parsed_body["departments"].pluck("name")).to eq(%w[Engineering Sales])
      expect(response.parsed_body["job_titles"].pluck("name")).to eq([ "Account Executive", "Software Engineer" ])
    end
  end
end
