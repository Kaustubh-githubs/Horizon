module Api
  # Parent for every JSON API controller. Shared API behaviour (the error format,
  # authentication) lives here, so each endpoint controller only holds its own actions.
  class BaseController < ApplicationController
    # API-only Rails leaves cookies out; the login session lives in a signed cookie (ADR 0009).
    include ActionController::Cookies
    # Every endpoint requires a signed-in user unless it opts out with allow_unauthenticated_access.
    include Authentication

    # Field for each unique index, so a duplicate that slips past the model's check (two saves
    # racing) still gets the usual field error instead of a 500.
    UNIQUE_INDEX_FIELDS = { "index_employees_on_email" => :email }.freeze

    # List endpoints page 25 at a time by default, and never more than 100 (ADR 0016).
    PER_PAGE = 25
    MAX_PER_PAGE = 100

    # Turn the usual failures into the shared error shape (ADR 0016), so controllers stay on the happy path.
    rescue_from ActiveRecord::RecordNotFound do |error|
      render_errors({ base: [ "#{error.model || 'Record'} not found" ] }, :not_found)
    end

    rescue_from ActiveRecord::RecordInvalid do |error|
      render_errors(validation_errors(error.record), :unprocessable_content)
    end

    rescue_from ActiveRecord::RecordNotUnique do |error|
      field = UNIQUE_INDEX_FIELDS[unique_index_name(error)]
      errors = field ? { field => [ "has already been taken" ] } : { base: [ "That record already exists" ] }
      render_errors(errors, :unprocessable_content)
    end

    rescue_from ActiveRecord::StaleObjectError do
      render_errors({ base: [ "Someone else changed this record. Reload to see their changes." ] }, :conflict)
    end

    rescue_from ActionController::ParameterMissing do |error|
      render_errors({ error.param => [ "is required" ] }, :bad_request)
    end

    private

    # A single value from the query or body. An array or hash (`job_title_id[]=5`) counts as
    # missing, so a malformed request gets the normal validation error instead of a 500.
    def scalar_param(key)
      value = params[key]
      value unless value.is_a?(Array) || value.is_a?(ActionController::Parameters)
    end

    # Pagy's own per_page parsing lets a negative value through (and then raises),
    # so we read it here: missing, zero, negative or junk means the default. to_s first,
    # because per_page[]=1 arrives as an Array and per_page[a]=1 as a Hash.
    def per_page
      requested = params[:per_page].to_s.to_i
      requested.positive? ? [ requested, MAX_PER_PAGE ].min : PER_PAGE
    end

    # Every error response has the same shape: { "errors": { "field": ["message"] } } (ADR 0016).
    def render_errors(errors, status)
      render json: { errors: }, status:
    end

    # Errors on an association (`department: ["must exist"]`) are reported under its id
    # field (`department_id`), which is what the client sends and the form shows.
    def validation_errors(record)
      return { base: [ "is invalid" ] } unless record

      record.errors.to_hash.transform_keys do |attribute|
        record.class.reflect_on_association(attribute)&.foreign_key || attribute
      end
    end

    def unique_index_name(error)
      error.cause.try(:result)&.error_field(PG::Result::PG_DIAG_CONSTRAINT_NAME)
    end
  end
end
