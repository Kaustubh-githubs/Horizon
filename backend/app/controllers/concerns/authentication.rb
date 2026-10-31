# Cookie-based login for the JSON API (ADR 0009), adapted from the Rails 8 generator:
# unauthenticated requests get a JSON 401 instead of a redirect to a login page.
module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :require_authentication
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private

  def authenticated?
    resume_session
  end

  def require_authentication
    resume_session || request_authentication
  end

  def resume_session
    Current.session ||= find_session_by_cookie
  end

  # The cookie's session, unless it has expired (Session::IDLE_TIMEOUT, MAX_AGE): then it's
  # deleted, and the request counts as signed out.
  def find_session_by_cookie
    session = Session.find_by(id: cookies.signed[:session_id]) if cookies.signed[:session_id]
    return unless session

    if session.expired?
      session.destroy
      cookies.delete(:session_id)
      return
    end

    session.record_activity
    session
  end

  def request_authentication
    render json: { errors: { base: [ "You need to sign in first" ] } }, status: :unauthorized
  end

  # Signed so it can't be forged, HTTP-only so JavaScript can't read it, SameSite=Lax so other
  # sites can't send it on POST/PATCH/DELETE, HTTPS-only in production, and gone when the session
  # would expire anyway. Signing in also clears out everyone's expired sessions.
  def start_new_session_for(user)
    Session.expired.delete_all
    user.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session|
      Current.session = session
      cookies.signed[:session_id] = {
        value: session.id, httponly: true, same_site: :lax, secure: Rails.env.production?,
        expires: Session::MAX_AGE.from_now
      }
    end
  end

  def terminate_session
    Current.session.destroy
    cookies.delete(:session_id)
  end
end
