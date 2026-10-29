module Api
  module V1
    # Log in, see who is logged in, log out (ADR 0009).
    class SessionsController < Api::BaseController
      allow_unauthenticated_access only: :create
      rate_limit to: 10, within: 3.minutes, only: :create,
                 with: -> { render_errors({ base: [ "Too many attempts. Try again in a few minutes." ] }, :too_many_requests) }

      def show
        render json: { user: user_json(Current.user) }
      end

      def create
        if (user = User.authenticate_by(params.permit(:email_address, :password)))
          start_new_session_for(user)
          render json: { user: user_json(user) }, status: :created
        else
          render_errors({ base: [ "Wrong email address or password" ] }, :unauthorized)
        end
      end

      def destroy
        terminate_session
        head :no_content
      end

      private

      def user_json(user)
        {
          id: user.id,
          name: user.name,
          email_address: user.email_address,
          persona: { key: user.persona.key, name: user.persona.name }
        }
      end
    end
  end
end
