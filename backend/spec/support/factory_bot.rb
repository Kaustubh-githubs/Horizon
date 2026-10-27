# Lets specs call `create(:employee)` instead of `FactoryBot.create(:employee)`.
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
end
