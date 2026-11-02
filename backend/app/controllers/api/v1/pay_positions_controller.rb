module Api
  module V1
    # How an employee's pay compares with their peers, for the ★ banner on their profile (ADR 0019).
    # `threshold` is the ★ list's, when the profile was opened from it; 40% otherwise.
    class PayPositionsController < Api::BaseController
      def show
        employee = Employee.includes(:country, :job_title).find(params[:employee_id])

        render json: ::Insights::OutliersQuery.position(employee, threshold: scalar_param(:threshold))
      end
    end
  end
end
