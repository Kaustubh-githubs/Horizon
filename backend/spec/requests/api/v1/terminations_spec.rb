require "rails_helper"

RSpec.describe "POST /api/v1/employees/:id/termination", type: :request do
  let(:employee) { create(:employee, hire_date: Date.new(2024, 1, 15)) }

  before { sign_in }

  def terminate(params)
    post "/api/v1/employees/#{employee.id}/termination", params:, as: :json
  end

  it "terminates the employee and returns them", :aggregate_failures do
    terminate(terminated_on: "2026-06-30", lock_version: 0)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include("status" => "terminated", "terminated_on" => "2026-06-30")
  end

  it "rejects a date in the future" do
    terminate(terminated_on: Date.current.tomorrow.iso8601, lock_version: 0)

    expect(response.parsed_body["errors"]).to include("terminated_on" => [ "can't be in the future" ])
  end

  it "answers 409 when the employee changed since the page was loaded" do
    employee.update!(full_name: "Asha Rao-Mehta")

    terminate(terminated_on: "2026-06-30", lock_version: 0)

    expect(response).to have_http_status(:conflict)
  end

  it "answers 400 without a lock_version, so the conflict check can't be skipped", :aggregate_failures do
    terminate(terminated_on: "2026-06-30")

    expect(response).to have_http_status(:bad_request)
    expect(employee.reload).to be_active
  end

  it "answers 404 for an unknown employee" do
    post "/api/v1/employees/0/termination", params: { terminated_on: "2026-06-30", lock_version: 0 }, as: :json

    expect(response).to have_http_status(:not_found)
  end

  # "Today" is the UTC date for every user (ADR 0017). At 20:00 UTC on 30 Oct it's already
  # 31 Oct in India, but the server's today is still the 30th.
  describe "what counts as today" do
    before { travel_to Time.utc(2026, 10, 30, 20, 0) }

    it "accepts the UTC date" do
      terminate(terminated_on: "2026-10-30", lock_version: 0)

      expect(response).to have_http_status(:ok)
    end

    it "treats the next UTC date as the future, whatever the user's own time zone" do
      terminate(terminated_on: "2026-10-31", lock_version: 0)

      expect(response.parsed_body["errors"]).to include("terminated_on" => [ "can't be in the future" ])
    end
  end

  it "answers 422 when the employee is already terminated" do
    employee.terminate!(on: Date.new(2026, 6, 30))

    terminate(terminated_on: "2026-07-01", lock_version: employee.lock_version)

    expect(response).to have_http_status(:unprocessable_content)
  end
end
