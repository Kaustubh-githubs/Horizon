# Puts a model on the audit trail (ADR 0012): who changed it, when, and the old and new values.
# Only this concern knows about the audited gem, so replacing the gem means changing one file.
# The gem already leaves out id, timestamps and lock_version.
module Auditable
  extend ActiveSupport::Concern

  class_methods do
    # A model opts in with `auditable`. Options go to the gem, e.g. SalaryRevision will pass
    # `associated_with: :employee` so its changes show in the employee's history.
    def auditable(**options)
      audited(**options)
    end
  end
end
