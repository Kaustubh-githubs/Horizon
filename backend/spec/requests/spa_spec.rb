require "rails_helper"

# In production one image serves the React app and the API from one origin (ADR 0001, 0025).
# Rails answers every page the browser opens with the app's shell; the app routes from there.
RSpec.describe "The React app's pages", type: :request do
  let(:shell) { Rails.root.join("tmp", "spa_test.html") }

  before do
    shell.write("<!doctype html><div id=\"root\"></div>")
    stub_const("SpaController::SHELL", shell)
  end

  after { shell.delete if shell.exist? }

  def open_page(path)
    get path, headers: { "Accept" => "text/html" }
  end

  it "serves the shell at the root" do
    open_page "/"

    expect(response.body).to include("<div id=\"root\">")
  end

  it "serves the shell for the app's own routes, so a refresh or a shared link works", :aggregate_failures do
    open_page "/employees/42"

    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("text/html")
  end

  # Its JS and CSS have hashed names and are cached for a year; the shell must be fetched again,
  # so a deploy is picked up on the next page load.
  it "tells the browser not to reuse the shell without checking" do
    open_page "/insights"

    expect(response.headers["Cache-Control"]).to include("no-cache")
  end

  it "leaves unknown API paths to answer 404, not the shell" do
    open_page "/api/v1/nothing-here"

    expect(response).to have_http_status(:not_found)
  end

  it "answers 404 while the app hasn't been built (development, tests)" do
    stub_const("SpaController::SHELL", Rails.root.join("tmp", "missing.html"))
    open_page "/employees"

    expect(response).to have_http_status(:not_found)
  end
end
