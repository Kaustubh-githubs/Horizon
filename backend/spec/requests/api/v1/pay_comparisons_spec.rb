require "rails_helper"

# What peers earn, shown in the change-salary dialog (ADR 0018): active employees with the
# same job title in the same country, not counting the employee themself.
RSpec.describe "GET /api/v1/employees/:id/pay_comparison", type: :request do
  let(:india) { create(:country, code: "IN", currency_code: "INR") }
  let(:engineer) { create(:job_title, name: "Software Engineer") }
  let(:senior_engineer) { create(:job_title, name: "Senior Software Engineer") }
  let(:employee) { create(:employee, country: india, job_title: engineer, current_salary: "9000000") }

  before do
    sign_in
    create(:employee, country: india, job_title: engineer, current_salary: "1000000")
    create(:employee, country: india, job_title: engineer, current_salary: "2000000")
    create(:employee, country: india, job_title: engineer, current_salary: "6000000")
    create(:employee, :terminated, country: india, job_title: engineer, current_salary: "50000000")
    create(:employee, country: india, job_title: senior_engineer, current_salary: "4000000")
  end

  it "compares with active peers in the same country and job title, leaving out the employee" do
    get "/api/v1/employees/#{employee.id}/pay_comparison"

    expect(response.parsed_body).to include("peer_count" => 3, "average" => "3000000.0", "median" => "2000000.0",
                                            "currency" => "INR", "job_title" => hash_including("name" => "Software Engineer"))
  end

  it "uses another job title when asked, for a promotion" do
    get "/api/v1/employees/#{employee.id}/pay_comparison", params: { job_title_id: senior_engineer.id }

    expect(response.parsed_body).to include("peer_count" => 1, "average" => "4000000.0",
                                            "job_title" => hash_including("name" => "Senior Software Engineer"))
  end

  it "answers 404 for an unknown job title" do
    get "/api/v1/employees/#{employee.id}/pay_comparison", params: { job_title_id: 0 }

    expect(response).to have_http_status(:not_found)
  end

  it "ignores a job_title_id that isn't a single value, instead of failing" do
    get "/api/v1/employees/#{employee.id}/pay_comparison?job_title_id[]=#{senior_engineer.id}"

    expect(response.parsed_body).to include("job_title" => hash_including("name" => "Software Engineer"))
  end

  it "says so when there are no peers" do
    get "/api/v1/employees/#{employee.id}/pay_comparison", params: { job_title_id: create(:job_title).id }

    expect(response.parsed_body).to include("peer_count" => 0, "average" => nil, "median" => nil)
  end
end
