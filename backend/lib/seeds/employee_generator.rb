require "faker"

module Seeds
  # Builds employee and salary-history rows as plain hashes, with no database access (ADR 0015).
  # The same seed and `today` always give exactly the same rows.
  class EmployeeGenerator
    UNDERPAID_SHARE = 0.03
    TERMINATED_SHARE = 0.08
    MAX_CHANGES_AFTER_HIRE = 4
    HIRED_DAYS_AGO = 30..3_650 # hired between ~1 month and ~10 years ago

    # Faker locale per country. Japan and the UAE use English-script names so every name
    # can be searched and sorted in one alphabet.
    NAME_LOCALES = {
      "IN" => "en-IND", "US" => "en-US", "GB" => "en-GB", "DE" => "de",
      "SG" => "en-SG", "AE" => "en", "BR" => "pt-BR", "JP" => "en"
    }.freeze

    # [reason, share of changes, raise range]
    CHANGE_TYPES = [
      [ "annual_raise", 0.70, 0.03..0.10 ],
      [ "promotion", 0.15, 0.10..0.20 ],
      [ "market_adjustment", 0.15, 0.05..0.12 ]
    ].freeze

    ZERO_DECIMAL_CURRENCIES = %w[JPY].freeze

    def initialize(count:, seed:, today:)
      @count = count
      @random = Random.new(seed)
      @today = today
    end

    def call
      with_seeded_faker { Array.new(@count) { |index| build_employee(index) } }
    end

    private

    def build_employee(index)
      country = weighted_pick(ReferenceData::COUNTRIES, :headcount_weight)
      title = weighted_pick(ReferenceData::JOB_TITLES, :weight)
      first_name, last_name = name_for(country[:code])
      hire_date = @today - @random.rand(HIRED_DAYS_AGO)
      underpaid = @random.rand < UNDERPAID_SHARE
      revisions = salary_history(country, title, hire_date, underpaid)
      terminated_on = (@random.rand(revisions.last[:effective_from]..@today) if @random.rand < TERMINATED_SHARE)

      {
        full_name: "#{first_name} #{last_name}",
        email: "#{"#{first_name}.#{last_name}".parameterize(separator: ".")}.#{index + 1}@acme.test",
        hire_date:,
        status: terminated_on ? "terminated" : "active",
        terminated_on:,
        country_code: country[:code],
        department: title[:department],
        job_title: title[:name],
        current_salary: revisions.last[:amount],
        current_currency: country[:currency_code],
        underpaid:,
        revisions:
      }
    end

    def salary_history(country, title, hire_date, underpaid)
      currency = country[:currency_code]
      amount = round(hire_amount(country, title, underpaid), currency)
      revisions = [ revision(amount, currency, hire_date, "hire") ]

      change_dates(hire_date).each do |date|
        reason, _share, raise_range = weighted_pick(CHANGE_TYPES, 1)
        amount = round(amount * (1 + @random.rand(raise_range)), currency)
        revisions << revision(amount, currency, date, reason)
      end

      revisions
    end

    # Title band (USD) x country cost factor, converted to local currency.
    def hire_amount(country, title, underpaid)
      rate = BigDecimal(ReferenceData::EXCHANGE_RATES.fetch(country[:currency_code]))
      factor = BigDecimal(country[:cost_factor].to_s)
      band_min = title[:band_usd].min * factor / rate
      band_max = title[:band_usd].max * factor / rate

      if underpaid
        band_min * BigDecimal(@random.rand(0.60..0.75).to_s)
      else
        (band_min + (band_max - band_min) * BigDecimal(@random.rand.to_s)) * BigDecimal(@random.rand(0.85..1.15).to_s)
      end
    end

    def change_dates(hire_date)
      days_employed = (@today - hire_date).to_i
      Array.new(@random.rand(0..MAX_CHANGES_AFTER_HIRE)) { hire_date + @random.rand(1..days_employed) }.sort
    end

    def revision(amount, currency, effective_from, reason)
      { amount:, currency:, effective_from:, reason: }
    end

    def round(amount, currency)
      BigDecimal(amount.to_s).round(ZERO_DECIMAL_CURRENCIES.include?(currency) ? 0 : 2)
    end

    # rows: an array of hashes or tuples; weight: the hash key or tuple index holding the weight.
    def weighted_pick(rows, weight)
      target = @random.rand * rows.sum { |row| row[weight] }
      rows.find { |row| (target -= row[weight]).negative? } || rows.last
    end

    def name_for(country_code)
      Faker::Config.locale = NAME_LOCALES.fetch(country_code)
      [ Faker::Name.first_name, Faker::Name.last_name ]
    end

    # Faker keeps global settings, so point it at our seeded Random and restore it afterwards.
    def with_seeded_faker
      previous_random, previous_locale = Faker::Config.random, Faker::Config.locale
      Faker::Config.random = @random
      yield
    ensure
      Faker::Config.random = previous_random
      Faker::Config.locale = previous_locale
    end
  end
end
