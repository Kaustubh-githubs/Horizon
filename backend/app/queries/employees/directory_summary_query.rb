module Employees
  # The summary cards above the directory: how many people the list holds, and how many in each
  # country and department, largest first. It reuses DirectoryQuery's search and filters, so the
  # cards always describe exactly the people in the list below them. Three small count queries.
  class DirectorySummaryQuery
    def initialize(params = {})
      @params = params
    end

    def call
      {
        total: people.count,
        countries: counts(:country, "countries.code", "countries.name").map do |(code, name), count|
          { code:, name:, count: }
        end,
        departments: counts(:department, "departments.id", "departments.name").map do |(id, name), count|
          { id:, name:, count: }
        end
      }
    end

    private

    # The list's people, without its sorting or preloading, which counting doesn't need.
    def people
      @people ||= DirectoryQuery.new(@params).call.except(:order, :includes)
    end

    # [[key, name], count] pairs, largest first, then by name.
    def counts(association, key, name)
      people.joins(association).group(key, name).count.sort_by { |(_key, label), count| [ -count, label ] }
    end
  end
end
