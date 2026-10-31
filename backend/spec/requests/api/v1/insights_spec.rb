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

    # The page's filters apply to the headline numbers too (ADR 0019).
    it "follows the filters, in one country's own currency" do
      create(:exchange_rate, currency_code: "USD", rate_to_usd: "1.0", as_of: Date.new(2026, 10, 1))
      create(:employee, country: create(:country, code: "US", name: "United States", currency_code: "USD"),
                        job_title: engineer, current_salary: "120000")

      get "/api/v1/insights/overview", params: { country: "us" }

      expect(response.parsed_body).to include(
        "currency" => "USD", "converted" => false, "headcount" => 1, "countries" => 1, "payroll" => "120000.0",
        "median" => "120000.0", "outlier_count" => 0, "filters" => hash_including("country" => hash_including("code" => "US"))
      )
    end
  end

  describe "GET /api/v1/insights/segments" do
    it "passes the segment and country through to the query" do
      get "/api/v1/insights/segments", params: { by: "job_title", country: "in" }

      expect(response.parsed_body).to include("by" => "job_title", "currency" => "INR", "converted" => false,
                                              "rows" => [ hash_including("label" => "Software Engineer", "headcount" => 6) ])
    end

    # Everyone here was hired in 2024, so a filter for the newest band must leave no one.
    it "passes the job title and tenure filters through too" do
      get "/api/v1/insights/segments", params: { by: "country", job_title_id: engineer.id, tenure: "under_1" }

      expect(response.parsed_body["rows"]).to eq([])
    end

    it "answers 404 for an unknown department" do
      get "/api/v1/insights/segments", params: { department_id: 0 }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/v1/insights/pay_changes" do
    it "summarises the last 12 months of salary changes, in INR" do
      get "/api/v1/insights/pay_changes"

      expect(response.parsed_body).to include("currency" => "INR", "rows" => [],
                                              "total" => { "count" => 0, "average_percent" => nil, "yearly_cost" => nil })
    end
  end

  # Every part of the page answers a filter that doesn't exist the same way, so the UI can offer
  # "Clear filters".
  describe "an unknown filter value" do
    it "is a 404 everywhere", :aggregate_failures do
      %w[overview segments pay_changes outliers].each do |endpoint|
        get "/api/v1/insights/#{endpoint}", params: { country: "xx" }
        expect(response).to have_http_status(:not_found), "#{endpoint} with an unknown country"

        get "/api/v1/insights/#{endpoint}", params: { department_id: 0 }
        expect(response).to have_http_status(:not_found), "#{endpoint} with an unknown department"
      end
    end
  end

  describe "the page's filters" do
    it "pass through to the pay changes" do
      get "/api/v1/insights/pay_changes", params: { country: "in", tenure: "1_3" }

      expect(response.parsed_body).to include(
        "currency" => "INR", "converted" => false,
        "filters" => hash_including("country" => hash_including("code" => "IN"), "tenure" => hash_including("key" => "1_3"))
      )
    end

    it "pass through to the outliers, which still compare people with their whole role", :aggregate_failures do
      underpaid = Employee.find_by!(full_name: "Underpaid")

      get "/api/v1/insights/outliers", params: { department_id: underpaid.department_id }
      expect(response.parsed_body["data"]).to match([ hash_including("peer_count" => 6, "deviation_percent" => -50.0) ])

      get "/api/v1/insights/outliers", params: { department_id: create(:department).id }
      expect(response.parsed_body["data"]).to eq([])
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
