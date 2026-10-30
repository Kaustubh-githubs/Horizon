module Api
  module V1
    # An employee's salary history, and recording a change to it (ADR 0018).
    class SalaryRevisionsController < Api::BaseController
      def index
        revisions = Employee.find(params[:employee_id]).salary_revisions.order(:effective_from, :id)

        render json: { data: SalaryRevisionSerializer.history(revisions) }
      end

      def create
        employee = Employee.find(params[:employee_id])
        previous_amount = employee.current_salary
        revision = SalaryRevisions::Create.new(
          employee:, amount: scalar_param(:amount), reason: scalar_param(:reason),
          lock_version: params.require(:lock_version), job_title_id: scalar_param(:job_title_id)
        ).call

        render json: SalaryRevisionSerializer.new(revision, previous_amount:), status: :created
      end
    end
  end
end
