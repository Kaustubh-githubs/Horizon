class User < ApplicationRecord
  MINIMUM_PASSWORD_LENGTH = 12

  has_secure_password
  belongs_to :persona
  has_many :sessions, dependent: :destroy

  normalizes :name, with: ->(value) { value.squish }
  normalizes :email_address, with: ->(value) { value.strip.downcase }

  validates :name, presence: true
  validates :email_address, presence: true, uniqueness: true,
                            format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
  validates :password, length: { minimum: MINIMUM_PASSWORD_LENGTH }, allow_nil: true
end
