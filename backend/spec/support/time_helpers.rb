# `travel_to` / `freeze_time` keep date-based rules (like "salary changes take effect today") deterministic.
RSpec.configure do |config|
  config.include ActiveSupport::Testing::TimeHelpers
end
