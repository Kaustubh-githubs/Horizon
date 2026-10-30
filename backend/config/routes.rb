Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Like /up, but also checks the database. Used by deploys and uptime checks.
      get "health" => "health#show"

      # POST to log in, GET for the current user, DELETE to log out.
      resource :session, only: %i[show create destroy]

      # Countries, departments and job titles for filters and dropdowns.
      resource :lookups, only: :show
      resources :employees, only: %i[index show create update] do
        # Counts for the cards above the directory, following its filters.
        get :summary, on: :collection
        # POST to terminate. Employees are never deleted (ADR 0008).
        resource :termination, only: :create
        # Salary history, and recording a change (ADR 0018).
        resources :salary_revisions, only: %i[index create]
        # What peers in the same country and job title earn, for the change-salary dialog.
        resource :pay_comparison, only: :show
        # Whether the employee is a ★ outlier, for the profile banner (ADR 0019).
        resource :pay_position, only: :show
      end

      # The insights dashboard (ADR 0019).
      get "insights/overview" => "insights#overview"
      get "insights/segments" => "insights#segments"
      get "insights/outliers" => "insights#outliers"
      get "insights/pay_changes" => "insights#pay_changes"
    end
  end
end
