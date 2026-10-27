require "rails_helper"

RSpec.describe ExchangeRate, type: :model do
  subject(:exchange_rate) { build(:exchange_rate) }

  it "is valid when built from the factory" do
    expect(exchange_rate).to be_valid
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:currency_code) }
    it { is_expected.to validate_presence_of(:rate_to_usd) }
    it { is_expected.to validate_presence_of(:as_of) }

    it "rejects a currency code that is not three letters" do
      exchange_rate.currency_code = "RUPEE"

      expect(exchange_rate).not_to be_valid
    end

    it "rejects a second rate for the same currency" do
      create(:exchange_rate, currency_code: "INR")
      exchange_rate.currency_code = "INR"

      expect(exchange_rate).not_to be_valid
    end

    it "rejects a rate of zero" do
      exchange_rate.rate_to_usd = 0

      expect(exchange_rate).not_to be_valid
    end
  end

  describe "normalization" do
    it "trims and uppercases the currency code" do
      expect(described_class.new(currency_code: " inr ").currency_code).to eq("INR")
    end
  end

  it "keeps small rates exactly, without float rounding" do
    exchange_rate.update!(rate_to_usd: "0.00667123")

    expect(exchange_rate.reload.rate_to_usd).to eq(BigDecimal("0.00667123"))
  end

  # These rules protect data written without the model, such as the seed script's bulk inserts.
  describe "database constraints" do
    def insert_raw(currency_code:, rate_to_usd:)
      sql = described_class.sanitize_sql_array([ <<~SQL, currency_code, rate_to_usd ])
        INSERT INTO exchange_rates (currency_code, rate_to_usd, as_of, created_at, updated_at)
        VALUES (?, ?, '2026-10-01', NOW(), NOW())
      SQL
      described_class.with_connection { |connection| connection.execute(sql) }
    end

    it "rejects a second rate for the same currency" do
      insert_raw(currency_code: "INR", rate_to_usd: "0.012")

      expect { insert_raw(currency_code: "INR", rate_to_usd: "0.013") }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "rejects a lowercase currency code" do
      expect { insert_raw(currency_code: "inr", rate_to_usd: "0.012") }
        .to raise_error(ActiveRecord::StatementInvalid, /exchange_rates_currency_code_format/)
    end

    it "rejects a rate that is not positive" do
      expect { insert_raw(currency_code: "INR", rate_to_usd: "0") }
        .to raise_error(ActiveRecord::StatementInvalid, /exchange_rates_rate_positive/)
    end
  end
end
