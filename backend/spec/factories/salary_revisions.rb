FactoryBot.define do
  factory :salary_revision do
    employee
    amount { "1200000.00" }
    currency { employee.current_currency }
    effective_from { employee.hire_date }
    reason { "hire" }
  end
end
