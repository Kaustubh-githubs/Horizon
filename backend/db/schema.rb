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

ActiveRecord::Schema[8.1].define(version: 2026_11_01_090000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  create_table "audits", force: :cascade do |t|
    t.bigint "auditable_id"
    t.string "auditable_type"
    t.bigint "associated_id"
    t.string "associated_type"
    t.bigint "user_id"
    t.string "user_type"
    t.string "username"
    t.string "action"
    t.jsonb "audited_changes"
    t.integer "version", default: 0
    t.string "comment"
    t.string "remote_address"
    t.string "request_uuid"
    t.datetime "created_at"
    t.index ["associated_type", "associated_id"], name: "associated_index"
    t.index ["auditable_type", "auditable_id", "version"], name: "auditable_index"
    t.index ["created_at"], name: "index_audits_on_created_at"
    t.index ["request_uuid"], name: "index_audits_on_request_uuid"
    t.index ["user_id", "user_type"], name: "user_index"
  end

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

  create_table "department_budgets", force: :cascade do |t|
    t.bigint "department_id", null: false
    t.integer "year", null: false
    t.decimal "amount", precision: 15, scale: 2, null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["department_id", "year"], name: "index_department_budgets_on_department_id_and_year", unique: true
    t.check_constraint "amount > 0::numeric", name: "department_budgets_amount_positive"
    t.check_constraint "year >= 2000 AND year <= 2100", name: "department_budgets_year_sensible"
  end

  create_table "departments", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((name)::text)", name: "index_departments_on_lower_name", unique: true
  end

  create_table "employees", force: :cascade do |t|
    t.virtual "employee_code", type: :string, as: "('EMP-'::text || lpad((id)::text, GREATEST(6, length((id)::text)), '0'::text))", stored: true
    t.string "full_name", null: false
    t.string "email", null: false
    t.date "hire_date", null: false
    t.string "status", default: "active", null: false
    t.date "terminated_on"
    t.bigint "country_id", null: false
    t.bigint "department_id", null: false
    t.bigint "job_title_id", null: false
    t.decimal "current_salary", precision: 15, scale: 2, null: false
    t.string "current_currency", null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["country_id", "job_title_id"], name: "index_employees_on_country_id_and_job_title_id"
    t.index ["department_id"], name: "index_employees_on_department_id"
    t.index ["email"], name: "index_employees_on_email", unique: true
    t.index ["email"], name: "index_employees_on_email_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["employee_code"], name: "index_employees_on_employee_code", unique: true
    t.index ["employee_code"], name: "index_employees_on_employee_code_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["full_name"], name: "index_employees_on_full_name_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["status"], name: "index_employees_on_status"
    t.check_constraint "(status::text = 'terminated'::text) = (terminated_on IS NOT NULL)", name: "employees_termination_consistent"
    t.check_constraint "current_currency::text ~ '^[A-Z]{3}$'::text", name: "employees_current_currency_format"
    t.check_constraint "current_salary > 0::numeric", name: "employees_current_salary_positive"
    t.check_constraint "status::text = ANY (ARRAY['active'::character varying, 'terminated'::character varying]::text[])", name: "employees_status_valid"
    t.check_constraint "terminated_on IS NULL OR terminated_on >= hire_date", name: "employees_terminated_after_hire"
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

  create_table "personas", force: :cascade do |t|
    t.string "key", null: false
    t.string "name", null: false
    t.string "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_personas_on_key", unique: true
    t.check_constraint "key::text ~ '^[a-z][a-z_]*$'::text", name: "personas_key_format"
  end

  create_table "salary_revisions", force: :cascade do |t|
    t.bigint "employee_id", null: false
    t.decimal "amount", precision: 15, scale: 2, null: false
    t.string "currency", null: false
    t.date "effective_from", null: false
    t.string "reason", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["employee_id", "effective_from"], name: "index_salary_revisions_on_employee_id_and_effective_from"
    t.check_constraint "amount > 0::numeric", name: "salary_revisions_amount_positive"
    t.check_constraint "currency::text ~ '^[A-Z]{3}$'::text", name: "salary_revisions_currency_format"
    t.check_constraint "reason::text = ANY (ARRAY['hire'::character varying, 'annual_raise'::character varying, 'promotion'::character varying, 'market_adjustment'::character varying, 'correction'::character varying]::text[])", name: "salary_revisions_reason_valid"
  end

  create_table "sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "ip_address"
    t.string "user_agent"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "name", null: false
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.bigint "persona_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
    t.index ["persona_id"], name: "index_users_on_persona_id"
  end

  add_foreign_key "department_budgets", "departments"
  add_foreign_key "employees", "countries"
  add_foreign_key "employees", "departments"
  add_foreign_key "employees", "job_titles"
  add_foreign_key "salary_revisions", "employees"
  add_foreign_key "sessions", "users"
  add_foreign_key "users", "personas"
end
