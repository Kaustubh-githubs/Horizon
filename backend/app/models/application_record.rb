class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  # Gives every model the `auditable` switch; each model still opts in (ADR 0012).
  include Auditable
end
