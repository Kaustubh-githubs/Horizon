require "rails_helper"

RSpec.describe "Salary revisions API", type: :request do
  let(:employee) { create(:employee, current_salary: "1200000") }

  before { sign_in }

  describe "POST /api/v1/employees/:id/salary_revisions" do
    def change_salary(params)
      post "/api/v1/employees/#{employee.id}/salary_revisions", params:, as: :json
    end

    it "records the change and returns it", :aggregate_failures do
      change_salary(amount: "1300000", reason: "annual_raise", lock_version: 0)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include("amount" => "1300000.0", "reason" => "annual_raise",
                                              "effective_from" => Date.current.iso8601)
    end

    it "answers 422 with the error under the amount field" do
      change_salary(amount: "1200000", reason: "annual_raise", lock_version: 0)

      expect(response.parsed_body["errors"]).to include("amount" => [ "must be different from the current salary" ])
    end

    it "answers 409 when the employee changed since the page was loaded" do
      employee.update!(full_name: "Asha Rao-Mehta")

      change_salary(amount: "1300000", reason: "annual_raise", lock_version: 0)

      expect(response).to have_http_status(:conflict)
    end

    it "answers 400 without a lock_version" do
      change_salary(amount: "1300000", reason: "annual_raise")

      expect(response).to have_http_status(:bad_request)
    end

    it "moves the employee to the new job title for a promotion", :aggregate_failures do
      new_title = create(:job_title, name: "Senior Software Engineer")

      change_salary(amount: "1500000", reason: "promotion", job_title_id: new_title.id, lock_version: 0)

      expect(response).to have_http_status(:created)
      expect(employee.reload.job_title).to eq(new_title)
    end

    it "answers 422, not 500, when job_title_id isn't a single value" do
      post "/api/v1/employees/#{employee.id}/salary_revisions?job_title_id[]=5",
           params: { amount: "1500000", reason: "promotion", lock_version: 0 }, as: :json

      expect(response.parsed_body["errors"]).to include("job_title_id" => [ "must be a new job title for a promotion" ])
    end

    it "answers 404 for an unknown employee" do
      post "/api/v1/employees/0/salary_revisions", params: { amount: "1", reason: "correction", lock_version: 0 }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end
end
