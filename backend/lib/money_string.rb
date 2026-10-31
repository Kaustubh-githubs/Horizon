# Money in API responses: a string rounded to 2 decimals, never a float, so JavaScript can't
# turn it into one (ADR 0006). SQL aggregates come back in different types (AVG as a decimal,
# PERCENTILE_CONT as a float); all of them come out the same way. nil stays nil.
module MoneyString
  def self.from(value)
    value&.to_d&.round(2)&.to_s("F")
  end
end
