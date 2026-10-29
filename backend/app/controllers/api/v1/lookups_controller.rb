module Api
  module V1
    # The fixed lists the UI needs for filters and dropdowns, in one request.
    class LookupsController < Api::BaseController
      def show
        render json: {
          countries: Country.order(:name).map { |c| { code: c.code, name: c.name, currency_code: c.currency_code } },
          departments: Department.order(:name).map { |d| { id: d.id, name: d.name } },
          job_titles: JobTitle.order(:name).map { |t| { id: t.id, name: t.name } }
        }
      end
    end
  end
end
