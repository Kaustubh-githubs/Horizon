class Employee < ApplicationRecord
  belongs_to :country
  belongs_to :department
  belongs_to :job_title
  # Employees are terminated, never deleted (ADR 0008), so history always has an owner.
  has_many :salary_revisions, dependent: :restrict_with_exception

  enum :status, { active: "active", terminated: "terminated" }, default: :active, validate: true

  # Computed by the database from the id (ADR 0014). Read-only here too, so assigning it
  # fails loudly in Ruby instead of with a Postgres error on save.
  attr_readonly :employee_code
  # Fixed once saved: salary history starts on the hire date, in the country's currency (ADR 0017).
  attr_readonly :country_id, :hire_date

  normalizes :full_name, with: ->(value) { value.squish }
  normalizes :email, with: ->(value) { value.strip.downcase }
  normalizes :current_currency, with: ->(value) { value.strip.upcase }

  validates :full_name, :hire_date, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
  validates :current_salary, presence: true, numericality: { greater_than: 0, allow_blank: true }
  validate :current_salary_fits_column
  # The currency follows the country, so without a country the country error is enough.
  validates :current_currency, presence: true, if: :country
  validates :terminated_on, presence: true, if: :terminated?
  validates :terminated_on, absence: true, unless: :terminated?
  validate :hire_date_not_in_future
  validate :terminated_on_not_in_future
  validate :terminated_on_not_before_hire_date
  validate :terminated_on_not_before_latest_salary_change
  validate :currency_matches_country
  validate :terminated_employees_are_read_only, on: :update

  # Terminated employees are kept, read-only, instead of deleted (ADR 0008, 0017).
  def terminate!(on:)
    update!(status: "terminated", terminated_on: on)
  end

  private

  def current_salary_fits_column
    return if current_salary.blank? || current_salary < SalaryRevision::MAX_AMOUNT

    errors.add(:current_salary, "is too large")
  end

  def hire_date_not_in_future
    errors.add(:hire_date, "can't be in the future") if hire_date.present? && hire_date > Date.current
  end

  def terminated_on_not_in_future
    errors.add(:terminated_on, "can't be in the future") if terminated_on.present? && terminated_on > Date.current
  end

  def terminated_on_not_before_latest_salary_change
    return if terminated_on.blank? || !will_save_change_to_terminated_on? || new_record?

    latest = salary_revisions.maximum(:effective_from)
    errors.add(:terminated_on, "can't be before the latest salary change (#{latest})") if latest && terminated_on < latest
  end

  # Only when something is being changed, so a saved terminated employee still counts as valid.
  def terminated_employees_are_read_only
    return unless status_in_database == "terminated" && changed?

    errors.add(:base, "Former employees can't be changed")
  end

  def terminated_on_not_before_hire_date
    return if terminated_on.blank? || hire_date.blank? || terminated_on >= hire_date

    errors.add(:terminated_on, "can't be before the hire date")
  end

  def currency_matches_country
    return if country.blank? || current_currency.blank? || current_currency == country.currency_code

    errors.add(:current_currency, "must be #{country.currency_code}, the currency of #{country.name}")
  end
end
