require "rails_helper"

RSpec.describe "PATCH /api/v1/employees/:id", type: :request do
  let(:employee) { create(:employee, full_name: "Asha Rao") }

  before { sign_in }

  def update_employee(params)
    patch "/api/v1/employees/#{employee.id}", params:, as: :json
  end

  it "saves the change and returns the new lock_version", :aggregate_failures do
    update_employee(full_name: "Asha R. Rao", lock_version: 0)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include("full_name" => "Asha R. Rao", "lock_version" => 1)
  end

  it "answers 409 when someone else saved first, and keeps their change", :aggregate_failures do
    employee.update!(full_name: "Asha Rao-Mehta")

    update_employee(full_name: "Asha R. Rao", lock_version: 0)

    expect(response).to have_http_status(:conflict)
    expect(employee.reload.full_name).to eq("Asha Rao-Mehta")
  end

  it "answers 400 without a lock_version, so the conflict check can't be skipped", :aggregate_failures do
    update_employee(full_name: "Asha R. Rao")

    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body).to eq("errors" => { "lock_version" => [ "is required" ] })
  end

  it "doesn't change the country, hire date or salary" do
    update_employee(country_id: create(:country).id, hire_date: "2020-01-01", current_salary: "1", lock_version: 0)

    expect(employee.reload).to have_attributes(country_id: employee.country_id, hire_date: employee.hire_date,
                                               current_salary: employee.current_salary)
  end

  it "answers 404 for an unknown employee" do
    patch "/api/v1/employees/0", params: { full_name: "Asha R. Rao", lock_version: 0 }, as: :json

    expect(response).to have_http_status(:not_found)
  end

  # Two saves racing can both pass the model's uniqueness check; the database index stops the
  # second. Skipping validation here plays the part of the save that lost the race.
  it "answers 422 on the email field when a duplicate email reaches the database", :aggregate_failures do
    create(:employee, email: "taken@acme.test")
    allow(Employee).to receive(:find).and_return(employee)
    allow(employee).to receive(:valid?).and_return(true)

    update_employee(email: "taken@acme.test", lock_version: 0)

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body).to eq("errors" => { "email" => [ "has already been taken" ] })
  end

  it "answers 422 for a terminated employee" do
    employee.terminate!(on: Date.current)

    update_employee(full_name: "Asha R. Rao", lock_version: employee.lock_version)

    expect(response).to have_http_status(:unprocessable_content)
  end
end
