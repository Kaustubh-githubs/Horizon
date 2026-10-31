module Api
  module V1
    # The fixed lists the UI needs for filters and dropdowns, in one request.
    class LookupsController < Api::BaseController
      def show
        render json: {
          countries: Country.order(:name).map { |c| { id: c.id, code: c.code, name: c.name, currency_code: c.currency_code } },
          departments: Department.order(:name).map do |d|
            { id: d.id, name: d.name, job_title_ids: titles_by_department.fetch(d.id, []) }
          end,
          job_titles: JobTitle.order(:name).map { |t| { id: t.id, name: t.name } }
        }
      end

      private

      # The job titles held in each department, by anyone current or former, so the title filter
      # offers only those for a picked department (ADR 0019). Titles don't belong to a department
      # in the data model (ADR 0003), so this is who actually holds them. One DISTINCT query.
      def titles_by_department
        @titles_by_department ||= Employee.distinct.pluck(:department_id, :job_title_id)
                                          .group_by(&:first).transform_values { |pairs| pairs.map(&:last).sort }
      end
    end
  end
end
