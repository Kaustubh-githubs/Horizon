require "rails_helper"

RSpec.describe "Insights API", type: :request do
  let(:india) { create(:country, code: "IN", name: "India", currency_code: "INR") }
  let(:engineer) { create(:job_title, name: "Software Engineer") }

  before do
    sign_in
    create(:exchange_rate, currency_code: "INR", rate_to_usd: "0.012", as_of: Date.new(2026, 10, 1))
    create(:employee, full_name: "Underpaid", country: india, job_title: engineer, current_salary: "500000")
    create_list(:employee, 5, country: india, job_title: engineer, current_salary: "1000000")
  end

  it "requires login" do
    delete "/api/v1/session"
    get "/api/v1/insights/overview"

    expect(response).to have_http_status(:unauthorized)
  end

  describe "GET /api/v1/insights/overview" do
    it "summarises the org in INR, with the rates' date and the number of stars" do
      get "/api/v1/insights/overview"

      expect(response.parsed_body).to include(
        "currency" => "INR", "rates_as_of" => "2026-10-01", "headcount" => 6, "payroll" => "5500000.0",
        "median" => "1000000.0", "outlier_count" => 1, "excluded_currencies" => []
      )
    end
  end

  describe "GET /api/v1/insights/segments" do
    it "passes the segment and country through to the query" do
      get "/api/v1/insights/segments", params: { by: "job_title", country: "in" }

      expect(response.parsed_body).to include("by" => "job_title", "currency" => "INR", "converted" => false,
                                              "rows" => [ hash_including("label" => "Software Engineer", "headcount" => 6) ])
    end
  end

  # Both lists answer an unknown country the same way, so the UI can offer "Show all countries".
  describe "an unknown country" do
    it "is a 404 for the segment figures and for the outliers", :aggregate_failures do
      get "/api/v1/insights/segments", params: { country: "xx" }
      expect(response).to have_http_status(:not_found)

      get "/api/v1/insights/outliers", params: { country: "xx" }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/v1/insights/outliers" do
    it "lists flagged employees with paging, linking each to their profile", :aggregate_failures do
      get "/api/v1/insights/outliers", params: { direction: "below", threshold: 40 }

      expect(response.parsed_body["data"]).to match([
        hash_including("employee" => hash_including("full_name" => "Underpaid"), "deviation_percent" => -50.0,
                       "peer_median" => "1000000.0", "peer_count" => 6, "currency" => "INR")
      ])
      expect(response.parsed_body["meta"]).to include("total_count" => 1, "threshold" => 40)
    end
  end

  describe "GET /api/v1/employees/:id/pay_position" do
    it "tells the profile whether the employee gets a star" do
      get "/api/v1/employees/#{Employee.find_by!(full_name: 'Underpaid').id}/pay_position"

      expect(response.parsed_body).to include("flagged" => true, "direction" => "below", "deviation_percent" => -50.0,
                                              "job_title" => "Software Engineer", "country" => "India")
    end

    it "answers 404 for an unknown employee" do
      get "/api/v1/employees/0/pay_position"

      expect(response).to have_http_status(:not_found)
    end
  end
end
