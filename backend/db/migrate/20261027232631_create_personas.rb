class CreatePersonas < ActiveRecord::Migration[8.1]
  def change
    # The kind of user, e.g. HR Manager. The hook for permissions later (ADR 0010).
    create_table :personas do |t|
      t.string :key, null: false
      t.string :name, null: false
      t.string :description
      t.timestamps
    end

    add_index :personas, :key, unique: true
    add_check_constraint :personas, "key ~ '^[a-z][a-z_]*$'", name: "personas_key_format"
  end
end
