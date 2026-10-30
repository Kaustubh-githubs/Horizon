module Insights
  # Salary changes effective in the last 12 months, by reason (ADR 0019): how many, the average %
  # change, and how much they added to yearly pay, converted to the reporting currency (INR).
  #
  # Each change is compared with the same employee's previous salary, found with a LAG window
  # over their whole history (the previous one may be older than 12 months). Hires aren't
  # changes. People who have since left are included: their changes still happened.
  class PayChangesQuery
    def call
      since = Date.current - 1.year

      {
        since:,
        currency: REPORTING_CURRENCY,
        rates_as_of: Insights.rates_as_of,
        excluded_currencies: changes(since).where.not(currency: ExchangeRate.select(:currency_code))
                                            .distinct.order(:currency).pluck(:currency),
        rows: summarise(changes(since).group(:reason).order(:reason), :reason)
                .map { |reason, *figures| { reason:, **figures(*figures) } },
        total: figures(*summarise(changes(since), nil).first || [ 0 ])
      }
    end

    private

    # Each revision with its employee's previous amount. The window runs over every revision,
    # before the date filter, so the first change in the window still has its previous salary.
    def with_previous
      SalaryRevision.select(
        "salary_revisions.*",
        "LAG(amount) OVER (PARTITION BY employee_id ORDER BY effective_from, id) AS previous_amount"
      )
    end

    def changes(since)
      SalaryRevision.from(with_previous, :salary_revisions)
                    .where.not(reason: "hire").where.not(previous_amount: nil)
                    .where("effective_from > ?", since)
    end

    def summarise(relation, group)
      change = "(salary_revisions.amount - salary_revisions.previous_amount)"
      converted = "#{change} * own_rate.rate_to_usd / reporting_rate.rate_to_usd"
      relation
        .joins("JOIN exchange_rates own_rate ON own_rate.currency_code = salary_revisions.currency")
        .joins(ExchangeRate.sanitize_sql_array(
          [ "JOIN exchange_rates reporting_rate ON reporting_rate.currency_code = ?", REPORTING_CURRENCY ]
        ))
        .pluck(*[ group && Arel.sql("salary_revisions.#{group}"),
                  Arel.sql("COUNT(*)"),
                  Arel.sql("AVG(#{change} / salary_revisions.previous_amount * 100)"),
                  Arel.sql("SUM(#{converted})") ].compact)
    end

    def figures(count, average = nil, cost = nil)
      { count:, average_percent: average&.to_d&.round(1)&.to_f, yearly_cost: Insights.money(cost) }
    end
  end
end
