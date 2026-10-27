module Api
  module V1
    class HealthController < ApplicationController
      def show
        ActiveRecord::Base.with_connection { |connection| connection.select_value("SELECT 1") }
        render json: { status: "ok", database: "ok" }
      rescue ActiveRecord::ActiveRecordError
        render json: { status: "error", database: "error" }, status: :service_unavailable
      end
    end
  end
end
