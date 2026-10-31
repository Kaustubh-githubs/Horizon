module Employees
  # Turns audited column values into what the timeline and the audit log show (ADR 0012, 0021):
  # department, job title and country ids become names, loaded with one query per table for all
  # the audits, and money becomes a string (ADR 0006).
  class AuditValues
    NAMED = { "department_id" => Department, "job_title_id" => JobTitle, "country_id" => Country }.freeze
    MONEY = %w[current_salary amount].freeze

    # The field name the UI uses: an id column without its "_id".
    def self.field(column)
      column.delete_suffix("_id")
    end

    # A column's [from, to]: a create records the value it was set to, an update [old, new], and
    # a destroy the value it had.
    def self.from_to(audit, column)
      value = audit.audited_changes[column]
      case audit.action
      when "create" then [ nil, value ]
      when "destroy" then [ value, nil ]
      else value
      end
    end

    def initialize(audits)
      @names = NAMED.to_h do |column, model|
        ids = audits.flat_map { |audit| Array(audit.audited_changes[column]) }.compact.uniq
        [ column, model.where(id: ids).pluck(:id, :name).to_h ]
      end
    end

    # { field, from, to } for one column of one audit, ready to show.
    def change(audit, column)
      from, to = self.class.from_to(audit, column)
      { field: self.class.field(column), from: display(column, from), to: display(column, to) }
    end

    def display(column, value)
      return if value.nil?
      return @names[column].fetch(value, value.to_s) if NAMED.key?(column)

      MONEY.include?(column) ? MoneyString.from(value) : value
    end
  end
end
