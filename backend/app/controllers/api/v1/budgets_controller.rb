module Api
  module V1
    # Department budgets (ADR 0020): this year's overview, and setting or changing one budget.
    class BudgetsController < Api::BaseController
      def index
        render json: ::Budgets::OverviewQuery.new.call
      end

      # Always for this year, whatever year the client sends.
      def create
        budget = DepartmentBudget.create!(department_id: scalar_param(:department_id),
                                          year: DepartmentBudget.current_year, amount: scalar_param(:amount))

        render json: budget_json(budget), status: :created
      end

      # Only the amount changes. The client sends the lock_version it loaded, so a conflicting
      # change gets a 409 instead of overwriting (ADR 0017).
      def update
        budget = DepartmentBudget.find(params[:id])
        budget.update!(amount: scalar_param(:amount), lock_version: params.require(:lock_version))

        render json: budget_json(budget)
      end

      private

      def budget_json(budget)
        {
          id: budget.id, department_id: budget.department_id, year: budget.year,
          amount: budget.amount.to_s("F"), currency: DepartmentBudget::CURRENCY, lock_version: budget.lock_version
        }
      end
    end
  end
end
