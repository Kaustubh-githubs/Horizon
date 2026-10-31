module Employees
  # An employee's audit log (ADR 0012, 0021): every saved change to the employee or one of their
  # salary revisions, newest first, with each changed column, who, when and why. Nothing is grouped
  # or hidden: it's the record for checking. The readable story is the timeline (TimelineQuery).
  class AuditLogQuery
    # Columns in the order the log lists them; any others follow. A revision's employee id is left
    # out, because the whole log is about that employee.
    ORDER = %w[full_name email country_id department_id job_title_id hire_date status terminated_on
               current_salary current_currency amount currency effective_from reason].freeze
    HIDDEN = %w[employee_id].freeze

    def initialize(employee)
      @employee = employee
    end

    def call
      audits = @employee.own_and_associated_audits.reorder(id: :desc).includes(:user).to_a
      values = AuditValues.new(audits)
      audits.map { |audit| row(audit, values) }
    end

    private

    def row(audit, values)
      {
        id: audit.id,
        model: audit.auditable_type.underscore,
        action: audit.action,
        version: audit.version,
        # No user for changes made outside the app, such as the console.
        changed_by: audit.user&.name,
        created_at: audit.created_at,
        # Why: a salary change's reason, or a note if one was given (ADR 0012).
        reason: (audit.audited_changes["reason"] if audit.auditable_type == "SalaryRevision"),
        comment: audit.comment,
        currency: @employee.current_currency,
        changes: changes(audit, values)
      }
    end

    def changes(audit, values)
      columns = (audit.audited_changes.keys - HIDDEN).sort_by { |column| ORDER.index(column) || ORDER.size }
      columns.filter_map do |column|
        change = values.change(audit, column)
        change unless change[:from].nil? && change[:to].nil?
      end
    end
  end
end
