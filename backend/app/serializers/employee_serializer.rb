# The JSON shape of an employee (ADR 0016). Fields are listed explicitly, so nothing is
# exposed by accident. Money is a string, so JavaScript never turns it into a float (ADR 0006).
class EmployeeSerializer
  def initialize(employee)
    @employee = employee
  end

  def as_json(*)
    {
      id: @employee.id,
      employee_code: @employee.employee_code,
      full_name: @employee.full_name,
      email: @employee.email,
      hire_date: @employee.hire_date,
      status: @employee.status,
      terminated_on: @employee.terminated_on,
      country: { code: @employee.country.code, name: @employee.country.name },
      department: { id: @employee.department_id, name: @employee.department.name },
      job_title: { id: @employee.job_title_id, name: @employee.job_title.name },
      current_salary: @employee.current_salary.to_s("F"),
      current_currency: @employee.current_currency,
      lock_version: @employee.lock_version
    }
  end
end
