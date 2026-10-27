class CreateExchangeRates < ActiveRecord::Migration[8.1]
  def change
    create_table :exchange_rates do |t|
      t.string :currency_code, null: false
      t.decimal :rate_to_usd, precision: 20, scale: 10, null: false
      t.date :as_of, null: false
      t.timestamps
    end

    add_index :exchange_rates, :currency_code, unique: true

    add_check_constraint :exchange_rates, "currency_code ~ '^[A-Z]{3}$'", name: "exchange_rates_currency_code_format"
    add_check_constraint :exchange_rates, "rate_to_usd > 0", name: "exchange_rates_rate_positive"
  end
end
