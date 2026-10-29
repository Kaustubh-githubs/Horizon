module Employees
  # Search, filters and sorting for the employee directory. Returns a relation, so paging
  # stays separate. Associations are preloaded so a page is a fixed number of queries.
  class DirectoryQuery
    STATUSES = (Employee.statuses.keys + %w[all]).freeze
    # Only these columns can be sorted on, so `sort` can never inject SQL. The employee code
    # is built from the id, so sorting by id gives the same order, and stays right once the
    # code grows past six digits (where sorting the text would put EMP-1000000 first).
    SORTABLE = {
      "full_name" => :full_name,
      "employee_code" => :id,
      "hire_date" => :hire_date,
      "current_salary" => :current_salary
    }.freeze

    def initialize(params = {})
      @params = params.to_h.symbolize_keys
    end

    def call
      scope = Employee.includes(:country, :department, :job_title)
      scope = filter_status(scope)
      scope = filter_country(scope) if @params[:country].present?
      scope = scope.where(department_id: @params[:department_id]) if @params[:department_id].present?
      scope = scope.where(job_title_id: @params[:job_title_id]) if @params[:job_title_id].present?
      scope = search(scope) if @params[:q].present?
      sort(scope)
    end

    private

    # Active employees by default; "terminated" or "all" on request, in any case.
    def filter_status(scope)
      status = @params[:status].to_s.downcase
      status = "active" unless STATUSES.include?(status)
      status == "all" ? scope : scope.where(status:)
    end

    # A subquery rather than a join, so the associations are still preloaded in separate
    # small queries and the count stays a plain COUNT(*).
    def filter_country(scope)
      scope.where(country_id: Country.where(code: @params[:country].upcase).select(:id))
    end

    # Case-insensitive "contains" on name, email or code. % and _ typed by the user are matched literally.
    def search(scope)
      term = "%#{Employee.sanitize_sql_like(@params[:q].strip)}%"
      scope.where("employees.full_name ILIKE :term OR employees.email ILIKE :term OR employees.employee_code ILIKE :term",
                  term:)
    end

    # "hire_date" sorts ascending, "-hire_date" descending. Anything else gets the default sort
    # (name, ascending). The id breaks ties so pages never overlap.
    def sort(scope)
      requested = @params[:sort].to_s
      column = SORTABLE[requested.delete_prefix("-")]
      return scope.order(full_name: :asc, id: :asc) unless column

      order = { column => requested.start_with?("-") ? :desc : :asc }
      order[:id] ||= :asc # the tie-breaker, unless id is already the sort column
      scope.order(order)
    end
  end
end
