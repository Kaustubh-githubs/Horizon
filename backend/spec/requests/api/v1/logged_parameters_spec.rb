require "rails_helper"

# Salaries are personal data: they mustn't land in the logs, where far more people can read them
# than can use the app. Rails logs a request's parameters with these filtered.
RSpec.describe "Logged parameters", type: :request do
  before { sign_in }

  it "hides the salary of a new employee" do
    post "/api/v1/employees", params: { full_name: "Asha Rao", current_salary: "4500000" }, as: :json

    expect(request.filtered_parameters).to include("full_name" => "Asha Rao", "current_salary" => "[FILTERED]")
  end

  it "hides the amount of a salary change or a budget" do
    post "/api/v1/budgets", params: { department_id: 0, amount: "5000000" }, as: :json

    expect(request.filtered_parameters).to include("amount" => "[FILTERED]")
  end
end
