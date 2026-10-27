class Country < ApplicationRecord
  normalizes :code, :currency_code, with: ->(value) { value.strip.upcase }
  normalizes :name, with: ->(value) { value.squish }

  validates :code, presence: true, uniqueness: true, format: { with: /\A[A-Z]{2}\z/, allow_blank: true }
  validates :name, presence: true, uniqueness: { case_sensitive: false }
  validates :currency_code, presence: true, format: { with: /\A[A-Z]{3}\z/, allow_blank: true }
end
