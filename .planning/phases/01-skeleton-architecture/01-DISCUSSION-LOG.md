# Phase 1: Skeleton & Architecture - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 01-skeleton-architecture
**Mode:** discuss

---

## Area: Auth Token Forwarding

| Option | Description | Selected |
|--------|-------------|----------|
| Clerk short-lived tokens | `getToken({ template: 'gochul-fitness' })` — explicit, scoped, rotatable. Safer but needs Clerk middleware config. | ✓ |
| Automatic cookie forwarding | `fetch()` from route handler auto-forwards Clerk cookie. Simpler but relies on same-origin assumption. | |
| INSTANTDB_ADMIN_TOKEN | Server uses admin token directly. Bypasses RBAC — not suitable for role-aware chatbot. | |
| You decide | Go with the standard pattern for Next.js + Clerk apps calling internal APIs | |

**User's choice:** Clerk short-lived tokens
**Notes:** Preferred explicit scoped tokens over implicit cookie forwarding for security clarity.

---

## Area: System Prompt Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full permission matrix in system prompt | AI knows exactly what each role can do. Can give specific error messages and ask for role escalation. | |
| Minimal — API enforces everything | AI only knows the endpoints exist. API returns 403, AI translates to user. Simpler prompt, but less helpful errors. | |
| Hybrid | AI knows role capabilities to ask smart follow-ups, but API enforces as safety net. Best UX + security. | ✓ |
| You decide | Go with a reasonable default for a role-aware chatbot | |

**User's choice:** Hybrid (Recommended)
**Notes:** Best UX + security combination. AI can guide users intelligently, API is the safety net.

---

## Area: roleCheck.ts Standardization

| Option | Description | Selected |
|--------|-------------|----------|
| Standardize roleCheck.ts | Refactor existing routes + chatbot route to use roleCheck.ts helpers. Consistent pattern, one source of truth. | ✓ |
| Keep inline role checks | Leave existing routes as-is, chatbot route uses its own inline checks. Less refactoring, more inconsistency. | |
| You decide | Go with a reasonable default based on codebase patterns | |

**User's choice:** Standardize roleCheck.ts
**Notes:** Prefers consistent patterns across the codebase. The `roleCheck.ts` helpers are the right abstraction.

---

## Claude's Discretion

- Exact system prompt wording and tone
- Whether tool definitions include response schema examples
- The placeholder response format before the tool-use loop is added
- Exact test strategy for verifying Clerk token forwarding (curl vs test script)

## Deferred Ideas

None.
