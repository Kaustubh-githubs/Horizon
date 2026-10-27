require "rails_helper"

RSpec.describe Department, type: :model do
  it_behaves_like "a lookup with a unique name", :department
end
