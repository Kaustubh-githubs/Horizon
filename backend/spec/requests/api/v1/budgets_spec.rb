require "rails_helper"

RSpec.describe "Budgets API", type: :request do
  let(:engineering) { create(:department, name: "Engineering") }
  let(:user) { create(:user, name: "Asha Rao") }

  before do
    sign_in(user)
    travel_to Time.utc(2026, 10, 30, 12, 0)
  end

  describe "GET /api/v1/budgets" do
    it "returns this year's budgets and the combined figure" do
      engineering

      get "/api/v1/budgets"

      expect(response.parsed_body).to include(
        "year" => 2026, "currency" => "INR", "total" => hash_including("budget" => nil, "status" => "no_budget"),
        "departments" => [ hash_including("name" => "Engineering", "status" => "no_budget") ]
      )
    end
  end

  describe "POST /api/v1/budgets" do
    def set_budget(params)
      post "/api/v1/budgets", params: { department_id: engineering.id }.merge(params), as: :json
    end

    it "sets this year's budget in INR, whatever year is sent", :aggregate_failures do
      set_budget(amount: "3600000", year: 2027)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include("amount" => "3600000.0", "currency" => "INR", "year" => 2026,
                                              "lock_version" => 0)
    end

    it "answers 422 with each error under its field" do
      post "/api/v1/budgets", params: { department_id: 0, amount: "0" }, as: :json

      expect(response.parsed_body["errors"]).to include("amount" => [ "must be greater than 0" ],
                                                        "department_id" => [ "must exist" ])
    end

    it "answers 422 for a second budget for the same department this year" do
      create(:department_budget, department: engineering)

      set_budget(amount: "100")

      expect(response.parsed_body["errors"]).to include("year" => [ "already has a budget for this department" ])
    end
  end

  describe "PATCH /api/v1/budgets/:id" do
    let(:budget) { create(:department_budget, department: engineering, amount: "1000000") }

    def change_budget(params)
      patch "/api/v1/budgets/#{budget.id}", params:, as: :json
    end

    it "changes the amount and returns the new lock_version" do
      change_budget(amount: "1200000", lock_version: 0)

      expect(response.parsed_body).to include("amount" => "1200000.0", "lock_version" => 1)
    end

    it "only changes the amount, not the department or year" do
      change_budget(amount: "1200000", year: 2027, department_id: create(:department).id, lock_version: 0)

      expect(budget.reload).to have_attributes(year: 2026, department_id: engineering.id)
    end

    it "answers 409 when someone else changed it first" do
      budget.update!(amount: "1100000")

      change_budget(amount: "1200000", lock_version: 0)

      expect(response).to have_http_status(:conflict)
    end

    # The audit row is written inside the save's transaction, so a refused save leaves none (ADR 0012).
    it "records nothing in the history when the save is refused", :aggregate_failures do
      budget.update!(amount: "1100000")

      expect { change_budget(amount: "1200000", lock_version: 0) }.not_to change(Audited::Audit, :count)
      expect { change_budget(amount: "0", lock_version: 1) }.not_to change(Audited::Audit, :count)
    end

    it "answers 400 without a lock_version" do
      change_budget(amount: "1200000")

      expect(response).to have_http_status(:bad_request)
    end

    it "answers 404 for an unknown budget" do
      patch "/api/v1/budgets/0", params: { amount: "1", lock_version: 0 }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  # Who set and changed a budget, from the audit trail (ADR 0012, 0020).
  describe "GET /api/v1/budgets/:id/audits" do
    it "lists each change with who made it, newest first" do
      post "/api/v1/budgets", params: { department_id: engineering.id, amount: "1000000" }, as: :json
      id = response.parsed_body["id"]
      patch "/api/v1/budgets/#{id}", params: { amount: "1200000", lock_version: 0 }, as: :json

      get "/api/v1/budgets/#{id}/audits"

      expect(response.parsed_body).to match([
        include("action" => "update", "from" => "1000000.0", "to" => "1200000.0", "changed_by" => "Asha Rao"),
        include("action" => "create", "from" => nil, "to" => "1000000.0", "changed_by" => "Asha Rao")
      ])
    end

    it "has no name for a change made outside the app, like the seed" do
      budget = create(:department_budget, department: engineering)

      get "/api/v1/budgets/#{budget.id}/audits"

      expect(response.parsed_body).to match([ include("action" => "create", "changed_by" => nil) ])
    end

    it "answers 404 for an unknown budget" do
      get "/api/v1/budgets/0/audits"

      expect(response).to have_http_status(:not_found)
    end
  end
end
