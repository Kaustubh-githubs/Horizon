module Api
  module V1
    # A budget's history from the audit trail (ADR 0012, 0020): each time it was set or changed,
    # who did it and when, newest first.
    class BudgetAuditsController < Api::BaseController
      def index
        budget = DepartmentBudget.find(params[:budget_id])
        audits = budget.audits.includes(:user).reorder(version: :desc)

        render json: audits.map { |audit| audit_json(audit) }
      end

      private

      # A create records the amount it was set to; an update records [old, new].
      def audit_json(audit)
        from, to = audit.action == "create" ? [ nil, audit.audited_changes["amount"] ] : audit.audited_changes["amount"]
        {
          id: audit.id, action: audit.action, from: Insights.money(from), to: Insights.money(to),
          # No user for changes made outside the app, such as the seed.
          changed_by: audit.user&.name, created_at: audit.created_at
        }
      end
    end
  end
end
