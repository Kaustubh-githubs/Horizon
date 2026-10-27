require "rails_helper"

RSpec.describe Country, type: :model do
  subject(:country) { build(:country) }

  it "is valid when built from the factory" do
    expect(country).to be_valid
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:code) }
    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_presence_of(:currency_code) }

    it "rejects a country code that is not two letters" do
      country.code = "IND"

      expect(country).not_to be_valid
    end

    it "rejects a currency code that is not three letters" do
      country.currency_code = "RUPEE"

      expect(country).not_to be_valid
    end

    it "rejects a code that another country already has" do
      create(:country, code: "IN")
      country.code = "IN"

      expect(country).not_to be_valid
    end

    it "rejects a name that differs from an existing one only by case" do
      create(:country, name: "India")
      country.name = "INDIA"

      expect(country).not_to be_valid
    end
  end

  describe "normalization" do
    it "trims and uppercases the country code" do
      expect(described_class.new(code: " in ").code).to eq("IN")
    end

    it "trims and uppercases the currency code" do
      expect(described_class.new(currency_code: " inr ").currency_code).to eq("INR")
    end

    it "squishes extra whitespace in the name" do
      expect(described_class.new(name: "  United   Kingdom ").name).to eq("United Kingdom")
    end
  end

  # These rules protect data written without the model, such as the seed script's bulk inserts.
  describe "database constraints" do
    def insert_country(attributes)
      described_class.insert_all!([ { code: "IN", name: "India", currency_code: "INR" }.merge(attributes) ])
    end

    it "rejects names that differ only by case" do
      insert_country(name: "India")

      expect { insert_country(code: "IX", name: "INDIA") }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    # insert_all still applies `normalizes` (it works at the attribute-type level and would
    # uppercase "in"), so only hand-written SQL reaches the database with a bad value.
    def insert_raw(code:, currency_code:)
      sql = described_class.sanitize_sql_array([ <<~SQL, code, currency_code ])
        INSERT INTO countries (code, name, currency_code, created_at, updated_at)
        VALUES (?, 'India', ?, NOW(), NOW())
      SQL
      described_class.with_connection { |connection| connection.execute(sql) }
    end

    it "rejects a lowercase country code" do
      expect { insert_raw(code: "in", currency_code: "INR") }
        .to raise_error(ActiveRecord::StatementInvalid, /countries_code_format/)
    end

    it "rejects a lowercase currency code" do
      expect { insert_raw(code: "IN", currency_code: "inr") }
        .to raise_error(ActiveRecord::StatementInvalid, /countries_currency_code_format/)
    end
  end
end
