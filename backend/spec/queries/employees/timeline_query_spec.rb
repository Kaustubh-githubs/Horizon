require "rails_helper"

# An employee's story by date (ADR 0021): joining, salary changes from the salary history, department
# and title moves from the audit trail, work anniversaries and leaving. Newest first.
RSpec.describe Employees::TimelineQuery do
  let(:india) { create(:country, code: "IN", name: "India", currency_code: "INR") }
  let(:engineering) { create(:department, name: "Engineering") }
  let(:engineer) { create(:job_title, name: "Software Engineer") }

  # Audit rows saved together, as one request in the app saves them.
  def in_one_request
    Audited.store[:current_request_uuid] = SecureRandom.uuid
    yield
  ensure
    Audited.store.delete(:current_request_uuid)
  end

  def timeline(employee)
    described_class.new(employee.reload).call
  end

  def event(events, kind, date)
    events.find { |e| e[:kind] == kind && e[:date] == date }
  end

  describe "an employee loaded by the seed, then changed in the app" do
    let(:employee) do
      create(:employee, country: india, department: engineering, job_title: engineer,
                        hire_date: Date.new(2023, 1, 9), current_salary: "1320000")
    end
    let(:events) { timeline(employee) }

    before do
      travel_to Date.new(2026, 5, 1)
      # The seed's salary history, bulk-loaded without audits (ADR 0015).
      [ [ "1000000", Date.new(2023, 1, 9), "hire" ], [ "1100000", Date.new(2024, 4, 1), "annual_raise" ],
        [ "1320000", Date.new(2025, 4, 1), "promotion" ] ].each do |amount, effective_from, reason|
        create(:salary_revision, employee:, amount:, effective_from:, reason:)
      end
      Audited::Audit.delete_all

      travel_to Date.new(2026, 6, 15)
      in_one_request { employee.update!(department: create(:department, name: "Product")) }
      travel_to Date.new(2026, 9, 1)
      in_one_request do
        SalaryRevisions::Create.new(employee:, amount: "1500000", reason: "promotion", lock_version: employee.lock_version,
                                    job_title_id: create(:job_title, name: "Senior Software Engineer").id).call
      end
      travel_to Date.new(2026, 10, 30)
      in_one_request { employee.terminate!(on: Date.new(2026, 10, 30)) }
      travel_to Date.new(2026, 10, 31)
    end

    it "tells the story newest first" do
      expect(events.map { |e| [ e[:kind], e[:date] ] }).to eq([
        [ "ended", Date.new(2026, 10, 30) ], [ "promotion", Date.new(2026, 9, 1) ],
        [ "department", Date.new(2026, 6, 15) ], [ "anniversary", Date.new(2026, 1, 9) ],
        [ "promotion", Date.new(2025, 4, 1) ], [ "anniversary", Date.new(2025, 1, 9) ],
        [ "salary_change", Date.new(2024, 4, 1) ], [ "anniversary", Date.new(2024, 1, 9) ],
        [ "joined", Date.new(2023, 1, 9) ]
      ])
    end

    it "shows a salary change from the amount before it, with the %, the reason and when it was recorded" do
      expect(event(events, "salary_change", Date.new(2024, 4, 1))).to include(
        reason: "annual_raise", change_percent: 10.0, recorded_at: Time.utc(2026, 5, 1),
        changes: [ { field: "salary", from: "1000000.0", to: "1100000.0" } ]
      )
    end

    it "shows the old and new title of a promotion made in the app" do
      expect(event(events, "promotion", Date.new(2026, 9, 1))).to include(
        change_percent: 13.6,
        changes: [ { field: "job_title", from: "Software Engineer", to: "Senior Software Engineer" },
                   { field: "salary", from: "1320000.0", to: "1500000.0" } ]
      )
    end

    it "shows a seeded promotion's salary, without title names it never recorded" do
      expect(event(events, "promotion", Date.new(2025, 4, 1))).to include(
        change_percent: 20.0, changes: [ { field: "salary", from: "1100000.0", to: "1320000.0" } ]
      )
    end

    it "shows a department move on the day it was recorded" do
      expect(event(events, "department", Date.new(2026, 6, 15))).to include(
        changes: [ { field: "department", from: "Engineering", to: "Product" } ]
      )
    end

    it "starts with joining on the hire date, with the starting salary" do
      expect(event(events, "joined", Date.new(2023, 1, 9))).to include(
        changes: [ { field: "salary", from: nil, to: "1000000.0" } ]
      )
    end

    it "counts work anniversaries up to the last working day" do
      expect(events.select { |e| e[:kind] == "anniversary" }.pluck(:years)).to eq([ 3, 2, 1 ])
    end
  end

  it "shows the job title and department someone added in the app joined with" do
    travel_to Date.new(2026, 10, 31)
    employee = in_one_request do
      Employees::Create.new(full_name: "Ravi Kumar", email: "ravi@acme.test", hire_date: Date.new(2026, 10, 1),
                            country_id: india.id, department_id: engineering.id, job_title_id: engineer.id,
                            current_salary: "1200000").call
    end

    expect(timeline(employee)).to match([
      include(kind: "joined", date: Date.new(2026, 10, 1),
              changes: [ { field: "department", from: nil, to: "Engineering" },
                         { field: "job_title", from: nil, to: "Software Engineer" },
                         { field: "salary", from: nil, to: "1200000.0" } ])
    ])
  end

  it "shows a job title change made outside a promotion" do
    travel_to Date.new(2026, 10, 31)
    employee = create(:employee, job_title: engineer, hire_date: Date.new(2026, 10, 1))
    in_one_request { employee.update!(job_title: create(:job_title, name: "Data Engineer")) }

    expect(timeline(employee).first).to include(
      kind: "job_title", date: Date.new(2026, 10, 31),
      changes: [ { field: "job_title", from: "Software Engineer", to: "Data Engineer" } ]
    )
  end

  it "orders changes made on the same day by when they were recorded" do
    travel_to Time.utc(2026, 10, 31, 9, 0)
    employee = create(:employee, country: india, department: engineering, job_title: engineer,
                                 hire_date: Date.new(2026, 10, 1), current_salary: "1200000")
    in_one_request do
      SalaryRevisions::Create.new(employee:, amount: "1300000", reason: "annual_raise",
                                  lock_version: employee.lock_version).call
    end
    travel_to Time.utc(2026, 10, 31, 10, 0)
    in_one_request { employee.update!(department: create(:department, name: "Product")) }
    travel_to Time.utc(2026, 10, 31, 11, 0)
    in_one_request { employee.update!(job_title: create(:job_title, name: "Data Engineer")) }

    expect(timeline(employee).first(3).pluck(:kind)).to eq(%w[job_title department salary_change])
  end

  # Outside a web request (the console, a task) the gem gives each audit row its own request id.
  it "keeps a promotion's new title with it even when made outside a web request", :aggregate_failures do
    travel_to Date.new(2026, 10, 31)
    employee = create(:employee, job_title: engineer, hire_date: Date.new(2026, 10, 1), current_salary: "1200000")
    SalaryRevisions::Create.new(employee:, amount: "1500000", reason: "promotion", lock_version: employee.lock_version,
                                job_title_id: create(:job_title, name: "Senior Software Engineer").id).call

    events = timeline(employee)
    expect(events.pluck(:kind)).to eq(%w[promotion joined])
    expect(events.first[:changes]).to include({ field: "job_title", from: "Software Engineer",
                                                to: "Senior Software Engineer" })
  end

  it "lists a department and title changed in one save in a fixed order" do
    travel_to Date.new(2026, 10, 31)
    employee = create(:employee, department: engineering, job_title: engineer, hire_date: Date.new(2026, 10, 1))
    in_one_request do
      employee.update!(department: create(:department, name: "Data"), job_title: create(:job_title, name: "Data Engineer"))
    end

    expect(Array.new(5) { timeline(employee).first(2).pluck(:kind) }.uniq).to eq([ %w[department job_title] ])
  end

  it "counts anniversaries up to today for someone still employed" do
    travel_to Date.new(2026, 10, 31)
    employee = create(:employee, hire_date: Date.new(2024, 10, 31))

    expect(timeline(employee).select { |e| e[:kind] == "anniversary" }.pluck(:years, :date))
      .to eq([ [ 2, Date.new(2026, 10, 31) ], [ 1, Date.new(2025, 10, 31) ] ])
  end
end
