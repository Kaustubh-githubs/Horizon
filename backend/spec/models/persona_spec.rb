require "rails_helper"

RSpec.describe Persona, type: :model do
  subject(:persona) { build(:persona) }

  it "is valid when built from the factory" do
    expect(persona).to be_valid
  end

  it { is_expected.to have_many(:users).dependent(:restrict_with_exception) }
  it { is_expected.to validate_presence_of(:key) }
  it { is_expected.to validate_presence_of(:name) }

  it "rejects a key that another persona already has" do
    create(:persona, key: "hr_manager")
    persona.key = "hr_manager"

    expect(persona).not_to be_valid
  end

  it "rejects a key with spaces or symbols" do
    persona.key = "hr manager!"

    expect(persona).not_to be_valid
  end

  it "trims and lowercases the key" do
    expect(described_class.new(key: " HR_Manager ").key).to eq("hr_manager")
  end
end
