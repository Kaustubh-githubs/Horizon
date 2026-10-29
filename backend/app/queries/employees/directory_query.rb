module Employees
  # Search, filters and sorting for the employee directory. Returns a relation, so paging
  # stays separate. Associations are preloaded so a page is a fixed number of queries.
  class DirectoryQuery
    STATUSES = %w[active terminated all].freeze
    # Only these columns can be sorted on, so `sort` can never inject SQL.
    SORTABLE = %w[full_name employee_code hire_date current_salary].freeze
    DEFAULT_SORT = "full_name".freeze

    def initialize(params = {})
      @params = params.to_h.symbolize_keys
    end

    def call
      scope = Employee.includes(:country, :department, :job_title)
      scope = filter_status(scope)
      scope = scope.joins(:country).where(countries: { code: @params[:country].upcase }) if @params[:country].present?
      scope = scope.where(department_id: @params[:department_id]) if @params[:department_id].present?
      scope = scope.where(job_title_id: @params[:job_title_id]) if @params[:job_title_id].present?
      scope = search(scope) if @params[:q].present?
      sort(scope)
    end

    private

    # Active employees by default; "terminated" or "all" on request.
    def filter_status(scope)
      status = STATUSES.include?(@params[:status]) ? @params[:status] : "active"
      status == "all" ? scope : scope.where(status:)
    end

    # Case-insensitive "contains" on name, email or code. % and _ typed by the user are matched literally.
    def search(scope)
      term = "%#{Employee.sanitize_sql_like(@params[:q].strip)}%"
      scope.where("employees.full_name ILIKE :term OR employees.email ILIKE :term OR employees.employee_code ILIKE :term",
                  term:)
    end

    # "hire_date" sorts ascending, "-hire_date" descending. Anything else gets the default sort.
    # The id breaks ties so pages never overlap.
    def sort(scope)
      requested = @params[:sort].to_s
      column = requested.delete_prefix("-")
      return scope.order(DEFAULT_SORT => :asc, id: :asc) unless SORTABLE.include?(column)

      scope.order(column => requested.start_with?("-") ? :desc : :asc, id: :asc)
    end
  end
end
