module SalaryRevisions
  # Records a salary change (ADR 0004, 0018). In one transaction it saves the revision and makes
  # it the employee's current salary, and for a promotion moves them to the new job title, so
  # the history, the current salary and the title always agree.
  #
  # The change takes effect today, the UTC date (ADR 0005, 0017), in the currency of the
  # employee's country. `lock_version` is the version of the employee the page loaded: if
  # anyone changed them since, this raises ActiveRecord::StaleObjectError and saves nothing.
  # Raises ActiveRecord::RecordInvalid, and saves nothing, if a rule is broken.
  class Create
    def initialize(employee:, amount:, reason:, lock_version:, job_title_id: nil)
      @employee = employee
      @amount = amount
      @reason = reason.to_s
      @lock_version = lock_version
      @job_title_id = job_title_id.to_s.presence&.to_i
    end

    def call
      revision = SalaryRevision.new(employee: @employee, amount: @amount, reason: @reason,
                                    currency: @employee.current_currency, effective_from: Date.current)
      check(revision)

      SalaryRevision.transaction do
        # check has already run every validation; running them again would only repeat its queries.
        revision.save!(validate: false)
        @employee.update!(current_salary: revision.amount, lock_version: @lock_version,
                          **(@reason == "promotion" ? { job_title_id: @job_title_id } : {}))
      end
      revision
    end

    private

    # Model rules first (amount, former employee, …), then the ones that only apply to a change.
    def check(revision)
      revision.validate
      errors = revision.errors

      errors.add(:reason, "isn't used for a salary change") if @reason == "hire"
      if revision.amount.present? && revision.amount == @employee.current_salary
        errors.add(:amount, "must be different from the current salary")
      end
      if @reason == "promotion" && (@job_title_id.nil? || @job_title_id == @employee.job_title_id)
        errors.add(:job_title_id, "must be a new job title for a promotion")
      end
      if @reason != "promotion" && @job_title_id && @job_title_id != @employee.job_title_id
        errors.add(:job_title_id, "only changes with a promotion")
      end

      raise ActiveRecord::RecordInvalid, revision if errors.any?
    end
  end
end
