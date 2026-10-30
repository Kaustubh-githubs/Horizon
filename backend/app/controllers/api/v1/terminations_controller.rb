module Api
  module V1
    # Terminating an employee, as a resource of its own instead of a /terminate verb (ADR 0017).
    class TerminationsController < Api::BaseController
      def create
        employee = Employee.find(params[:employee_id])
        employee.lock_version = params.require(:lock_version)
        employee.terminate!(on: params.require(:terminated_on))

        render json: EmployeeSerializer.new(employee)
      end
    end
  end
end
