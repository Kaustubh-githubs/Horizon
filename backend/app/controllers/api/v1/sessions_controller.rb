module Api
  module V1
    # Log in, see who is logged in, log out (ADR 0009).
    class SessionsController < Api::BaseController
      # Login attempts per address, counted in this process so the limit works the same in every
      # environment (the test cache stores nothing). One process today; running several would
      # need a shared store (Solid Cache or Redis) so each one sees every attempt.
      LOGIN_ATTEMPTS = ActiveSupport::Cache::MemoryStore.new

      allow_unauthenticated_access only: :create
      rate_limit to: 10, within: 3.minutes, only: :create, store: LOGIN_ATTEMPTS,
                 with: -> { render_errors({ base: [ "Too many attempts. Try again in a few minutes." ] }, :too_many_requests) }

      def show
        render json: { user: UserSerializer.new(Current.user) }
      end

      # Both are always passed, as text: authenticate_by raises when the password key is missing,
      # so a request without one would answer 500 instead of the usual 401.
      def create
        if (user = User.authenticate_by(email_address: scalar_param(:email_address).to_s,
                                        password: scalar_param(:password).to_s))
          start_new_session_for(user)
          render json: { user: UserSerializer.new(user) }, status: :created
        else
          render_errors({ base: [ "Wrong email address or password" ] }, :unauthorized)
        end
      end

      def destroy
        terminate_session
        head :no_content
      end
    end
  end
end
