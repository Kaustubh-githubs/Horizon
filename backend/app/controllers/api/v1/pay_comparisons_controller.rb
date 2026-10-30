module Api
  module V1
    # What an employee's peers earn, for the change-salary dialog (ADR 0018).
    class PayComparisonsController < Api::BaseController
      def show
        employee = Employee.includes(:country, :job_title).find(params[:employee_id])

        render json: Employees::PayComparisonQuery.new(employee, job_title_id: scalar_param(:job_title_id)).call
      end
    end
  end
end
