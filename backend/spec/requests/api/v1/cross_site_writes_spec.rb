require "rails_helper"

# Writes must come from the app's own pages: a form or script on another site is refused, on
# top of the SameSite=Lax cookie (ADR 0009).
RSpec.describe "Cross-site writes", type: :request do
  let(:employee) { create(:employee) }
  let(:own_origin) { "http://www.example.com" } # the test request's host

  before { sign_in }

  def rename(origin:)
    patch "/api/v1/employees/#{employee.id}",
          params: { full_name: "Renamed", lock_version: employee.lock_version },
          headers: origin ? { "Origin" => origin } : {}, as: :json
  end

  it "refuses a write sent from another site", :aggregate_failures do
    rename(origin: "https://attacker.example")

    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body).to eq("errors" => { "base" => [ "This request came from another site" ] })
    expect(employee.reload.full_name).not_to eq("Renamed")
  end

  it "allows a write from the app's own origin" do
    rename(origin: own_origin)

    expect(response).to have_http_status(:ok)
  end

  # Requests without an Origin (curl, server to server) can't carry a victim's cookie from
  # another site, so there's nothing to forge.
  it "allows a write without an Origin header" do
    rename(origin: nil)

    expect(response).to have_http_status(:ok)
  end

  it "doesn't check reads, which change nothing" do
    get "/api/v1/employees", headers: { "Origin" => "https://attacker.example" }

    expect(response).to have_http_status(:ok)
  end

  # Login CSRF: another site mustn't sign the browser in as someone else.
  it "refuses a sign-in sent from another site" do
    user = create(:user, password: "correct-horse-battery")
    post "/api/v1/session", params: { email_address: user.email_address, password: "correct-horse-battery" },
                            headers: { "Origin" => "https://attacker.example" }, as: :json

    expect(response).to have_http_status(:forbidden)
  end
end
