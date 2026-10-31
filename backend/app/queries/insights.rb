# Pay insights (ADR 0019). The query objects in app/queries/insights do all the maths in SQL;
# this module holds what they share: the reporting currency and how pay is converted into it.
module Insights
  # Figures across countries are converted to this currency (ADR 0007, 0019).
  REPORTING_CURRENCY = "INR".freeze

  # The figures `aggregates` returns, in order.
  STATS = %i[headcount min p25 median p75 mean max payroll].freeze

  # An employee's salary in the reporting currency. Needs the joins from `with_rates`.
  CONVERTED_SALARY = "employees.current_salary * own_rate.rate_to_usd / reporting_rate.rate_to_usd".freeze

  class << self
    # Adds the two rates that convert each salary to the reporting currency (rates are USD per
    # unit). Employees whose currency has no rate drop out; `excluded_currencies` names them.
    def with_rates(scope)
      scope
        .joins("JOIN exchange_rates own_rate ON own_rate.currency_code = employees.current_currency")
        .joins(ExchangeRate.sanitize_sql_array(
          [ "JOIN exchange_rates reporting_rate ON reporting_rate.currency_code = ?", REPORTING_CURRENCY ]
        ))
    end

    # Currencies in `scope` that can't be converted, so the UI can say who is left out.
    def excluded_currencies(scope)
      currencies = scope.distinct.order(:current_currency).pluck(:current_currency)
      return currencies unless ExchangeRate.exists?(currency_code: REPORTING_CURRENCY)

      currencies - ExchangeRate.where(currency_code: currencies).pluck(:currency_code)
    end

    def rates_as_of
      ExchangeRate.maximum(:as_of)
    end

    # SQL for headcount, lowest, 25th percentile, median, 75th percentile, average, highest and
    # total of `value`, in that order (STATS names them).
    def aggregates(value)
      percentile = ->(fraction) { "PERCENTILE_CONT(#{fraction}) WITHIN GROUP (ORDER BY #{value})" }
      [ "COUNT(*)", "MIN(#{value})", percentile.(0.25), percentile.(0.5), percentile.(0.75), "AVG(#{value})",
        "MAX(#{value})", "SUM(#{value})" ].map { |sql| Arel.sql(sql) }
    end
  end
end
