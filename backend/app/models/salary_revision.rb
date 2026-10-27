class SalaryRevision < ApplicationRecord
  belongs_to :employee

  enum :reason, {
    hire: "hire",
    annual_raise: "annual_raise",
    promotion: "promotion",
    market_adjustment: "market_adjustment",
    correction: "correction"
  }, validate: true

  normalizes :currency, with: ->(value) { value.strip.upcase }

  validates :amount, presence: true, numericality: { greater_than: 0, allow_blank: true }
  validates :currency, presence: true
  validates :effective_from, presence: true
  validate :effective_from_not_in_future
  validate :effective_from_not_before_hire_date
  validate :currency_matches_employee_country

  # History is append-only: a mistake is fixed with a new `correction` revision, never by editing.
  def readonly?
    persisted? || super
  end

  private

  def effective_from_not_in_future
    return if effective_from.blank? || effective_from <= Date.current

    errors.add(:effective_from, "can't be in the future")
  end

  def effective_from_not_before_hire_date
    return if effective_from.blank? || employee&.hire_date.blank? || effective_from >= employee.hire_date

    errors.add(:effective_from, "can't be before the employee's hire date")
  end

  def currency_matches_employee_country
    expected = employee&.country&.currency_code
    return if expected.blank? || currency.blank? || currency == expected

    errors.add(:currency, "must be #{expected}, the currency of the employee's country")
  end
end
