# One entry of a budget's history, from the audit trail (ADR 0012, 0020): the amount it was set
# to, or changed from and to, and who did it when.
class BudgetAuditSerializer
  def initialize(audit)
    @audit = audit
  end

  # A create records the amount it was set to; an update records [old, new].
  def as_json(*)
    from, to = @audit.action == "create" ? [ nil, @audit.audited_changes["amount"] ] : @audit.audited_changes["amount"]
    {
      id: @audit.id,
      action: @audit.action,
      from: MoneyString.from(from),
      to: MoneyString.from(to),
      # No user for changes made outside the app, such as the seed.
      changed_by: @audit.user&.name,
      created_at: @audit.created_at
    }
  end
end
