class Persona < ApplicationRecord
  HR_MANAGER = "hr_manager".freeze

  has_many :users, dependent: :restrict_with_exception

  normalizes :key, with: ->(value) { value.strip.downcase }
  normalizes :name, with: ->(value) { value.squish }

  validates :key, presence: true, uniqueness: true, format: { with: /\A[a-z][a-z_]*\z/, allow_blank: true }
  validates :name, presence: true
end
