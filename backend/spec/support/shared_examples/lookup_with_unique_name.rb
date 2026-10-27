# Rules shared by simple lookup tables (departments, job titles): a required name,
# whitespace squished, unique ignoring case in both the model and the database.
RSpec.shared_examples "a lookup with a unique name" do |factory|
  subject(:record) { build(factory) }

  it "is valid when built from the factory" do
    expect(record).to be_valid
  end

  it { is_expected.to validate_presence_of(:name) }

  it "rejects a name that differs from an existing one only by case" do
    create(factory, name: "Engineering")
    record.name = "ENGINEERING"

    expect(record).not_to be_valid
  end

  it "squishes extra whitespace in the name" do
    expect(described_class.new(name: "  Human   Resources ").name).to eq("Human Resources")
  end

  it "rejects case-only duplicates in the database too" do
    described_class.insert_all!([ { name: "Engineering" } ])

    expect { described_class.insert_all!([ { name: "ENGINEERING" } ]) }.to raise_error(ActiveRecord::RecordNotUnique)
  end
end
