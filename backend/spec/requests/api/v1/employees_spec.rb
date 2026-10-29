require "rails_helper"

RSpec.describe "GET /api/v1/employees", type: :request do
  it "requires login" do
    get "/api/v1/employees"

    expect(response).to have_http_status(:unauthorized)
  end

  context "when logged in" do
    before { sign_in }

    it "returns each employee with names alongside ids, and the salary as a string" do
      employee = create(:employee, full_name: "Asha Rao", current_salary: "2500000.50")

      get "/api/v1/employees"

      expect(response.parsed_body["data"].first).to include(
        "id" => employee.id, "employee_code" => employee.employee_code, "full_name" => "Asha Rao",
        "status" => "active", "current_salary" => "2500000.5", "current_currency" => employee.current_currency,
        "country" => { "code" => employee.country.code, "name" => employee.country.name },
        "department" => { "id" => employee.department_id, "name" => employee.department.name },
        "lock_version" => 0
      )
    end

    it "pages the results and reports the totals", :aggregate_failures do
      create_list(:employee, 3)

      get "/api/v1/employees", params: { page: 2, per_page: 2 }

      expect(response.parsed_body["data"].size).to eq(1)
      expect(response.parsed_body["meta"]).to eq("page" => 2, "per_page" => 2, "total_count" => 3, "total_pages" => 2)
    end

    it "uses 25 per page by default and never more than 100" do
      get "/api/v1/employees", params: { per_page: 5_000 }

      expect(response.parsed_body.dig("meta", "per_page")).to eq(100)
    end

    it "falls back to 25 per page for a zero, negative or non-numeric per_page" do
      %w[0 -1 abc].each do |value|
        get "/api/v1/employees", params: { per_page: value }

        expect(response.parsed_body.dig("meta", "per_page")).to eq(25), "per_page=#{value}"
      end
    end

    it "returns an empty page, with the real totals, for a page past the end", :aggregate_failures do
      create(:employee)

      get "/api/v1/employees", params: { page: 99 }

      expect(response.parsed_body["data"]).to be_empty
      expect(response.parsed_body["meta"]).to include("page" => 99, "total_count" => 1, "total_pages" => 1)
    end

    it "passes search, filters and sorting through to the query" do
      create(:employee, full_name: "Asha Rao")
      create(:employee, full_name: "John Smith")

      get "/api/v1/employees", params: { q: "smith" }

      expect(response.parsed_body["data"].pluck("full_name")).to eq([ "John Smith" ])
    end

    # Guards against N+1 queries: country, department and title are preloaded.
    it "uses the same number of queries for 2 employees as for 10" do
      create_list(:employee, 2)
      queries_for_two = count_queries { get "/api/v1/employees" }
      create_list(:employee, 8)

      expect(count_queries { get "/api/v1/employees" }).to eq(queries_for_two)
    end
  end

  def count_queries(&)
    count = 0
    counter = ->(*, payload) { count += 1 unless payload[:name].in?(%w[SCHEMA TRANSACTION]) }
    ActiveSupport::Notifications.subscribed(counter, "sql.active_record", &)
    count
  end
end
