module Api
  module V1
    # An employee's audit log (ADR 0012, 0021): every saved change to them or their salary
    # revisions, column by column, with who, when and why, newest first.
    class EmployeeAuditsController < Api::BaseController
      def index
        employee = Employee.find(params[:employee_id])

        render json: Employees::AuditLogQuery.new(employee).call
      end
    end
  end
end
