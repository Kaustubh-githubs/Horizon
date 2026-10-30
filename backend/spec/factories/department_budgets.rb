FactoryBot.define do
  factory :department_budget do
    department
    year { Date.current.year }
    amount { "10000000.00" }
  end
end
