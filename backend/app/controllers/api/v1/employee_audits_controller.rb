module Api
  module V1
    # An employee's change history from the audit trail (ADR 0012): one entry per thing HR did,
    # with who and when, newest first.
    class EmployeeAuditsController < Api::BaseController
      def index
        employee = Employee.find(params[:employee_id])

        render json: Employees::HistoryQuery.new(employee).call
      end
    end
  end
end
