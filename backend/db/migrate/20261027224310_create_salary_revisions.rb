class CreateSalaryRevisions < ActiveRecord::Migration[8.1]
  def change
    create_table :salary_revisions do |t|
      # employee_id is covered by the composite index below.
      t.references :employee, null: false, foreign_key: true, index: false
      t.decimal :amount, precision: 15, scale: 2, null: false
      t.string :currency, null: false
      t.date :effective_from, null: false
      t.string :reason, null: false
      t.timestamps
    end

    # An employee's history, newest first.
    add_index :salary_revisions, [ :employee_id, :effective_from ]

    add_check_constraint :salary_revisions, "amount > 0", name: "salary_revisions_amount_positive"
    add_check_constraint :salary_revisions, "currency ~ '^[A-Z]{3}$'", name: "salary_revisions_currency_format"
    add_check_constraint :salary_revisions,
                         "reason IN ('hire', 'annual_raise', 'promotion', 'market_adjustment', 'correction')",
                         name: "salary_revisions_reason_valid"
  end
end
