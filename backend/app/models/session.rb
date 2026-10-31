# A signed-in browser (ADR 0009). A session lasts 2 weeks without use and 30 days at most, then
# the user signs in again.
class Session < ApplicationRecord
  IDLE_TIMEOUT = 2.weeks
  MAX_AGE = 30.days
  # A session in use records that it was used at most this often, not on every request.
  ACTIVITY_INTERVAL = 1.hour

  belongs_to :user

  scope :expired, -> { where(updated_at: ...IDLE_TIMEOUT.ago).or(where(created_at: ...MAX_AGE.ago)) }

  def expired?
    updated_at < IDLE_TIMEOUT.ago || created_at < MAX_AGE.ago
  end

  # Restarts the idle timer.
  def record_activity
    touch if updated_at < ACTIVITY_INTERVAL.ago
  end
end
