module Insights
  # Pay by segment (ADR 0019). `by` picks the rows (country, department, job title or tenure band);
  # the filters narrow who's counted, in any combination. For each row: headcount, lowest, 25th
  # percentile, median, 75th percentile, average and highest pay, and total payroll, for active
  # employees.
  #
  # Currency: figures for one country (filtered to it) are in its own currency, exactly. Across
  # countries they're converted to the reporting currency (INR). Rows by country do both: each in
  # its own currency, plus its figures in INR, so countries can be compared on one chart.
  class SegmentStatsQuery
    SEGMENTS = %w[country department job_title tenure].freeze

    # `filters` (Insights::Filters) are the page's, shared with every other part of it.
    def initialize(by: "country", filters: Filters.new)
      @by = SEGMENTS.include?(by.to_s) ? by.to_s : "country"
      @filters = filters
      @country = filters.country
    end

    def call
      {
        by: @by,
        filters: @filters.to_h,
        currency: currency,
        converted: converted?,
        rates_as_of: Insights.rates_as_of,
        excluded_currencies: (converted? || by_country?) ? Insights.excluded_currencies(scope) : [],
        rows: @by == "tenure" ? with_every_band(rows) : rows
      }
    end

    private

    # Across countries, unless filtered to one country or showing countries side by side.
    def converted?
      @country.nil? && !by_country?
    end

    def by_country?
      @by == "country"
    end

    def currency
      if @country then @country.currency_code
      elsif converted? then REPORTING_CURRENCY
      end
    end

    def scope
      @filters.apply(Employee.active)
    end

    def rows
      return country_rows if by_country?

      key, label = segment_sql
      relation = converted? ? Insights.with_rates(scope) : scope
      value = converted? ? CONVERTED_SALARY : "employees.current_salary"

      relation.joins(segment_join).group(Arel.sql(key), Arel.sql(label)).order(Arel.sql(label))
              .pluck(Arel.sql(key), Arel.sql(label), *Insights.aggregates(value))
              .map { |key_value, label_value, *stats| row(key_value, label_value, currency, stats) }
    end

    def country_rows
      in_reporting = Insights.with_rates(scope).group("employees.country_id")
                             .pluck("employees.country_id", *Insights.aggregates(CONVERTED_SALARY))
                             .to_h { |id, *stats| [ id, STATS.zip(stats).to_h ] }

      scope.joins(:country).group("countries.id", "countries.code", "countries.name", "countries.currency_code")
           .order("countries.name")
           .pluck("countries.id", "countries.code", "countries.name", "countries.currency_code",
                  *Insights.aggregates("employees.current_salary"))
           .map do |id, code, name, currency_code, *stats|
             converted = in_reporting[id]
             row(code, name, currency_code, stats).merge(
               converted: converted && { currency: REPORTING_CURRENCY }.merge(
                 converted.slice(:p25, :median, :p75, :payroll).transform_values { |value| MoneyString.from(value) }
               )
             )
           end
    end

    def row(key, label, currency, stats)
      figures = STATS.zip(stats).to_h
      { key:, label:, currency:, headcount: figures[:headcount] }
        .merge(figures.except(:headcount).transform_values { |value| MoneyString.from(value) })
    end

    # [group key, label] SQL for each segment.
    def segment_sql
      case @by
      when "department" then [ "departments.id", "departments.name" ]
      when "job_title" then [ "job_titles.id", "job_titles.name" ]
      when "tenure" then [ tenure_sql, tenure_sql ]
      end
    end

    def segment_join
      { "department" => :department, "job_title" => :job_title }.fetch(@by, [])
    end

    # The band key for each hire date: "under_1" for under a year ago, and so on. It matches
    # Filters.hired_range exactly, so grouping by tenure and filtering by it agree.
    def tenure_sql
      @tenure_sql ||= begin
        branches = Filters::TENURE_BANDS.filter_map do |key, _label, _from, to|
          Employee.sanitize_sql_array([ "WHEN employees.hire_date > ? THEN ?", Date.current - to.years, key ]) if to
        end
        "CASE #{branches.join(' ')} ELSE '#{Filters::TENURE_BANDS.last.first}' END"
      end
    end

    # Every band in order, including empty ones, so the chart's axis never changes shape.
    def with_every_band(found)
      by_key = found.index_by { |r| r[:key] }
      Filters::TENURE_BANDS.map do |key, label, _from, _to|
        by_key[key]&.merge(label:) || row(key, label, currency, [ 0 ])
      end
    end
  end
end
