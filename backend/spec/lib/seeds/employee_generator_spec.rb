require "rails_helper"

# Pure Ruby: builds employee and salary-history rows without touching the database (ADR 0015).
RSpec.describe Seeds::EmployeeGenerator do
  subject(:employees) { generate(seed: 42) }

  let(:today) { Date.new(2026, 10, 28) }
  let(:reference) { Seeds::ReferenceData }

  def generate(seed:, count: 1_000)
    described_class.new(count:, seed:, today:).call
  end

  def share(rows, &condition)
    rows.count(&condition).fdiv(rows.size)
  end

  # The employee's pay band converted to local currency (title band x country factor / rate).
  def local_band(employee)
    country = reference::COUNTRIES.find { |c| c[:code] == employee[:country_code] }
    band = reference::JOB_TITLES.find { |t| t[:name] == employee[:job_title] }[:band_usd]
    rate = BigDecimal(reference::EXCHANGE_RATES.fetch(country[:currency_code]))

    (band.min * country[:cost_factor] / rate)..(band.max * country[:cost_factor] / rate)
  end

  describe "repeatability" do
    it "returns the requested number of employees" do
      expect(employees.size).to eq(1_000)
    end

    it "returns exactly the same rows for the same seed" do
      expect(generate(seed: 42)).to eq(employees)
    end

    it "returns different rows for a different seed" do
      expect(generate(seed: 7)).not_to eq(employees)
    end
  end

  describe "employees" do
    it "gives every employee a unique email" do
      emails = employees.pluck(:email)

      expect(emails.uniq.size).to eq(emails.size)
    end

    it "only uses countries and job titles from the reference data", :aggregate_failures do
      expect(employees.pluck(:country_code).uniq - reference::COUNTRIES.pluck(:code)).to be_empty
      expect(employees.pluck(:job_title).uniq - reference::JOB_TITLES.pluck(:name)).to be_empty
    end

    it "puts each employee in their job title's department" do
      departments = reference::JOB_TITLES.to_h { |t| [ t[:name], t[:department] ] }

      expect(employees).to all(satisfy { |e| e[:department] == departments[e[:job_title]] })
    end

    it "roughly follows the country headcount weights (India about 40%)" do
      expect(share(employees) { |e| e[:country_code] == "IN" }).to be_within(0.05).of(0.40)
    end

    it "pays everyone in their country's currency" do
      currencies = reference::COUNTRIES.to_h { |c| [ c[:code], c[:currency_code] ] }

      expect(employees).to all(satisfy { |e| e[:current_currency] == currencies[e[:country_code]] })
    end
  end

  describe "salary history" do
    it "starts every history with a hire revision on the hire date" do
      expect(employees).to all(satisfy { |e|
        e[:revisions].first.values_at(:reason, :effective_from) == [ "hire", e[:hire_date] ]
      })
    end

    it "adds between 0 and 4 changes after hire" do
      expect(employees.map { |e| e[:revisions].size }.uniq).to all(be_between(1, 5))
    end

    it "dates every revision between the hire date and today, in order" do
      expect(employees).to all(satisfy { |e|
        dates = e[:revisions].pluck(:effective_from)
        dates == dates.sort && dates.first >= e[:hire_date] && dates.last <= today
      })
    end

    it "only ever raises pay after hire" do
      expect(employees).to all(satisfy { |e|
        amounts = e[:revisions].pluck(:amount)
        amounts.each_cons(2).all? { |before, after| after > before }
      })
    end

    it "uses the latest revision as the current salary" do
      expect(employees).to all(satisfy { |e| e[:current_salary] == e[:revisions].last[:amount] })
    end

    it "rounds every amount to two decimal places" do
      amounts = employees.flat_map { |e| e[:revisions].pluck(:amount) }

      expect(amounts).to all(satisfy { |amount| amount == amount.round(2) })
    end
  end

  describe "pay bands and planted outliers" do
    let(:underpaid) { employees.select { |e| e[:underpaid] } }

    it "hires everyone else within 15% of their local band" do
      expect(employees.reject { |e| e[:underpaid] }).to all(satisfy { |e|
        band = local_band(e)
        e[:revisions].first[:amount].between?(band.min * 0.85, band.max * 1.15)
      })
    end

    it "marks about 3% of employees as underpaid" do
      expect(share(employees) { |e| e[:underpaid] }).to be_within(0.01).of(0.03)
    end

    it "hires the underpaid at least 25% below the bottom of their band" do
      expect(underpaid).to all(satisfy { |e| e[:revisions].first[:amount] <= local_band(e).min * 0.75 })
    end
  end

  describe "terminations" do
    let(:terminated) { employees.select { |e| e[:status] == "terminated" } }

    it "terminates about 8% of employees" do
      expect(share(employees) { |e| e[:status] == "terminated" }).to be_within(0.03).of(0.08)
    end

    it "dates each termination after the last salary change and no later than today" do
      expect(terminated).to all(satisfy { |e| e[:terminated_on].between?(e[:revisions].last[:effective_from], today) })
    end

    it "leaves active employees without a termination date" do
      expect(employees.reject { |e| e[:status] == "terminated" }.pluck(:terminated_on)).to all(be_nil)
    end
  end
end
