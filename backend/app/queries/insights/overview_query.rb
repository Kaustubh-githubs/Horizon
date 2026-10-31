module Insights
  # The headline numbers (ADR 0019): headcount, and payroll, median and average pay, plus how many
  # people have a ★, for the page's filters (the whole org when there are none). One country is in
  # its own currency; otherwise figures are converted to the reporting currency (INR).
  class OverviewQuery
    def initialize(filters: Filters.new)
      @filters = filters
    end

    def call
      active = @filters.apply(Employee.active)
      converted = @filters.converted?
      relation = converted ? Insights.with_rates(active) : active
      value = converted ? CONVERTED_SALARY : "employees.current_salary"
      stats = STATS.zip(relation.pick(*Insights.aggregates(value)) || []).to_h
      median, mean, payroll = stats.values_at(:median, :mean, :payroll)

      {
        filters: @filters.to_h,
        currency: @filters.currency,
        converted:,
        rates_as_of: Insights.rates_as_of,
        excluded_currencies: converted ? Insights.excluded_currencies(active) : [],
        headcount: active.count,
        countries: active.distinct.count(:country_id),
        payroll: Insights.money(payroll),
        median: Insights.money(median),
        mean: Insights.money(mean),
        # count(:all): the outliers query selects extra columns, which a plain count would try to count.
        outlier_count: OutliersQuery.new(filters: @filters).call.count(:all),
        outlier_threshold: OutliersQuery::DEFAULT_THRESHOLD
      }
    end
  end
end
