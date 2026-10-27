module Seeds
  # Writes the seed to the database (ADR 0015): reference data first, then employees and their
  # salary history in bulk. Safe to run again: it never duplicates or wipes data.
  class Runner
    BATCH_SIZE = 1_000
    EMPLOYEE_COLUMNS = %i[full_name email hire_date status terminated_on current_salary current_currency].freeze

    def initialize(count: 10_000, seed: 42, today: Date.current, out: $stdout)
      @count = count
      @seed = seed
      @today = today
      @out = out
    end

    def call
      seed_reference_data

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
