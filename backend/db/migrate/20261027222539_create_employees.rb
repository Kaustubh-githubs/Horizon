class CreateEmployees < ActiveRecord::Migration[8.1]
  def change
    create_table :employees do |t|
      # Computed by Postgres from the row's id (ADR 0013): EMP-000123. Pads to at least six
      # digits but never truncates, so id 1234567 becomes EMP-1234567, not EMP-123456.
      t.virtual :employee_code, type: :string, stored: true,
                as: "'EMP-' || lpad(id::text, GREATEST(6, length(id::text)), '0')"
      t.string :full_name, null: false
      t.string :email, null: false
      t.date :hire_date, null: false
      t.string :status, null: false, default: "active"
      t.date :terminated_on
      # country_id and job_title_id are covered by the composite index below.
      t.references :country, null: false, foreign_key: true, index: false
      t.references :department, null: false, foreign_key: true
      t.references :job_title, null: false, foreign_key: true, index: false
      t.decimal :current_salary, precision: 15, scale: 2, null: false
      t.string :current_currency, null: false
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end

    add_index :employees, :employee_code, unique: true
    add_index :employees, :email, unique: true
    add_index :employees, [ :country_id, :job_title_id ]
    add_index :employees, :status

    add_check_constraint :employees, "status IN ('active', 'terminated')", name: "employees_status_valid"
    add_check_constraint :employees, "(status = 'terminated') = (terminated_on IS NOT NULL)",
                         name: "employees_termination_consistent"
    add_check_constraint :employees, "terminated_on IS NULL OR terminated_on >= hire_date",
                         name: "employees_terminated_after_hire"
    add_check_constraint :employees, "current_salary > 0", name: "employees_current_salary_positive"
    add_check_constraint :employees, "current_currency ~ '^[A-Z]{3}$'", name: "employees_current_currency_format"
  end
end
