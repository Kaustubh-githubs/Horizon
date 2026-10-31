module Api
  module V1
    # A budget's history from the audit trail (ADR 0012, 0020): each time it was set or changed,
    # who did it and when, newest first.
    class BudgetAuditsController < Api::BaseController
      def index
        budget = DepartmentBudget.find(params[:budget_id])
        audits = budget.audits.includes(:user).reorder(version: :desc)

        render json: audits.map { |audit| BudgetAuditSerializer.new(audit).as_json }
      end
    end
  end
end
