# The JSON shape of a department budget after it's set or changed (ADR 0020). Money is a
# string (ADR 0006); lock_version lets the next change detect a conflict (ADR 0017).
class DepartmentBudgetSerializer
  def initialize(budget)
    @budget = budget
  end

  def as_json(*)
    {
      id: @budget.id,
      department_id: @budget.department_id,
      year: @budget.year,
      amount: @budget.amount.to_s("F"),
      currency: DepartmentBudget::CURRENCY,
      lock_version: @budget.lock_version
    }
  end
end
