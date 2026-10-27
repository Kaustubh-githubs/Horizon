FactoryBot.define do
  factory :job_title do
    sequence(:name) { |n| "Job Title #{n}" }
  end
end
