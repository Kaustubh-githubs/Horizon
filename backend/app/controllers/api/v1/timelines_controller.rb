module Api
  module V1
    # An employee's timeline (ADR 0021): their story by date, newest first, with the currency for
    # salary amounts.
    class TimelinesController < Api::BaseController
      def show
        employee = Employee.find(params[:employee_id])

        render json: { currency: employee.current_currency, events: Employees::TimelineQuery.new(employee).call }
      end
    end
  end
end
