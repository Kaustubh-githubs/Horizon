require "rails_helper"

# The line above the directory and the counts in its Country and Department filters (ADR 0019).
# The total follows the list's own search and filters. Each option's count ignores its own filter,
# like any faceted search, so picking India still shows how many are in the other countries.
RSpec.describe Employees::DirectorySummaryQuery do
  let(:india) { create(:country, code: "IN", name: "India") }
  let(:us) { create(:country, code: "US", name: "United States") }
  let(:engineering) { create(:department, name: "Engineering") }
  let(:sales) { create(:department, name: "Sales") }

  before do
    create(:employee, full_name: "Asha Rao", country: india, department: engineering)
    create(:employee, full_name: "Ravi Nair", country: india, department: sales)
    create(:employee, full_name: "Meera Nair", country: india, department: engineering)
    create(:employee, full_name: "John Smith", country: us, department: engineering)
    create(:employee, :terminated, full_name: "Old Nair", country: us, department: sales)
  end

  def summary(params = {})
    described_class.new(params).call
  end

  it "counts the active employees, and each country and department, largest first" do
    expect(summary).to eq(
      total: 4, country_count: 2, department_count: 2,
      countries: [ { code: "IN", name: "India", count: 3 }, { code: "US", name: "United States", count: 1 } ],
      departments: [ { id: engineering.id, name: "Engineering", count: 3 }, { id: sales.id, name: "Sales", count: 1 } ]
    )
  end

  it "follows the list's search", :aggregate_failures do
    result = summary(q: "nair")

    expect(result).to include(total: 2, country_count: 1)
    expect(result[:countries]).to eq([ { code: "IN", name: "India", count: 2 } ])
  end

  it "counts other countries as if the country filter were off, keeping the rest", :aggregate_failures do
    result = summary(country: "in", department_id: engineering.id)

    expect(result).to include(total: 2, country_count: 1, department_count: 1)
    expect(result[:countries]).to eq([ { code: "IN", name: "India", count: 2 },
                                       { code: "US", name: "United States", count: 1 } ])
    expect(result[:departments]).to eq([ { id: engineering.id, name: "Engineering", count: 2 },
                                         { id: sales.id, name: "Sales", count: 1 } ])
  end

  it "follows the list's status, and breaks ties in count by name" do
    expect(summary(country: "us", status: "all")).to include(
      total: 2, departments: [ { id: engineering.id, name: "Engineering", count: 1 }, { id: sales.id, name: "Sales", count: 1 } ]
    )
  end
end
