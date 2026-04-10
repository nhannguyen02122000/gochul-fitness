# Phase 7: Type & API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 07-type-api
**Areas discussed:** STAFF cancel scope, Trigger-date adjustment on activate

---

## STAFF cancel scope

| Option | Description | Selected |
|--------|-------------|----------|
| Any STAFF cancels any NEWLY_CREATED | Follows current codebase pattern — no sale_by ownership check on STAFF transitions. Simpler, consistent with existing code. | |
| STAFF can only cancel contracts they created (sale_by) | Adds ownership guard matching CUSTOMER's purchased_by check. Contracts stay with the seller. | ✓ |

**User's choice:** STAFF can only cancel contracts they created (sale_by)
**Notes:** Matches existing CUSTOMER ownership pattern. Contracts stay with the seller.

---

## Trigger-date adjustment on activate

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve dates | Keep current logic — if start_date is set, keep it. Enables trigger-date feature (Phase 8). Consistent with Phase 6 migration decision. | |
| Reset to today | Simplify — activate always sets start_date = today, end_date = today + duration. Removes trigger-date complexity. | ✓ |

**User's choice:** Reset to today
**Notes:** This overrides the prior STATE.md decision that included a trigger-date modal for Phase 8. Phase 8 planner must be informed.

---

## Claude's Discretion

The following were left to Claude's judgment during planning:
- Exact error messages for invalid transition responses
- TypeScript strictness approach
- Auto-expire logic preservation

## Deferred Ideas

### Phase 8 trigger-date modal (superseded)
User chose "Reset to today" for activate, which means the trigger-date modal documented in STATE.md v1.1 decisions is no longer applicable. Phase 8 UI plan must be updated to remove the trigger-date modal from the activate flow.
