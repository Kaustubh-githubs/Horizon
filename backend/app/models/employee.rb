class Employee < ApplicationRecord
  belongs_to :country
  belongs_to :department
  belongs_to :job_title

  enum :status, { active: "active", terminated: "terminated" }, default: :active, validate: true

  # Computed by the database from the id (ADR 0013). Read-only here too, so assigning it
  # fails loudly in Ruby instead of with a Postgres error on save.
  attr_readonly :employee_code

  normalizes :full_name, with: ->(value) { value.squish }
  normalizes :email, with: ->(value) { value.strip.downcase }
  normalizes :current_currency, with: ->(value) { value.strip.upcase }

  validates :full_name, :hire_date, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
  validates :current_salary, presence: true, numericality: { greater_than: 0, allow_blank: true }
  validates :current_currency, presence: true
  validates :terminated_on, presence: true, if: :terminated?
  validates :terminated_on, absence: true, unless: :terminated?
  validate :terminated_on_not_before_hire_date
  validate :currency_matches_country

  private

  def terminated_on_not_before_hire_date
    return if terminated_on.blank? || hire_date.blank? || terminated_on >= hire_date

    errors.add(:terminated_on, "can't be before the hire date")
  end

  def currency_matches_country
    return if country.blank? || current_currency.blank? || current_currency == country.currency_code

    errors.add(:current_currency, "must be #{country.currency_code}, the currency of #{country.name}")
  end
end
