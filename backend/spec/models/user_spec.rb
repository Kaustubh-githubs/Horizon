require "rails_helper"

RSpec.describe User, type: :model do
  subject(:user) { build(:user) }

  it "is valid when built from the factory" do
    expect(user).to be_valid
  end

  it { is_expected.to belong_to(:persona) }
  it { is_expected.to have_many(:sessions).dependent(:destroy) }
  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_presence_of(:email_address) }

  it "rejects an email address another user already has, whatever its case" do
    create(:user, email_address: "asha@acme.test")
    user.email_address = "ASHA@acme.test"

    expect(user).not_to be_valid
  end

  it "rejects a password shorter than 12 characters" do
    user.password = "short-pass1"

    expect(user).not_to be_valid
  end

  it "trims and lowercases the email address" do
    expect(described_class.new(email_address: " Asha@ACME.test ").email_address).to eq("asha@acme.test")
  end

  it "stores a bcrypt hash of the password, never the password itself", :aggregate_failures do
    saved = create(:user, password: "correct-horse-battery")

    expect(saved.password_digest).to start_with("$2")
    expect(saved.password_digest).not_to include("correct-horse-battery")
  end

  it "authenticates with the right password only", :aggregate_failures do
    saved = create(:user, email_address: "asha@acme.test", password: "correct-horse-battery")

    expect(described_class.authenticate_by(email_address: "asha@acme.test", password: "correct-horse-battery")).to eq(saved)
    expect(described_class.authenticate_by(email_address: "asha@acme.test", password: "wrong-password!")).to be_nil
  end
end
