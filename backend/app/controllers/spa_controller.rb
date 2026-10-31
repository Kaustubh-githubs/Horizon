# Serves the React app (ADR 0025) for every page the browser opens: the root, and the app's own
# routes such as /employees/42 after a refresh or from a shared link. The production image puts
# the built app's JS and CSS under public/assets, with hashed names, where Rails' static file
# server caches them for a year. Its shell is public/spa.html, kept apart from those and sent
# here with no-cache, so a new deploy is picked up on the next page load.
class SpaController < ActionController::API
  SHELL = Rails.public_path.join("spa.html")

  def show
    return head :not_found unless SHELL.exist?

    response.headers["Cache-Control"] = "no-cache"
    send_file SHELL, type: "text/html", disposition: "inline"
  end
end
