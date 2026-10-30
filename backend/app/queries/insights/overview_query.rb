module Insights
  # The headline numbers for the whole org (ADR 0019): headcount, and payroll, median and
  # average pay converted to the reporting currency, plus how many people have a ★.
  class OverviewQuery
    def call
      active = Employee.active
      stats = STATS.zip(Insights.with_rates(active).pick(*Insights.aggregates(CONVERTED_SALARY)) || []).to_h
      median, mean, payroll = stats.values_at(:median, :mean, :payroll)

      {
        currency: REPORTING_CURRENCY,
        rates_as_of: Insights.rates_as_of,
        excluded_currencies: Insights.excluded_currencies(active),
        headcount: active.count,
        countries: active.distinct.count(:country_id),
        payroll: Insights.money(payroll),
        median: Insights.money(median),
        mean: Insights.money(mean),
        # count(:all): the outliers query selects extra columns, which a plain count would try to count.
        outlier_count: OutliersQuery.new.call.count(:all),
        outlier_threshold: OutliersQuery::DEFAULT_THRESHOLD
      }
    end
  end
end
