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
        "country" => { "id" => employee.country_id, "code" => employee.country.code, "name" => employee.country.name },
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

    it "falls back to 25 per page for a zero, negative, non-numeric or non-scalar per_page" do
      %w[per_page=0 per_page=-1 per_page=abc per_page[]=1 per_page[a]=1].each do |query|
        get "/api/v1/employees?#{query}"

        expect(response.parsed_body.dig("meta", "per_page")).to eq(25), query
      end
    end

    it "returns an empty page, with the real totals, for a page past the end", :aggregate_failures do
      create(:employee)

      get "/api/v1/employees", params: { page: 99 }

      expect(response.parsed_body["data"]).to be_empty
      expect(response.parsed_body["meta"]).to include("page" => 99, "total_count" => 1, "total_pages" => 1)
    end

    # The query has its own specs. These check the controller passes every parameter through.
    it "passes search, country and sorting through to the query" do
      us = create(:country, code: "US")
      create(:employee, full_name: "Jane Smith", country: us)
      create(:employee, full_name: "John Smith", country: us)
      create(:employee, full_name: "Asha Smith")

      get "/api/v1/employees", params: { q: "smith", country: "us", sort: "-full_name" }

      expect(response.parsed_body["data"].pluck("full_name")).to eq([ "John Smith", "Jane Smith" ])
    end

    it "passes department, job title and status through to the query" do
      match = create(:employee, :terminated, full_name: "Ravi Kumar")
      create(:employee, :terminated, department: match.department)
      create(:employee, department: match.department, job_title: match.job_title)

      get "/api/v1/employees",
          params: { department_id: match.department_id, job_title_id: match.job_title_id, status: "terminated" }

      expect(response.parsed_body["data"].pluck("full_name")).to eq([ "Ravi Kumar" ])
    end

    # Guards against N+1 queries: country, department and title are preloaded.
    it "uses the same number of queries for 2 employees as for 10" do
      create_list(:employee, 2)
      queries_for_two = count_queries { get "/api/v1/employees" }
      create_list(:employee, 8)

      expect(count_queries { get "/api/v1/employees" }).to eq(queries_for_two)
    end
  end

  describe "GET /api/v1/employees/summary" do
    before { sign_in }

    it "summarises the same people as the list, passing its filters through", :aggregate_failures do
      india = create(:country, code: "IN", name: "India")
      create(:employee, full_name: "Ravi Nair", country: india)
      create(:employee, full_name: "John Smith")

      get "/api/v1/employees/summary", params: { q: "nair", country: "in" }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("total" => 1, "countries" => [ { "code" => "IN", "name" => "India", "count" => 1 } ])
    end
  end

  def count_queries(&)
    count = 0
    counter = ->(*, payload) { count += 1 unless payload[:name].in?(%w[SCHEMA TRANSACTION]) }
    ActiveSupport::Notifications.subscribed(counter, "sql.active_record", &)
    count
  end
end
