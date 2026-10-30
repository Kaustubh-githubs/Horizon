module Api
  module V1
    # How an employee's pay compares with their peers, for the ★ banner on their profile (ADR 0019).
    class PayPositionsController < Api::BaseController
      def show
        employee = Employee.includes(:country, :job_title).find(params[:employee_id])

        render json: ::Insights::OutliersQuery.position(employee)
      end
    end
  end
end
