# The directory's search is a case-insensitive "contains" on name, email and employee code
# (ILIKE '%term%'), which a plain B-tree index can't serve. Trigram GIN indexes can, so the
# search stays indexed as the company grows (docs/performance.md).
class AddTrigramIndexesForEmployeeSearch < ActiveRecord::Migration[8.1]
  def change
    enable_extension "pg_trgm"

    add_index :employees, :full_name, using: :gin, opclass: :gin_trgm_ops, name: "index_employees_on_full_name_trgm"
    add_index :employees, :email, using: :gin, opclass: :gin_trgm_ops, name: "index_employees_on_email_trgm"
    add_index :employees, :employee_code, using: :gin, opclass: :gin_trgm_ops,
                                          name: "index_employees_on_employee_code_trgm"
  end
end
