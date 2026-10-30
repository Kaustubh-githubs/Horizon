# The audit trail's table, as the audited gem's generator makes it (ADR 0012), with two changes:
# changes are JSONB so Postgres can query them, and the ids are bigint to match our tables.
class InstallAudited < ActiveRecord::Migration[8.1]
  def change
    create_table :audits do |t|
      t.bigint :auditable_id
      t.string :auditable_type
      t.bigint :associated_id
      t.string :associated_type
      t.bigint :user_id
      t.string :user_type
      t.string :username
      t.string :action
      t.jsonb :audited_changes
      t.integer :version, default: 0
      t.string :comment
      t.string :remote_address
      t.string :request_uuid
      # No updated_at: audit rows are never changed.
      t.datetime :created_at

      t.index %i[auditable_type auditable_id version], name: "auditable_index"
      t.index %i[associated_type associated_id], name: "associated_index"
      t.index %i[user_id user_type], name: "user_index"
      t.index :request_uuid
      t.index :created_at
    end
  end
end
