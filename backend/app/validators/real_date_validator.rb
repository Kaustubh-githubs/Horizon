# A date that doesn't exist (30 February, month 13) casts to nil, so a presence check would call it
# blank. This says what's actually wrong, and takes the "can't be blank" error's place. Declare it
# after the attribute's presence validation.
class RealDateValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return unless value.nil? && record.read_attribute_before_type_cast(attribute).present?

    record.errors.delete(attribute, :blank)
    record.errors.add(attribute, "is not a valid date")
  end
end
