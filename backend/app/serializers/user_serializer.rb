# The JSON shape of the signed-in user (ADR 0009, 0010): who they are and their persona.
class UserSerializer
  def initialize(user)
    @user = user
  end

  def as_json(*)
    {
      id: @user.id,
      name: @user.name,
      email_address: @user.email_address,
      persona: { key: @user.persona.key, name: @user.persona.name }
    }
  end
end
