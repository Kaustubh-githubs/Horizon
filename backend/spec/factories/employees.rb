FactoryBot.define do
  factory :employee do
    sequence(:full_name) { |n| "Employee #{n}" }
    sequence(:email) { |n| "employee#{n}@acme.test" }
    hire_date { Date.new(2024, 1, 15) }
    country
    department
    job_title
    current_salary { "1200000.00" }
    current_currency { country.currency_code }

    trait :terminated do
      status { "terminated" }
      terminated_on { Date.new(2026, 6, 30) }
    end
  end
end
