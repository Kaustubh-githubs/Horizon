module Insights
  # The filters the whole insights page shares (ADR 0019): country, department, job title and
  # tenure band, in any combination. Read and checked once: an unknown value raises
  # ActiveRecord::RecordNotFound, so a bad link is a 404 for every part of the page.
  class Filters
    # [key, label, from years, to years]: tenure is worked out from the hire date.
    TENURE_BANDS = [
      [ "under_1", "Under 1 year", 0, 1 ], [ "1_3", "1–3 years", 1, 3 ], [ "3_5", "3–5 years", 3, 5 ],
      [ "5_10", "5–10 years", 5, 10 ], [ "10_plus", "10+ years", 10, nil ]
    ].freeze

    attr_reader :country, :department, :job_title, :tenure

    def initialize(country_code: nil, department_id: nil, job_title_id: nil, tenure: nil)
      @country = Country.find_by!(code: country_code.to_s.upcase) if country_code.present?
      @department = Department.find(department_id) if department_id.present?
      @job_title = JobTitle.find(job_title_id) if job_title_id.present?
      @tenure = self.class.tenure_band!(tenure) if tenure.present?
    end

    def any?
      [ @country, @department, @job_title, @tenure ].any?
    end

    # `employees` narrowed to the filters. Status is the caller's choice: most figures count active
    # staff, while pay changes also count people who have since left.
    def apply(employees)
      employees = employees.where(country: @country) if @country
      employees = employees.where(department: @department) if @department
      employees = employees.where(job_title: @job_title) if @job_title
      employees = employees.where(hire_date: self.class.hired_range(@tenure)) if @tenure
      employees
    end

    # One country is shown in its own currency, exactly; across countries, figures are converted
    # to the reporting currency (ADR 0007, 0019).
    def converted?
      @country.nil?
    end

    def currency
      @country ? @country.currency_code : REPORTING_CURRENCY
    end

    # What's applied, for the page to describe. Each is nil when not filtered.
    def to_h
      {
        country: @country && { code: @country.code, name: @country.name },
        department: @department && { id: @department.id, name: @department.name },
        job_title: @job_title && { id: @job_title.id, name: @job_title.name },
        tenure: @tenure && { key: @tenure[0], label: @tenure[1] }
      }
    end

    def self.tenure_band!(key)
      TENURE_BANDS.find { |band| band[0] == key.to_s } ||
        raise(ActiveRecord::RecordNotFound.new("Couldn't find tenure band #{key}", "Tenure band"))
    end

    # Hire dates in a band: "1–3 years" is hired at least 1 year ago and less than 3 years ago
    # (today is UTC, ADR 0017). SegmentStatsQuery's grouping by tenure uses the same bands.
    def self.hired_range(band)
      _key, _label, from, to = band
      latest = Date.current - from.years
      to ? (Date.current - to.years + 1.day)..latest : ..latest
    end
  end
end
