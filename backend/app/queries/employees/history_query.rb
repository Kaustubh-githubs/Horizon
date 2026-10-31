module Employees
  # An employee's change history from the audit trail (ADR 0012), newest first. Audit rows are
  # grouped by request, so each entry is one thing HR did: adding someone writes the employee and
  # their hire revision, and a salary change writes the revision and the employee's salary copy
  # (and title, for a promotion). The salary shows once, from the employee's old and new copy.
  class HistoryQuery
    # The columns an entry lists, in this order, under the name the UI uses. Status isn't listed:
    # the entry's kind ("ended") already says it.
    FIELDS = {
      "full_name" => "full_name",
      "email" => "email",
      "department_id" => "department",
      "job_title_id" => "job_title",
      "country_id" => "country",
      "hire_date" => "hire_date",
      "current_salary" => "salary",
      "terminated_on" => "terminated_on"
    }.freeze
    # Id columns shown by name.
    NAMED = { "department_id" => Department, "job_title_id" => JobTitle, "country_id" => Country }.freeze

    def initialize(employee)
      @employee = employee
    end

    def call
      audits = @employee.own_and_associated_audits.reorder(id: :desc).includes(:user).to_a
      @names = names(audits)
      audits.group_by(&:request_uuid).values.map { |group| entry(group.sort_by(&:id)) }
    end

    private

    def entry(group)
      employee_audit = group.find { |audit| audit.auditable_type == "Employee" }
      revision_audit = group.find { |audit| audit.auditable_type == "SalaryRevision" }
      kind = kind(employee_audit, revision_audit)
      {
        id: group.first.id,
        kind:,
        reason: (revision_audit&.audited_changes&.dig("reason") if kind == "salary_change"),
        # No user for changes made outside the app, such as the console.
        changed_by: group.first.user&.name,
        created_at: group.first.created_at,
        currency: @employee.current_currency,
        changes: changes(employee_audit, revision_audit)
      }
    end

    def kind(employee_audit, revision_audit)
      if employee_audit&.action == "create" then "added"
      elsif revision_audit then "salary_change"
      elsif employee_audit&.audited_changes&.key?("status") then "ended"
      else "edited"
      end
    end

    # Each listed column as { field, from, to }. A revision saved without touching the employee's
    # salary copy (only possible outside the app) still shows its amount.
    def changes(employee_audit, revision_audit)
      changes = employee_audit ? field_changes(employee_audit) : []
      if revision_audit && changes.none? { |change| change[:field] == "salary" }
        changes << { field: "salary", from: nil, to: Insights.money(revision_audit.audited_changes["amount"]) }
      end
      changes
    end

    # A create records each value; an update records [old, new].
    def field_changes(audit)
      FIELDS.filter_map do |column, field|
        next unless audit.audited_changes.key?(column)

        from, to = audit.action == "create" ? [ nil, audit.audited_changes[column] ] : audit.audited_changes[column]
        { field:, from: display(column, from), to: display(column, to) } unless from.nil? && to.nil?
      end
    end

    def display(column, value)
      return if value.nil?
      return @names[column].fetch(value, value.to_s) if NAMED.key?(column)

      column == "current_salary" ? Insights.money(value) : value
    end

    # Names for every department, job title and country id in the audits: one query per table.
    def names(audits)
      NAMED.to_h do |column, model|
        ids = audits.flat_map { |audit| Array(audit.audited_changes[column]) }.compact.uniq
        [ column, model.where(id: ids).pluck(:id, :name).to_h ]
      end
    end
  end
end
