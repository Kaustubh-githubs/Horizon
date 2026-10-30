module Insights
  # Pay by segment: country, department, job title or tenure band (ADR 0019). For each one:
  # headcount, lowest, median, average and highest pay, and total payroll, for active employees.
  #
  # Currency: one country's figures are in its own currency, exactly. Across countries they're
  # converted to the reporting currency (INR). The country view does both: each row in its own
  # currency, plus its median and payroll in INR, so countries can be compared on a chart.
  class SegmentStatsQuery
    SEGMENTS = %w[country department job_title tenure].freeze
    # [key, label, from years, to years]: tenure is worked out from the hire date.
    TENURE_BANDS = [
      [ "under_1", "Under 1 year", 0, 1 ], [ "1_3", "1–3 years", 1, 3 ], [ "3_5", "3–5 years", 3, 5 ],
      [ "5_10", "5–10 years", 5, 10 ], [ "10_plus", "10+ years", 10, nil ]
    ].freeze

    def initialize(by: "country", country_code: nil)
      @by = SEGMENTS.include?(by.to_s) ? by.to_s : "country"
      @country = Country.find_by!(code: country_code.to_s.upcase) if country_code.present?
    end

    def call
      {
        by: @by,
        country: @country && { code: @country.code, name: @country.name },
        currency: currency,
        converted: converted?,
        rates_as_of: Insights.rates_as_of,
        excluded_currencies: converted? || @by == "country" ? Insights.excluded_currencies(scope) : [],
        rows: @by == "tenure" ? with_every_band(rows) : rows
      }
    end

    private

    # Across countries, unless filtered to one country or showing countries side by side.
    def converted?
      @country.nil? && @by != "country"
    end

    def currency
      if @country then @country.currency_code
      elsif converted? then REPORTING_CURRENCY
      end
    end

    def scope
      employees = Employee.active
      @country ? employees.where(country: @country) : employees
    end

    def rows
      return country_rows if @by == "country"

      key, label = segment_sql
      relation = converted? ? Insights.with_rates(scope) : scope
      value = converted? ? CONVERTED_SALARY : "employees.current_salary"

      relation.joins(segment_join).group(Arel.sql(key), Arel.sql(label)).order(Arel.sql(label))
              .pluck(Arel.sql(key), Arel.sql(label), *Insights.aggregates(value))
              .map { |key_value, label_value, *stats| row(key_value, label_value, currency, stats) }
    end

    def country_rows
      in_reporting = Insights.with_rates(scope).group("employees.country_id")
                             .pluck("employees.country_id", *Insights.aggregates(CONVERTED_SALARY).values_at(2, 5))
                             .to_h { |id, median, payroll| [ id, { median:, payroll: } ] }

      scope.joins(:country).group("countries.id", "countries.code", "countries.name", "countries.currency_code")
           .order("countries.name")
           .pluck("countries.id", "countries.code", "countries.name", "countries.currency_code",
                  *Insights.aggregates("employees.current_salary"))
           .map do |id, code, name, currency_code, *stats|
             converted = in_reporting[id]
             row(code, name, currency_code, stats).merge(
               converted: converted && { currency: REPORTING_CURRENCY, median: Insights.money(converted[:median]),
                                         payroll: Insights.money(converted[:payroll]) }
             )
           end
    end

    def row(key, label, currency, (headcount, min, median, mean, max, payroll))
      { key:, label:, currency:, headcount:, min: Insights.money(min), median: Insights.money(median),
        mean: Insights.money(mean), max: Insights.money(max), payroll: Insights.money(payroll) }
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

    # The band key for each hire date: "under_1" for under a year ago, and so on (today is UTC, ADR 0017).
    def tenure_sql
      @tenure_sql ||= begin
        branches = TENURE_BANDS.filter_map do |key, _label, _from, to|
          Employee.sanitize_sql_array([ "WHEN employees.hire_date > ? THEN ?", Date.current - to.years, key ]) if to
        end
        "CASE #{branches.join(' ')} ELSE '#{TENURE_BANDS.last.first}' END"
      end
    end

    # Every band in order, including empty ones, so the chart's axis never changes shape.
    def with_every_band(found)
      by_key = found.index_by { |r| r[:key] }
      TENURE_BANDS.map do |key, label, _from, _to|
        by_key[key]&.merge(label:) || row(key, label, currency, [ 0, nil, nil, nil, nil, nil ])
      end
    end
  end
end
