module Seeds
  # Writes the seed to the database (ADR 0015): reference data first, then employees and their
  # salary history in bulk. Safe to run again: it never duplicates or wipes data.
  class Runner
    BATCH_SIZE = 1_000
    EMPLOYEE_COLUMNS = %i[full_name email hire_date status terminated_on current_salary current_currency].freeze

    DEMO_USER_EMAIL = "hr@acme.test".freeze
    # A demo value for local use. Set DEMO_USER_PASSWORD on the deployed demo.
    DEFAULT_DEMO_PASSWORD = "horizon-demo-2026".freeze

    def initialize(count: 10_000, seed: 42, today: Date.current, out: $stdout,
                   demo_password: ENV.fetch("DEMO_USER_PASSWORD", DEFAULT_DEMO_PASSWORD))
      @count = count
      @seed = seed
      @today = today
      @out = out
      @demo_password = demo_password
    end

    def call
      seed_reference_data
      seed_demo_user

      if Employee.exists?
        @out.puts "Employees already seeded (#{Employee.count}), skipping. Use bin/rails db:reset for a fresh start."
        return
      end

      started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      employees = EmployeeGenerator.new(count: @count, seed: @seed, today: @today).call
      ActiveRecord::Base.transaction { insert_employees(employees) }
      seconds = Process.clock_gettime(Process::CLOCK_MONOTONIC) - started

      @out.puts format("Seeded %<employees>d employees and %<revisions>d salary revisions in %<seconds>.1fs.",
                       employees: Employee.count, revisions: SalaryRevision.count, seconds:)
    end

    private

    # Upsert so re-running refreshes names and rates; lookups that already exist are skipped.
    def seed_reference_data
      Country.upsert_all(ReferenceData::COUNTRIES.map { |c| c.slice(:code, :name, :currency_code) }, unique_by: :code)
      ExchangeRate.upsert_all(
        ReferenceData::EXCHANGE_RATES.map { |code, rate| { currency_code: code, rate_to_usd: rate, as_of: ReferenceData::EXCHANGE_RATES_AS_OF } },
        unique_by: :currency_code
      )
      Department.insert_all(ReferenceData::DEPARTMENTS.map { |name| { name: } })
      JobTitle.insert_all(ReferenceData::JOB_TITLES.map { |title| title.slice(:name) })
    end

    # The single persona from the brief (ADR 0010) and one HR Manager who can log in.
    def seed_demo_user
      Persona.upsert_all([ { key: Persona::HR_MANAGER, name: "HR Manager",
                             description: "Manages employee and salary data for the whole company" } ],
                         unique_by: :key)
      User.find_or_create_by!(email_address: DEMO_USER_EMAIL) do |user|
        user.name = "Asha Rao"
        user.password = @demo_password
        user.persona = Persona.find_by!(key: Persona::HR_MANAGER)
      end
    end

    def insert_employees(employees)
      country_ids = Country.pluck(:code, :id).to_h
      department_ids = Department.pluck(:name, :id).to_h
      job_title_ids = JobTitle.pluck(:name, :id).to_h

      employees.each_slice(BATCH_SIZE) do |batch|
        rows = batch.map do |employee|
          employee.slice(*EMPLOYEE_COLUMNS).merge(
            country_id: country_ids.fetch(employee[:country_code]),
            department_id: department_ids.fetch(employee[:department]),
            job_title_id: job_title_ids.fetch(employee[:job_title])
          )
        end

        # Map by email rather than trusting RETURNING to keep insert order.
        ids_by_email = Employee.insert_all!(rows, returning: %i[id email]).rows.to_h { |id, email| [ email, id ] }
        revision_rows = batch.flat_map do |employee|
          employee[:revisions].map { |revision| revision.merge(employee_id: ids_by_email.fetch(employee[:email])) }
        end
        revision_rows.each_slice(BATCH_SIZE) { |slice| SalaryRevision.insert_all!(slice) }
      end
    end
  end
end
