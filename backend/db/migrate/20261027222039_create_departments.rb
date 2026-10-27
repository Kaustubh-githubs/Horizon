class CreateDepartments < ActiveRecord::Migration[8.1]
  def change
    create_table :departments do |t|
      t.string :name, null: false
      t.timestamps
    end

    add_index :departments, "LOWER(name)", unique: true, name: "index_departments_on_lower_name"
  end
end
