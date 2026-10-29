# Logs in through the real endpoint, so request specs carry the session cookie like a browser.
# Fails loudly if the login is rejected, so a spec never runs logged out by mistake.
module SignInHelper
  def sign_in(user = nil, password: "correct-horse-battery")
    user ||= create(:user, password:)
    post "/api/v1/session", params: { email_address: user.email_address, password: }, as: :json
    expect(response).to have_http_status(:created), "sign_in failed for #{user.email_address}: #{response.body}"
    user
  end
end

RSpec.configure do |config|
  config.include SignInHelper, type: :request
end
