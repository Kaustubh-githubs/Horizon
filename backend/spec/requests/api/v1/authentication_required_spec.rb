require "rails_helper"

# Every API route needs a signed-in user except signing in and the health check (ADR 0009).
# Built from the routes themselves, so a new endpoint is covered the day it's added.
RSpec.describe "Authentication required", type: :request do
  public_routes = [ "POST /api/v1/session", "GET /api/v1/health" ]

  # [verb, path] for every API route, with a placeholder id in each path parameter.
  def self.api_routes
    Rails.application.routes.routes.filter_map do |route|
      path = route.path.spec.to_s.delete_suffix("(.:format)")
      next unless path.start_with?("/api/v1/")

      [ route.verb, path.gsub(/:\w+/, "1") ]
    end.uniq
  end

  it "covers the API" do
    expect(self.class.api_routes.size).to be > 20
  end

  api_routes.each do |verb, path|
    next if public_routes.include?("#{verb} #{path}")

    it "#{verb} #{path} answers 401 when nobody is signed in" do
      public_send(verb.downcase, path, as: :json)

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
