require "rails_helper"

RSpec.describe "GET /api/v1/health", type: :request do
  context "when the database is reachable" do
    it "reports the app and the database as ok", :aggregate_failures do
      get "/api/v1/health"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq("status" => "ok", "database" => "ok")
    end
  end

  context "when the database is unreachable" do
    before do
      allow(ActiveRecord::Base).to receive(:with_connection)
        .and_raise(ActiveRecord::ConnectionNotEstablished)
    end

    it "reports the database error with a 503", :aggregate_failures do
      get "/api/v1/health"

      expect(response).to have_http_status(:service_unavailable)
      expect(response.parsed_body).to eq("status" => "error", "database" => "error")
    end
  end
end
