module Api
  module V1
    # The insights dashboard (ADR 0019): headline numbers, pay by segment, and who has a ★.
    class InsightsController < Api::BaseController
      include Pagy::Method

      def overview
        render json: ::Insights::OverviewQuery.new.call
      end

      def segments
        render json: ::Insights::SegmentStatsQuery.new(by: scalar_param(:by), country_code: scalar_param(:country)).call
      end

      def outliers
        query = ::Insights::OutliersQuery.new(threshold: scalar_param(:threshold), direction: scalar_param(:direction),
                                              country_code: scalar_param(:country))
        pagy, employees = pagy(:offset, query.call, limit: per_page)

        render json: {
          data: employees.map { |employee| outlier_json(employee) },
          meta: { page: pagy.page, per_page: pagy.limit, total_count: pagy.count, total_pages: pagy.last,
                  threshold: query.threshold }
        }
      end

      private

      def outlier_json(employee)
        {
          employee: { id: employee.id, employee_code: employee.employee_code, full_name: employee.full_name },
          country: { code: employee.country.code, name: employee.country.name },
          job_title: { id: employee.job_title_id, name: employee.job_title.name },
          salary: employee.current_salary.to_s("F"),
          currency: employee.current_currency,
          peer_median: ::Insights.money(employee.peer_median),
          peer_count: employee.peer_count,
          deviation_percent: employee.deviation_percent.to_d.round(1).to_f
        }
      end
    end
  end
end
