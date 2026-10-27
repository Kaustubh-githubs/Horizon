require "rails_helper"

RSpec.describe JobTitle, type: :model do
  it_behaves_like "a lookup with a unique name", :job_title
end
