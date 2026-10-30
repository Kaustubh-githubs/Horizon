module Employees
  # Adds an employee together with their salary (ADR 0004, 0017). In one transaction it saves
  # the employee and a `hire` revision, so the current salary and the history always agree.
  # The currency always follows the country.
  #
  # The revision takes effect today, the day it's recorded (ADR 0005), not on the hire date:
  # for someone added after they started, we only know what they're paid now, and dating it
  # back would claim they were hired on today's salary. For a new joiner the two are the same day.
  #
  # Raises ActiveRecord::RecordInvalid, and saves nothing, if either can't be saved.
  class Create
    def initialize(attributes)
      @attributes = attributes.to_h.symbolize_keys.except(:current_currency, :status, :terminated_on)
    end

    def call
      employee = Employee.new(@attributes)
      employee.current_currency = employee.country&.currency_code

      Employee.transaction do
        employee.save!
        SalaryRevision.create!(employee:, amount: employee.current_salary, currency: employee.current_currency,
                               effective_from: Date.current, reason: "hire")
      end
      employee
    end
  end
end
