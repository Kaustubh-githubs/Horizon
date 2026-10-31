# Money is decimal(15,2) (ADR 0006). A value with more than two decimal places would be rounded by
# the column without anyone noticing (1200000.999 saved as 1200001.00), so it's refused instead.
# It checks the value as it was given, because Rails casts (and rounds) it on assignment.
class MoneyPrecisionValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, _value)
    amount = BigDecimal(record.read_attribute_before_type_cast(attribute).to_s.strip, exception: false)
    return if amount.nil? || amount.round(2) == amount

    record.errors.add(attribute, "can have at most 2 decimal places")
  end
end
