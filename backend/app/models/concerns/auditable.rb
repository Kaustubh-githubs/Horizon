# Puts a model on the audit trail (ADR 0012): who changed it, when, and the old and new values.
# Only this concern knows about the audited gem, so replacing the gem means changing one file.
# The gem already leaves out id, timestamps and lock_version.
module Auditable
  extend ActiveSupport::Concern

  class_methods do
    # A model opts in with `auditable`. Options go to the gem, e.g. SalaryRevision passes
    # `associated_with: :employee` so its changes show in the employee's history.
    def auditable(**options)
      audited(**options)
    end
  end

  # Saves made in the block share one request id in the audit trail, as they do in a web request,
  # so readers can tell they were one change (a promotion's revision and its new title, ADR 0021).
  # Outside a request (the console, a task) the gem would give each row its own id.
  def self.as_one_change
    return yield if Audited.store[:current_request_uuid]

    Audited.store[:current_request_uuid] = SecureRandom.uuid
    begin
      yield
    ensure
      Audited.store.delete(:current_request_uuid)
    end
  end
end
