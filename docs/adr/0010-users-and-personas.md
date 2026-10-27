# 0010. Users belong to a persona

Status: Accepted · 2026-10-28

## Context
Today there is one persona, the HR Manager. Realistically that will change: regional HR, finance or read-only auditors may need access with different permissions. We don't want to build permissions now, but we don't want to box ourselves in either.

## Decision
- A `personas` table (`key`, `name`, `description`), seeded with one row: `hr_manager` / "HR Manager".
- Every user belongs to a persona (`users.persona_id`, required).
- No permission checks are built yet. When they're needed, authorization rules (for example Pundit policies) can check `user.persona.key`.

## Options considered
- **A `role` column on users (Rails enum).** Simple, but adding a role means a code change and deploy, and there's nowhere to hang role details later.
- **Full role-based access control** (roles, permissions and join tables). The flexible end state, but it's a lot of tables and screens for a single persona today.
- **Nothing.** Fastest, but adding permissions later would mean reworking users.

## Consequences
- Good: a clear hook for permissions, and the word "persona" matches the brief.
- Good: a `persona_permissions` table can be added later without changing users.
- Cost: one extra table and join that does very little today.
