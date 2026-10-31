module Employees
  # An employee's story by date (ADR 0021), newest first: joining, salary revisions (from the
  # salary history, so seeded ones too), department and title moves (from the audit trail, so only
  # those made in the app), work anniversaries and leaving. Every event has a kind, a date and its
  # changes as { field, from, to }.
  class TimelineQuery
    # Events on the same day: joining before anything else, leaving after. Changes in between are
    # ordered by when they were recorded, so the story reads in the order things happened.
    RANK = { "joined" => 0, "anniversary" => 1, "salary_change" => 2, "promotion" => 2, "department" => 2,
             "job_title" => 2, "ended" => 3 }.freeze
    MOVES = %w[department_id job_title_id].freeze

    def initialize(employee)
      @employee = employee
    end

    def call
      @audits = @employee.own_and_associated_audits.to_a
      @values = AuditValues.new(@audits)
      events = [ joined, *salary_events, *moves, *anniversaries, ended ].compact
      # The position the event was built in breaks ties, e.g. a department and a title changed in
      # one save keep that order, instead of whatever an unstable sort gives.
      events.each_with_index
            .sort_by { |event, index| [ event[:date], RANK.fetch(event[:kind]), event[:at].to_f, -index ] }
            .reverse.map { |event, _index| event.except(:at) }
    end

    private

    def revisions
      @revisions ||= @employee.salary_revisions.order(:effective_from, :id).to_a
    end

    def employee_updates
      @employee_updates ||= @audits.select { |audit| audit.auditable_type == "Employee" && audit.action == "update" }
    end

    # The request that saved each salary revision (by revision id): a title change in one of them
    # belongs to a promotion. Services save a change as one request even outside the app (Auditable).
    def salary_requests
      @salary_requests ||= @audits.select { |audit| audit.auditable_type == "SalaryRevision" }
                                  .to_h { |audit| [ audit.auditable_id, audit.request_uuid ] }
    end

    # On the hire date, with the starting salary and, for someone added in the app, the department
    # and title they joined with. The seed didn't record those, and today's may not be the first.
    def joined
      created = @audits.find { |audit| audit.auditable_type == "Employee" && audit.action == "create" }
      hire = revisions.find(&:hire?)
      changes = created ? MOVES.map { |column| @values.change(created, column) } : []
      changes << { field: "salary", from: nil, to: hire.amount.to_s("F") } if hire
      { kind: "joined", date: @employee.hire_date, changes: }
    end

    # Every revision but the hire, from the amount before it (none for a first revision), with when
    # it was recorded. A promotion made in the app also shows the title change saved with it.
    def salary_events
      revisions.each_with_index.filter_map do |revision, index|
        next if revision.hire?

        before = revisions[index - 1].amount if index.positive?
        promotion = revision.promotion?
        title = (promotion_title(revision) if promotion)
        {
          kind: promotion ? "promotion" : "salary_change", date: revision.effective_from, reason: revision.reason,
          change_percent: SalaryRevisionSerializer.change_percent(before, revision.amount),
          changes: [ title, { field: "salary", from: before&.to_s("F"), to: revision.amount.to_s("F") } ].compact,
          recorded_at: revision.created_at, at: revision.created_at
        }
      end
    end

    def promotion_title(revision)
      request = salary_requests[revision.id]
      audit = request && employee_updates.find { |a| a.request_uuid == request && a.audited_changes.key?("job_title_id") }
      @values.change(audit, "job_title_id") if audit
    end

    # Department and title moves made in the app, on the day they were recorded (ADR 0005). A title
    # changed by a promotion is shown with the promotion instead.
    def moves
      promotions = salary_requests.values
      employee_updates.flat_map do |audit|
        MOVES.filter_map do |column|
          next unless audit.audited_changes.key?(column)
          next if column == "job_title_id" && promotions.include?(audit.request_uuid)

          change = @values.change(audit, column)
          { kind: change[:field], date: audit.created_at.to_date, changes: [ change ], at: audit.created_at }
        end
      end
    end

    # One a year on the hire date, up to the last working day or today. Worked out, not stored.
    def anniversaries
      last_day = @employee.terminated_on || Date.current
      (1..).lazy.map { |years| [ years, @employee.hire_date.advance(years:) ] }
           .take_while { |_years, date| date <= last_day }
           .map { |years, date| { kind: "anniversary", date:, years:, changes: [] } }.to_a
    end

    def ended
      { kind: "ended", date: @employee.terminated_on, changes: [] } if @employee.terminated?
    end
  end
end
