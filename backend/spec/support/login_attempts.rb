# Login attempts are counted across requests (SessionsController::LOGIN_ATTEMPTS). Each example
# starts with none, so the specs that sign in many times never hit the limit.
RSpec.configure do |config|
  config.before { Api::V1::SessionsController::LOGIN_ATTEMPTS.clear }
end
