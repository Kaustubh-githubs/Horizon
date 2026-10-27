FactoryBot.define do
  factory :exchange_rate do
    # Three-letter codes AAA, AAB, ... so each rate gets its own currency.
    sequence(:currency_code) { |n| [ "A", ("A".ord + (n / 26) % 26).chr, ("A".ord + n % 26).chr ].join }
    rate_to_usd { "0.012" }
    as_of { Date.new(2026, 10, 1) }
  end
end
