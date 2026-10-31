# The JSON shape of a salary revision just recorded (ADR 0016, 0018). Money is a string
# (ADR 0006). The previous amount and % change let the UI confirm the step without doing the maths.
class SalaryRevisionSerializer
  def initialize(revision, previous_amount: nil)
    @revision = revision
    @previous_amount = previous_amount
  end

  def as_json(*)
    {
      id: @revision.id,
      amount: @revision.amount.to_s("F"),
      currency: @revision.currency,
      effective_from: @revision.effective_from,
      reason: @revision.reason,
      recorded_at: @revision.created_at,
      previous_amount: @previous_amount&.to_s("F"),
      change_percent:
    }
  end

  # The % change from one amount to the next, to one decimal; none without an amount before it.
  # Also used by the employee timeline (ADR 0021).
  def self.change_percent(previous_amount, amount)
    return if previous_amount.nil? || previous_amount.zero?

    ((amount - previous_amount) / previous_amount * 100).round(1).to_f
  end

  private

  def change_percent
    self.class.change_percent(@previous_amount, @revision.amount)
  end
end
