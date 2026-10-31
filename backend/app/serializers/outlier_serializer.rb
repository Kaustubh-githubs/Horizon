# One row of the ★ list (ADR 0019): the employee, their pay, and how far it is from their peers'
# median. The record comes from Insights::OutliersQuery, which adds peer_median, peer_count and
# deviation_percent.
class OutlierSerializer
  def initialize(employee)
    @employee = employee
  end

  def as_json(*)
    {
      employee: { id: @employee.id, employee_code: @employee.employee_code, full_name: @employee.full_name },
      country: { code: @employee.country.code, name: @employee.country.name },
      job_title: { id: @employee.job_title_id, name: @employee.job_title.name },
      salary: @employee.current_salary.to_s("F"),
      currency: @employee.current_currency,
      peer_median: MoneyString.from(@employee.peer_median),
      peer_count: @employee.peer_count,
      deviation_percent: @employee.deviation_percent.to_d.round(1).to_f
    }
  end
end
