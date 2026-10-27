module Api
  # Parent for every JSON API controller. Shared API behaviour (the error format,
  # authentication) lives here, so each endpoint controller only holds its own actions.
  class BaseController < ApplicationController
  end
end
