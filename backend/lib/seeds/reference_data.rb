module Seeds
  # Fixed lists the seed builds from (ADR 0015). Salaries are a job title's USD band
  # times the country's cost-of-living factor, converted to local currency.
  module ReferenceData
    # headcount_weight: % of employees per country (adds up to 100).
    # cost_factor: pay level relative to the US (1.0).
    COUNTRIES = [
      { code: "IN", name: "India",                currency_code: "INR", headcount_weight: 40, cost_factor: 0.28 },
      { code: "US", name: "United States",        currency_code: "USD", headcount_weight: 20, cost_factor: 1.00 },
      { code: "GB", name: "United Kingdom",       currency_code: "GBP", headcount_weight: 10, cost_factor: 0.80 },
      { code: "DE", name: "Germany",              currency_code: "EUR", headcount_weight: 8,  cost_factor: 0.80 },
      { code: "SG", name: "Singapore",            currency_code: "SGD", headcount_weight: 7,  cost_factor: 0.75 },
      { code: "AE", name: "United Arab Emirates", currency_code: "AED", headcount_weight: 5,  cost_factor: 0.70 },
      { code: "BR", name: "Brazil",               currency_code: "BRL", headcount_weight: 5,  cost_factor: 0.35 },
      { code: "JP", name: "Japan",                currency_code: "JPY", headcount_weight: 5,  cost_factor: 0.65 }
    ].freeze

    # Illustrative rates, not live market data (ADR 0007): value of 1 unit in USD.
    EXCHANGE_RATES_AS_OF = Date.new(2026, 10, 1)
    EXCHANGE_RATES = {
      "INR" => "0.012",
      "USD" => "1.0",
      "GBP" => "1.27",
      "EUR" => "1.08",
      "SGD" => "0.74",
      "AED" => "0.2723",
      "BRL" => "0.18",
      "JPY" => "0.0067"
    }.freeze

    DEPARTMENTS = %w[Engineering Product Design Sales Marketing Finance HR Operations].freeze

    # band_usd: annual base pay range at US level. weight: how common the title is.
    JOB_TITLES = [
      { name: "Software Engineer",                department: "Engineering", band_usd: 95_000..130_000,  weight: 30 },
      { name: "Senior Software Engineer",         department: "Engineering", band_usd: 130_000..175_000, weight: 20 },
      { name: "Staff Software Engineer",          department: "Engineering", band_usd: 170_000..220_000, weight: 5 },
      { name: "Engineering Manager",              department: "Engineering", band_usd: 165_000..215_000, weight: 5 },
      { name: "QA Engineer",                      department: "Engineering", band_usd: 75_000..105_000,  weight: 8 },
      { name: "Associate Product Manager",        department: "Product",     band_usd: 85_000..110_000,  weight: 3 },
      { name: "Product Manager",                  department: "Product",     band_usd: 115_000..155_000, weight: 5 },
      { name: "Senior Product Manager",           department: "Product",     band_usd: 150_000..195_000, weight: 3 },
      { name: "Product Designer",                 department: "Design",      band_usd: 85_000..120_000,  weight: 4 },
      { name: "Senior Product Designer",          department: "Design",      band_usd: 115_000..155_000, weight: 2 },
      { name: "Design Lead",                      department: "Design",      band_usd: 145_000..185_000, weight: 1 },
      { name: "Sales Development Representative", department: "Sales",       band_usd: 50_000..70_000,   weight: 8 },
      { name: "Account Executive",                department: "Sales",       band_usd: 70_000..110_000,  weight: 7 },
      { name: "Senior Account Executive",         department: "Sales",       band_usd: 100_000..140_000, weight: 4 },
      { name: "Sales Manager",                    department: "Sales",       band_usd: 120_000..165_000, weight: 2 },
      { name: "Marketing Associate",              department: "Marketing",   band_usd: 55_000..75_000,   weight: 4 },
      { name: "Content Strategist",               department: "Marketing",   band_usd: 65_000..90_000,   weight: 2 },
      { name: "Marketing Manager",                department: "Marketing",   band_usd: 90_000..125_000,  weight: 2 },
      { name: "Financial Analyst",                department: "Finance",     band_usd: 70_000..95_000,   weight: 3 },
      { name: "Senior Accountant",                department: "Finance",     band_usd: 75_000..100_000,  weight: 2 },
      { name: "Finance Manager",                  department: "Finance",     band_usd: 110_000..150_000, weight: 1 },
      { name: "HR Associate",                     department: "HR",          band_usd: 50_000..70_000,   weight: 2 },
      { name: "Talent Acquisition Specialist",    department: "HR",          band_usd: 60_000..85_000,   weight: 3 },
      { name: "HR Business Partner",              department: "HR",          band_usd: 85_000..115_000,  weight: 2 },
      { name: "HR Manager",                       department: "HR",          band_usd: 100_000..135_000, weight: 1 },
      { name: "Operations Associate",             department: "Operations",  band_usd: 45_000..65_000,   weight: 4 },
      { name: "IT Support Specialist",            department: "Operations",  band_usd: 50_000..75_000,   weight: 3 },
      { name: "Operations Manager",               department: "Operations",  band_usd: 90_000..125_000,  weight: 1 }
    ].freeze
  end
end
