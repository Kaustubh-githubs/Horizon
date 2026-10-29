module Api
  module V1
    class EmployeesController < Api::BaseController
      include Pagy::Method

      PER_PAGE = 25
      MAX_PER_PAGE = 100

      # The directory: search, filters, sorting and paging (ADR 0016).
      def index
        scope = Employees::DirectoryQuery.new(params.permit(:q, :country, :department_id, :job_title_id, :status, :sort)).call
        pagy, employees = pagy(:offset, scope, limit: per_page)

        render json: {
          data: employees.map { |employee| EmployeeSerializer.new(employee).as_json },
          meta: { page: pagy.page, per_page: pagy.limit, total_count: pagy.count, total_pages: pagy.last }
        }
      end

      private

      # Pagy's own per_page parsing lets a negative value through (and then raises),
      # so we read it here: missing, zero, negative or junk means the default.
      def per_page
        requested = params[:per_page].to_i
        requested.positive? ? [ requested, MAX_PER_PAGE ].min : PER_PAGE
      end
    end
  end
end
