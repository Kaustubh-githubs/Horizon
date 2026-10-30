# A department's yearly pay budget, in INR, the reporting currency (ADR 0020).
class DepartmentBudget < ApplicationRecord
  CURRENCY = Insights::REPORTING_CURRENCY

  auditable
  belongs_to :department

  validates :amount, presence: true, numericality: { greater_than: 0, allow_blank: true }
  validate :amount_fits_column
  validates :year, presence: true, numericality: { only_integer: true, allow_blank: true }
  validate :year_is_this_year
  validates :year, uniqueness: { scope: :department_id, message: "already has a budget for this department" }

  # The UTC year (ADR 0017). Comparisons use today's payroll, so only this year can be budgeted.
  def self.current_year
    Date.current.year
  end

  private

  def amount_fits_column
    errors.add(:amount, "is too large") if amount.present? && amount >= SalaryRevision::MAX_AMOUNT
  end

  def year_is_this_year
    return if year.blank? || year == self.class.current_year

    errors.add(:year, "must be this year (#{self.class.current_year})")
  end
end
