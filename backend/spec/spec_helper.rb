# Plain RSpec settings that don't need Rails. See rails_helper.rb for the Rails setup.
RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  # Doubles can only stub methods that really exist on the object.
  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups

  # `fit` / `fdescribe` run only the focused examples.
  config.filter_run_when_matching :focus

  # Enables `rspec --only-failures` and `--next-failure`.
  config.example_status_persistence_file_path = "spec/examples.txt"

  config.disable_monkey_patching!

  config.default_formatter = "doc" if config.files_to_run.one?

  # Random order catches tests that secretly depend on each other.
  # A failing order can be replayed with `rspec --seed <seed>`.
  config.order = :random
  Kernel.srand config.seed
end
