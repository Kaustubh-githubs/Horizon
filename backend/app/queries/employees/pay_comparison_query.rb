module Employees
  # What an employee's peers earn: active employees with the same job title in the same country,
  # not counting the employee themself (ADR 0018). Shown next to a salary change so an unusual
  # number stands out. `job_title_id` swaps in another title, e.g. the new one for a promotion.
  # One aggregate query on the (country_id, job_title_id) index.
  class PayComparisonQuery
    def initialize(employee, job_title_id: nil)
      @employee = employee
      @job_title = job_title_id.present? ? JobTitle.find(job_title_id) : employee.job_title
    end

    def call
      count, average, median = peers.pick(
        Arel.sql("COUNT(*)"),
        Arel.sql("AVG(current_salary)"),
        Arel.sql("PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY current_salary)")
      )

      {
        country: { code: @employee.country.code, name: @employee.country.name },
        job_title: { id: @job_title.id, name: @job_title.name },
        currency: @employee.current_currency,
        peer_count: count,
        average: money(average),
        median: money(median)
      }
    end

    private

    def peers
      Employee.active.where(country_id: @employee.country_id, job_title_id: @job_title.id).where.not(id: @employee.id)
    end

    # AVG comes back as a decimal and PERCENTILE_CONT as a float; both become money strings (ADR 0006).
    def money(value)
      value&.to_d&.round(2)&.to_s("F")
    end
  end
end
