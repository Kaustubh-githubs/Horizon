class Department < ApplicationRecord
  normalizes :name, with: ->(value) { value.squish }

  validates :name, presence: true, uniqueness: { case_sensitive: false }
end
