module Insights
  # Who is paid far from their peers (ADR 0019). Peers are active employees with the same job
  # title in the same country. Someone gets a ★ when their pay is at least `threshold`% below or
  # above the peers' median, in a group of at least MIN_PEERS (smaller groups are too small to
  # judge). The median includes the person: with five or more, they barely move it.
  class OutliersQuery
    DEFAULT_THRESHOLD = 40
    THRESHOLDS = 20..50
    MIN_PEERS = 5
    DIRECTIONS = %w[all below above].freeze
    DISTANCE = "ABS(employees.current_salary - peers.peer_median) / peers.peer_median".freeze

    attr_reader :threshold

    # `filters` (Insights::Filters, the page's) choose whose stars are listed. Peers are still
    # everyone in the role and country, so a filter never changes who counts as far from the median.
    def initialize(threshold: DEFAULT_THRESHOLD, direction: "all", filters: Filters.new)
      requested = threshold.to_s.to_i
      @threshold = THRESHOLDS.cover?(requested) ? requested : DEFAULT_THRESHOLD
      @direction = DIRECTIONS.include?(direction.to_s) ? direction.to_s : "all"
      @filters = filters
    end

    # Active employees with a ★, furthest from their median first. Each record also has
    # `peer_median`, `peer_count` and `deviation_percent` (negative means below the median).
    def call
      scope = self.class.with_peers(@filters.apply(Employee.active))
                  .where("peers.peer_count >= ?", MIN_PEERS)
                  .where("#{DISTANCE} >= ?", BigDecimal(@threshold) / 100)
      scope = scope.where("employees.current_salary < peers.peer_median") if @direction == "below"
      scope = scope.where("employees.current_salary > peers.peer_median") if @direction == "above"
      scope.includes(:country, :job_title).order(Arel.sql("#{DISTANCE} DESC"), :id)
    end

    # `scope` joined to each employee's peer group: its median and size. `groups` narrows which
    # groups are worked out, e.g. just one employee's, instead of every country and job title.
    def self.with_peers(scope, groups: Employee.all)
      peers = groups.active.group(:country_id, :job_title_id).select(
        :country_id, :job_title_id,
        "PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY current_salary) AS peer_median", "COUNT(*) AS peer_count"
      )
      scope
        .joins("JOIN (#{peers.to_sql}) peers ON peers.country_id = employees.country_id " \
               "AND peers.job_title_id = employees.job_title_id")
        .select("employees.*", "peers.peer_median", "peers.peer_count",
                "(employees.current_salary - peers.peer_median) / peers.peer_median * 100 AS deviation_percent")
    end

    # How one employee compares with their peers, for the banner on their profile.
    def self.position(employee, threshold: DEFAULT_THRESHOLD)
      group = Employee.where(country_id: employee.country_id, job_title_id: employee.job_title_id)
      found = with_peers(Employee.active.where(id: employee.id), groups: group).first
      exact = found&.deviation_percent&.to_d
      enough_peers = found.present? && found.peer_count >= MIN_PEERS

      {
        # The exact difference, as the list's SQL compares it: rounding first would flag someone at
        # 39.96% here while the list leaves them out. It's rounded only for display.
        flagged: enough_peers && exact.abs >= threshold,
        enough_peers:,
        direction: (exact.negative? ? "below" : "above" if exact&.nonzero?),
        deviation_percent: exact&.round(1)&.to_f,
        peer_median: MoneyString.from(found&.peer_median),
        peer_count: found&.peer_count || 0,
        threshold:,
        currency: employee.current_currency,
        job_title: employee.job_title.name,
        country: employee.country.name
      }
    end
  end
end
