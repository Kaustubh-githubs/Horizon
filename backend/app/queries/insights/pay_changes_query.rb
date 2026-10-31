module Insights
  # Salary changes effective in the last 12 months, by reason (ADR 0019): how many, the average %
  # change, and how much they added to yearly pay. One country is in its own currency; otherwise
  # amounts are converted to the reporting currency (INR).
  #
  # Each change is compared with the same employee's previous salary, found with a LAG window
  # over their whole history (the previous one may be older than 12 months). Hires aren't
  # changes. People who have since left are included: their changes still happened. The page's
  # filters match each person's current country, department, job title and tenure, because past
  # ones aren't kept (ADR 0003).
  class PayChangesQuery
    # Each change's raise in its own currency, and what it adds to yearly pay in the page's
    # currency: the same amount, or converted to the reporting currency across countries.
    CHANGE = "(salary_revisions.amount - salary_revisions.previous_amount)".freeze
    CONVERTED_CHANGE = "#{CHANGE} * own_rate.rate_to_usd / reporting_rate.rate_to_usd".freeze

    def initialize(filters: Filters.new)
      @filters = filters
    end

    def call
      since = Date.current - 1.year

      {
        since:,
        filters: @filters.to_h,
        currency: @filters.currency,
        converted: @filters.converted?,
        rates_as_of: Insights.rates_as_of,
        excluded_currencies: excluded_currencies(since),
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
      relation = SalaryRevision.from(with_previous, :salary_revisions)
                               .where.not(reason: "hire").where.not(previous_amount: nil)
                               .where("effective_from > ?", since)
      @filters.any? ? relation.where(employee_id: @filters.apply(Employee.all).select(:id)) : relation
    end

    # Only converted figures can leave anyone out.
    def excluded_currencies(since)
      return [] unless @filters.converted?

      changes(since).where.not(currency: ExchangeRate.select(:currency_code)).distinct.order(:currency).pluck(:currency)
    end

    def summarise(relation, group)
      cost = @filters.converted? ? CONVERTED_CHANGE : CHANGE
      relation = with_change_rates(relation) if @filters.converted?
      relation.pluck(*[ group && Arel.sql("salary_revisions.#{group}"),
                        Arel.sql("COUNT(*)"),
                        Arel.sql("AVG(#{CHANGE} / salary_revisions.previous_amount * 100)"),
                        Arel.sql("SUM(#{cost})") ].compact)
    end

    # The rates that convert each change's currency to the reporting currency (rates are USD per unit).
    def with_change_rates(relation)
      relation
        .joins("JOIN exchange_rates own_rate ON own_rate.currency_code = salary_revisions.currency")
        .joins(ExchangeRate.sanitize_sql_array(
          [ "JOIN exchange_rates reporting_rate ON reporting_rate.currency_code = ?", REPORTING_CURRENCY ]
        ))
    end

    def figures(count, average = nil, cost = nil)
      { count:, average_percent: average&.to_d&.round(1)&.to_f, yearly_cost: MoneyString.from(cost) }
    end
  end
end
