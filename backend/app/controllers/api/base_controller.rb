module Api
  # Parent for every JSON API controller. Shared API behaviour (the error format,
  # authentication) lives here, so each endpoint controller only holds its own actions.
  class BaseController < ApplicationController
    # API-only Rails leaves cookies out; the login session lives in a signed cookie (ADR 0009).
    include ActionController::Cookies
    # Every endpoint requires a signed-in user unless it opts out with allow_unauthenticated_access.
    include Authentication
  end
end
