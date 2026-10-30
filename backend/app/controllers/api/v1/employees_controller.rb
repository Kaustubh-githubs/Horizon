module Api
  module V1
    class EmployeesController < Api::BaseController
      include Pagy::Method

      PER_PAGE = 25
      MAX_PER_PAGE = 100
      # Country and hire date are fixed after creation, and salary has its own endpoint (ADR 0017).
      EDITABLE = %i[full_name email department_id job_title_id].freeze

      # The directory: search, filters, sorting and paging (ADR 0016).
      def index
        scope = Employees::DirectoryQuery.new(params.permit(:q, :country, :department_id, :job_title_id, :status, :sort)).call
        pagy, employees = pagy(:offset, scope, limit: per_page)

        render json: {
          data: employees.map { |employee| EmployeeSerializer.new(employee).as_json },
          meta: { page: pagy.page, per_page: pagy.limit, total_count: pagy.count, total_pages: pagy.last }
        }
      end

      def show
        render json: EmployeeSerializer.new(Employee.includes(:country, :department, :job_title).find(params[:id]))
      end

      def create
        employee = Employees::Create.new(
          params.permit(*EDITABLE, :hire_date, :country_id, :current_salary)
        ).call

        render json: EmployeeSerializer.new(employee), status: :created
      end

      # The client sends the lock_version it loaded. If someone saved since, this raises
      # StaleObjectError and the client gets a 409 instead of overwriting their change.
      def update
        employee = Employee.find(params[:id])
        employee.update!(params.permit(*EDITABLE).merge(lock_version: params.require(:lock_version)))

        render json: EmployeeSerializer.new(employee)
      end

      private

      # Pagy's own per_page parsing lets a negative value through (and then raises),
      # so we read it here: missing, zero, negative or junk means the default. to_s first,
      # because per_page[]=1 arrives as an Array and per_page[a]=1 as a Hash.
      def per_page
        requested = params[:per_page].to_s.to_i
        requested.positive? ? [ requested, MAX_PER_PAGE ].min : PER_PAGE
      end
    end
  end
end
