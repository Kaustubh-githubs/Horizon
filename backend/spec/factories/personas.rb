FactoryBot.define do
  factory :persona do
    sequence(:key) { |n| "persona_#{('a'.ord + n % 26).chr * 2}" }
    sequence(:name) { |n| "Persona #{n}" }

    trait :hr_manager do
      key { Persona::HR_MANAGER }
      name { "HR Manager" }
    end
  end
end
