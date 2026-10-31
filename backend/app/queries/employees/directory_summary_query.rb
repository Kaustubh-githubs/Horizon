module Employees
  # The line above the directory and the counts in its Country and Department filters (ADR 0019).
  # It reuses DirectoryQuery's search and filters, so the total is exactly the people in the list.
  # Each option's count ignores its own filter, like any faceted search: with India picked, the
  # other countries still say how many they'd give. Five small count queries.
  class DirectorySummaryQuery
    def initialize(params = {})
      @params = params.to_h.symbolize_keys
    end

    def call
      {
        total: people.count,
        country_count: people.distinct.count(:country_id),
        department_count: people.distinct.count(:department_id),
        countries: counts(:country, :country, "countries.code", "countries.name").map do |(code, name), count|
          { code:, name:, count: }
        end,
        departments: counts(:department_id, :department, "departments.id", "departments.name").map do |(id, name), count|
          { id:, name:, count: }
        end
      }
    end

    private

    # The list's people, without its sorting or preloading, which counting doesn't need. `without`
    # leaves one filter out, for that filter's own counts.
    def people(without: nil)
      @people ||= {}
      @people[without] ||= DirectoryQuery.new(@params.except(without)).call.except(:order, :includes)
    end

    # [[key, name], count] pairs, largest first, then by name.
    def counts(filter, association, key, name)
      people(without: filter).joins(association).group(key, name).count
                             .sort_by { |(_key, label), count| [ -count, label ] }
    end
  end
end
