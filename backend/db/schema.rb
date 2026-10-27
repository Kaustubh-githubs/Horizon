# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_27_222040) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "countries", force: :cascade do |t|
    t.string "code", null: false
    t.string "name", null: false
    t.string "currency_code", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((name)::text)", name: "index_countries_on_lower_name", unique: true
    t.index ["code"], name: "index_countries_on_code", unique: true
    t.check_constraint "code::text ~ '^[A-Z]{2}$'::text", name: "countries_code_format"
    t.check_constraint "currency_code::text ~ '^[A-Z]{3}$'::text", name: "countries_currency_code_format"
  end

  create_table "departments", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((name)::text)", name: "index_departments_on_lower_name", unique: true
  end

  create_table "exchange_rates", force: :cascade do |t|
    t.string "currency_code", null: false
    t.decimal "rate_to_usd", precision: 20, scale: 10, null: false
    t.date "as_of", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["currency_code"], name: "index_exchange_rates_on_currency_code", unique: true
    t.check_constraint "currency_code::text ~ '^[A-Z]{3}$'::text", name: "exchange_rates_currency_code_format"
    t.check_constraint "rate_to_usd > 0::numeric", name: "exchange_rates_rate_positive"
  end

  create_table "job_titles", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((name)::text)", name: "index_job_titles_on_lower_name", unique: true
  end
end
