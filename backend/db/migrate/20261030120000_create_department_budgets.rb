# One yearly budget per department, in INR (ADR 0020).
# The rules are in the model too; these constraints protect data written without it.
class CreateDepartmentBudgets < ActiveRecord::Migration[8.1]
  def change
    create_table :department_budgets do |t|
      # No separate index: the unique (department, year) index starts with department_id.
      t.references :department, null: false, foreign_key: true, index: false
      t.integer :year, null: false
      t.decimal :amount, precision: 15, scale: 2, null: false
      t.integer :lock_version, null: false, default: 0
      t.timestamps

      t.index %i[department_id year], unique: true
      t.check_constraint "amount > 0", name: "department_budgets_amount_positive"
      t.check_constraint "year BETWEEN 2000 AND 2100", name: "department_budgets_year_sensible"
    end
  end
end
