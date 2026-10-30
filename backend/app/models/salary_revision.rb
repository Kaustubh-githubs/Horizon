class SalaryRevision < ApplicationRecord
  belongs_to :employee

  enum :reason, {
    hire: "hire",
    annual_raise: "annual_raise",
    promotion: "promotion",
    market_adjustment: "market_adjustment",
    correction: "correction"
  }, validate: true

  # Money columns are decimal(15,2), so amounts must stay below 10^13 (ADR 0006). Checked in the
  # model, so a huge number is a field error instead of a database overflow.
  MAX_AMOUNT = 10**13

  normalizes :currency, with: ->(value) { value.strip.upcase }

  validates :amount, presence: true, numericality: { greater_than: 0, allow_blank: true }
  validate :amount_fits_column
  validates :currency, presence: true
  validates :effective_from, presence: true
  validate :effective_from_not_in_future
  validate :effective_from_not_before_hire_date
  validate :currency_matches_employee_country
  # Former employees' pay is frozen with the rest of their record (ADR 0017).
  validate :employee_still_employed, on: :create

  # History is append-only: a mistake is fixed with a new `correction` revision, never by editing.
  def readonly?
    persisted? || super
  end

  private

  def amount_fits_column
    errors.add(:amount, "is too large") if amount.present? && amount >= MAX_AMOUNT
  end

  def employee_still_employed
    errors.add(:base, "Former employees' salaries can't be changed") if employee&.terminated?
  end

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
