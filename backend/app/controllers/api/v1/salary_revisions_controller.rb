module Api
  module V1
    # Recording a salary change (ADR 0018). The history is read through the timeline (ADR 0021).
    class SalaryRevisionsController < Api::BaseController
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
