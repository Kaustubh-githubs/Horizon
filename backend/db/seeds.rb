# Seeds reference data and 10,000 employees with salary history (ADR 0015).
# Safe to run again: it skips employees if any exist. Use bin/rails db:reset for a fresh start.
# SEED_EMPLOYEES overrides the count, e.g. SEED_EMPLOYEES=500 bin/rails db:seed
Seeds::Runner.new(count: Integer(ENV.fetch("SEED_EMPLOYEES", 10_000))).call
