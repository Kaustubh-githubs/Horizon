class CreateCountries < ActiveRecord::Migration[8.1]
  def change
    create_table :countries do |t|
      t.string :code, null: false
      t.string :name, null: false
      t.string :currency_code, null: false
      t.timestamps
    end

    add_index :countries, :code, unique: true
    # Case-insensitive: "India" and "INDIA" can't both exist (docs/schema.md).
    add_index :countries, "LOWER(name)", unique: true, name: "index_countries_on_lower_name"

    add_check_constraint :countries, "code ~ '^[A-Z]{2}$'", name: "countries_code_format"
    add_check_constraint :countries, "currency_code ~ '^[A-Z]{3}$'", name: "countries_currency_code_format"
  end
end
