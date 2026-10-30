# The JSON shape of a salary revision (ADR 0016, 0018). Money is a string (ADR 0006). The
# previous amount and % change let the UI show each step without doing the maths itself.
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

  # Every revision in order, each with the amount before it, newest first for display.
  def self.history(revisions)
    previous = nil
    revisions.map { |revision| new(revision, previous_amount: previous).tap { previous = revision.amount } }.reverse
  end

  private

  def change_percent
    return if @previous_amount.nil? || @previous_amount.zero?

    ((@revision.amount - @previous_amount) / @previous_amount * 100).round(1).to_f
  end
end
