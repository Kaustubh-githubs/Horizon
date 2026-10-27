FactoryBot.define do
  factory :country do
    # Two-letter codes AA, AB, ... keep each record unique without colliding with real ones in specs.
    sequence(:code) { |n| [ ("A".ord + (n / 26) % 26).chr, ("A".ord + n % 26).chr ].join }
    sequence(:name) { |n| "Country #{n}" }
    currency_code { "USD" }
  end
end
