module Budgets
  # This year's budgets (ADR 0020): each department's yearly payroll of active staff, converted to
  # INR, against its budget, plus the combined figure for the departments that have one. Three
  # small queries; the maths is per department, in Ruby.
  class OverviewQuery
    # Fixed status bands, in % of the budget used.
    OVER_ABOVE = 100
    NEAR_FROM = 90

    def call
      rows = Department.order(:name).map { |department| row_for(department) }
      {
        year: DepartmentBudget.current_year,
        currency: DepartmentBudget::CURRENCY,
        rates_as_of: Insights.rates_as_of,
        excluded_currencies: Insights.excluded_currencies(Employee.active),
        total: total(rows.select(&:budget), unbudgeted: rows.count { |row| row.budget.nil? }),
        departments: rows.map { |row| row_json(row) }
      }
    end

    private

    # One department: its budget for this year, if any, and its active staff.
    Row = Struct.new(:department, :budget, :headcount, :payroll, keyword_init: true)

    def row_for(department)
      Row.new(department:, budget: budgets[department.id], headcount: headcounts.fetch(department.id, 0),
              payroll: payrolls.fetch(department.id, 0).to_d)
    end

    def budgets
      @budgets ||= DepartmentBudget.where(year: DepartmentBudget.current_year).index_by(&:department_id)
    end

    # Everyone active counts, even when their pay can't be converted.
    def headcounts
      @headcounts ||= Employee.active.group(:department_id).count
    end

    # Pay in INR. Employees whose currency has no rate drop out (`excluded_currencies` names them).
    def payrolls
      @payrolls ||= Insights.with_rates(Employee.active).group(:department_id)
                            .sum(Arel.sql(Insights::CONVERTED_SALARY))
    end

    def row_json(row)
      budget = row.budget
      {
        id: row.department.id,
        name: row.department.name,
        headcount: row.headcount,
        payroll: MoneyString.from(row.payroll),
        budget: budget && { id: budget.id, amount: MoneyString.from(budget.amount), lock_version: budget.lock_version },
        **comparison(row.payroll, budget&.amount)
      }
    end

    def total(budgeted, unbudgeted:)
      payroll = budgeted.sum(&:payroll)
      budget = budgeted.sum { |row| row.budget.amount }
      {
        unbudgeted_departments: unbudgeted,
        payroll: MoneyString.from(payroll),
        budget: budgeted.any? ? MoneyString.from(budget) : nil,
        **comparison(payroll, budgeted.any? ? budget : nil)
      }
    end

    # % used, status and runway for a payroll against a budget; no status without a budget. The
    # status is decided on the % as shown (one decimal), so the label and the number always agree.
    def comparison(payroll, budget)
      return { utilisation_percent: nil, status: "no_budget", runway_months: nil } unless budget

      percent = (payroll / budget * 100).round(1)
      {
        utilisation_percent: percent.to_f,
        status: band(percent),
        # Months of the year the budget covers at today's monthly payroll; none without payroll.
        runway_months: payroll.positive? ? (12 * budget / payroll).round(1).to_f : nil
      }
    end

    def band(percent)
      if percent > OVER_ABOVE then "over"
      elsif percent >= NEAR_FROM then "near"
      else "under"
      end
    end
  end
end
