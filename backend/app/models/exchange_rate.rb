class ExchangeRate < ApplicationRecord
  normalizes :currency_code, with: ->(value) { value.strip.upcase }

  validates :currency_code, presence: true, uniqueness: true, format: { with: /\A[A-Z]{3}\z/, allow_blank: true }
  validates :rate_to_usd, presence: true, numericality: { greater_than: 0, allow_blank: true }
  validates :as_of, presence: true
end
