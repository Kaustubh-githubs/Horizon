require "rails_helper"

# A login lasts 2 weeks without use and 30 days at most (ADR 0009).
RSpec.describe "Session lifetime", type: :request do
  before { sign_in }

  def current_user_status
    get "/api/v1/session"
    response.status
  end

  it "keeps a session in use, however often it's used within the idle limit", :aggregate_failures do
    travel 13.days
    expect(current_user_status).to eq(200)
    travel 13.days
    expect(current_user_status).to eq(200)
  end

  it "signs out a session left unused for 2 weeks, and deletes it", :aggregate_failures do
    travel 2.weeks + 1.minute

    expect(current_user_status).to eq(401)
    expect(Session.count).to eq(0)
  end

  it "signs out after 30 days even when the session is used every week", :aggregate_failures do
    4.times do
      travel 7.days
      expect(current_user_status).to eq(200)
    end
    travel 3.days

    expect(current_user_status).to eq(401)
  end

  it "gives the cookie the session's 30-day limit instead of keeping it for years" do
    expires = Time.zone.parse(response.headers["Set-Cookie"][/expires=([^;]+)/i, 1])

    expect(expires).to be_within(1.minute).of(30.days.from_now)
  end

  it "clears out other expired sessions when someone signs in" do
    travel 31.days
    expect { sign_in }.not_to change(Session, :count) # one expired removed, one new added
  end
end
