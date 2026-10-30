require "rails_helper"

RSpec.describe SalaryRevisions::Create do
  let(:india) { create(:country, code: "IN", currency_code: "INR") }
  let(:engineer) { create(:job_title, name: "Software Engineer") }
  let(:senior_engineer) { create(:job_title, name: "Senior Software Engineer") }
  let(:employee) { create(:employee, country: india, job_title: engineer, current_salary: "1200000") }

  def change(**overrides)
    described_class.new(employee:, amount: "1300000", reason: "annual_raise", lock_version: employee.lock_version,
                        **overrides).call
  end

  it "records the change effective today, in the country's currency" do
    expect(change).to be_persisted.and have_attributes(amount: 1_300_000, currency: "INR", reason: "annual_raise",
                                                        effective_from: Date.current)
  end

  it "makes the new amount the employee's current salary" do
    change

    expect(employee.reload.current_salary).to eq(1_300_000)
  end

  it "allows a lower salary, whatever the reason" do
    change(amount: "1100000", reason: "market_adjustment")

    expect(employee.reload.current_salary).to eq(1_100_000)
  end

  it "allows a second change on the same day, which becomes the current salary" do
    change
    change(amount: "1250000", reason: "correction", lock_version: employee.reload.lock_version)

    expect(employee.reload.current_salary).to eq(1_250_000)
  end

  describe "rules" do
    it "rejects an amount equal to the current salary" do
      expect { change(amount: "1200000") }
        .to raise_error(ActiveRecord::RecordInvalid, /must be different from the current salary/)
    end

    it "rejects the hire reason, which is only for adding an employee" do
      expect { change(reason: "hire") }
        .to raise_error(ActiveRecord::RecordInvalid, /isn't used for a salary change/)
    end

    it "rejects a change for a former employee and leaves their salary alone", :aggregate_failures do
      employee.terminate!(on: Date.current)

      expect { change }.to raise_error(ActiveRecord::RecordInvalid, /Former employees/)
      expect(employee.reload.current_salary).to eq(1_200_000)
    end
  end

  # The revision and the employee are written in one transaction (ADR 0004, 0018).
  it "saves nothing when someone else changed the employee first", :aggregate_failures do
    loaded_version = employee.lock_version
    employee.update!(full_name: "Asha Rao-Mehta")

    expect { change(lock_version: loaded_version) }.to raise_error(ActiveRecord::StaleObjectError)
    expect(SalaryRevision.where(employee:)).to be_empty
    expect(employee.reload.current_salary).to eq(1_200_000)
  end

  describe "promotion" do
    it "moves the employee to the new job title together with the new pay" do
      change(reason: "promotion", job_title_id: senior_engineer.id)

      expect(employee.reload).to have_attributes(job_title_id: senior_engineer.id, current_salary: 1_300_000)
    end

    it "requires a job title different from the current one" do
      expect { change(reason: "promotion", job_title_id: engineer.id) }
        .to raise_error(ActiveRecord::RecordInvalid, /must be a new job title for a promotion/)
    end

    it "requires a job title" do
      expect { change(reason: "promotion") }
        .to raise_error(ActiveRecord::RecordInvalid, /must be a new job title for a promotion/)
    end

    it "is the only reason that can change the job title" do
      expect { change(job_title_id: senior_engineer.id) }
        .to raise_error(ActiveRecord::RecordInvalid, /only changes with a promotion/)
    end
  end
end
