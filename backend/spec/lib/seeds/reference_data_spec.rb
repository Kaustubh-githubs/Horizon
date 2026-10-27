require "rails_helper"

# The seed's fixed lists. These checks catch a typo here before it becomes 10,000 bad rows.
RSpec.describe Seeds::ReferenceData do
  let(:currencies) { described_class::COUNTRIES.pluck(:currency_code).uniq }

  it "has a valid Country record for every country" do
    invalid = described_class::COUNTRIES.reject do |country|
      Country.new(country.slice(:code, :name, :currency_code)).valid?
    end

    expect(invalid).to be_empty
  end

  it "has an exchange rate for every country's currency" do
    expect(currencies - described_class::EXCHANGE_RATES.keys).to be_empty
  end

  it "has headcount weights that add up to 100" do
    expect(described_class::COUNTRIES.sum { |country| country[:headcount_weight] }).to eq(100)
  end

  it "gives every country a positive cost-of-living factor" do
    expect(described_class::COUNTRIES.pluck(:cost_factor)).to all(be > 0)
  end

  it "maps every job title to a known department" do
    expect(described_class::JOB_TITLES.pluck(:department).uniq - described_class::DEPARTMENTS).to be_empty
  end

  it "gives every department at least one job title" do
    expect(described_class::DEPARTMENTS - described_class::JOB_TITLES.pluck(:department)).to be_empty
  end

  it "gives every job title a pay band with a positive minimum below its maximum" do
    bands = described_class::JOB_TITLES.pluck(:band_usd)

    expect(bands).to all(satisfy { |band| band.min.positive? && band.min < band.max })
  end

  it "has no job titles that differ only by case" do
    names = described_class::JOB_TITLES.map { |title| title[:name].downcase }

    expect(names).to eq(names.uniq)
  end
end
