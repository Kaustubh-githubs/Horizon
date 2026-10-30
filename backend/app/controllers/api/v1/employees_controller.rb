module Api
  module V1
    class EmployeesController < Api::BaseController
      include Pagy::Method

      # Country and hire date are fixed after creation, and salary has its own endpoint (ADR 0017).
      EDITABLE = %i[full_name email department_id job_title_id].freeze
      # The directory's search and filters, shared by the list and its summary cards.
      DIRECTORY_FILTERS = %i[q country department_id job_title_id status].freeze

      # The directory: search, filters, sorting and paging (ADR 0016).
      def index
        scope = Employees::DirectoryQuery.new(params.permit(*DIRECTORY_FILTERS, :sort)).call
        pagy, employees = pagy(:offset, scope, limit: per_page)

        render json: {
          data: employees.map { |employee| EmployeeSerializer.new(employee).as_json },
          meta: { page: pagy.page, per_page: pagy.limit, total_count: pagy.count, total_pages: pagy.last }
        }
      end

      # The cards above the directory: the same people, counted by country and department.
      def summary
        render json: Employees::DirectorySummaryQuery.new(params.permit(*DIRECTORY_FILTERS)).call
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
    end
  end
end
