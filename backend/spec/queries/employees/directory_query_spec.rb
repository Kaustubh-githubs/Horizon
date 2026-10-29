require "rails_helper"

RSpec.describe Employees::DirectoryQuery do
  let(:india) { create(:country, code: "IN", name: "India", currency_code: "INR") }
  let(:us) { create(:country, code: "US", name: "United States", currency_code: "USD") }
  let(:engineering) { create(:department, name: "Engineering") }

  def names(params = {})
    described_class.new(params).call.map(&:full_name)
  end

  describe "status" do
    before do
      create(:employee, full_name: "Asha Rao")
      create(:employee, :terminated, full_name: "Ravi Kumar")
    end

    it "lists active employees by default" do
      expect(names).to eq([ "Asha Rao" ])
    end

    it "lists terminated employees on request" do
      expect(names(status: "terminated")).to eq([ "Ravi Kumar" ])
    end

    it "lists everyone with status=all" do
      expect(names(status: "all")).to eq([ "Asha Rao", "Ravi Kumar" ])
    end

    it "accepts the status in any case" do
      expect(names(status: "Terminated")).to eq([ "Ravi Kumar" ])
    end
  end

  describe "filters" do
    before do
      create(:employee, full_name: "Asha Rao", country: india, department: engineering)
      create(:employee, full_name: "John Smith", country: us)
    end

    it "filters by country code, ignoring case" do
      expect(names(country: "in")).to eq([ "Asha Rao" ])
    end

    it "filters by department" do
      expect(names(department_id: engineering.id)).to eq([ "Asha Rao" ])
    end

    it "filters by job title" do
      title = Employee.find_by!(full_name: "John Smith").job_title

      expect(names(job_title_id: title.id)).to eq([ "John Smith" ])
    end
  end

  describe "search" do
    before do
      create(:employee, full_name: "Asha Rao", email: "asha.rao@acme.test")
      create(:employee, full_name: "John Smith", email: "john@acme.test")
    end

    it "matches part of a name, ignoring case" do
      expect(names(q: "RAO")).to eq([ "Asha Rao" ])
    end

    it "matches part of an email" do
      expect(names(q: "john@")).to eq([ "John Smith" ])
    end

    it "matches the employee code" do
      code = Employee.find_by!(full_name: "John Smith").employee_code

      expect(names(q: code.downcase)).to eq([ "John Smith" ])
    end

    it "treats % and _ as plain characters, not wildcards" do
      expect(names(q: "%")).to be_empty
    end
  end

  describe "sorting" do
    before do
      create(:employee, full_name: "Bina", hire_date: Date.new(2022, 1, 1))
      create(:employee, full_name: "Asha", hire_date: Date.new(2024, 1, 1))
      create(:employee, full_name: "Chen", hire_date: Date.new(2020, 1, 1))
    end

    it "sorts by name by default" do
      expect(names).to eq(%w[Asha Bina Chen])
    end

    it "sorts descending with a minus sign" do
      expect(names(sort: "-hire_date")).to eq(%w[Asha Bina Chen])
    end

    it "ignores a column that isn't allowed and falls back to name" do
      expect(names(sort: "password_digest; DROP TABLE employees")).to eq(%w[Asha Bina Chen])
    end

    it "uses the default ascending order for a disallowed column, even with a minus sign" do
      expect(names(sort: "-password_digest")).to eq(%w[Asha Bina Chen])
    end

    it "sorts employee codes by number, not as text, once they pass six digits" do
      create(:employee, id: 1_000_000, full_name: "Million")
      create(:employee, id: 100_001, full_name: "Hundred thousand")

      expect(names(sort: "-employee_code").first(2)).to eq([ "Million", "Hundred thousand" ])
    end
  end
end
