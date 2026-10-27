require "rails_helper"

RSpec.describe "/api/v1/session", type: :request do
  before do
    create(:user, name: "Asha Rao", email_address: "asha@acme.test", password: "correct-horse-battery",
                  persona: create(:persona, :hr_manager))
  end

  def log_in(password: "correct-horse-battery")
    post "/api/v1/session", params: { email_address: "Asha@ACME.test", password: }, as: :json
  end

  describe "POST (log in)" do
    it "returns the user and their persona", :aggregate_failures do
      log_in

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["user"]).to include(
        "name" => "Asha Rao", "email_address" => "asha@acme.test",
        "persona" => { "key" => "hr_manager", "name" => "HR Manager" }
      )
    end

    it "sets an HTTP-only, SameSite=Lax session cookie" do
      log_in

      expect(response.headers["Set-Cookie"]).to match(/session_id=.+; .*httponly.*samesite=lax/i)
    end

    it "rejects a wrong password without saying which part was wrong", :aggregate_failures do
      log_in(password: "not-the-password")

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Wrong email address or password" ] })
    end
  end

  describe "GET (who is logged in)" do
    it "returns the logged-in user" do
      log_in
      get "/api/v1/session"

      expect(response.parsed_body.dig("user", "email_address")).to eq("asha@acme.test")
    end

    it "returns a JSON 401 when nobody is logged in", :aggregate_failures do
      get "/api/v1/session"

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "You need to sign in first" ] })
    end
  end

  describe "DELETE (log out)" do
    it "ends the session, so the cookie no longer works", :aggregate_failures do
      log_in
      delete "/api/v1/session"
      get "/api/v1/session"

      expect(Session.count).to eq(0)
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
