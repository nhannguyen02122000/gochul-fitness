# Phase 6: Data Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 06-data-migration
**Mode:** discuss

---

## Area 1: Migration endpoint location

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated endpoint | Create new `/api/admin/migrateContractStatuses/route.ts` | ✓ |
| Extend existing route | Add migration logic to existing `backfillTimestamps` | |
| CLI script | Standalone script run via CLI, `@instantdb/admin` directly | |

**User's choice:** Dedicated endpoint
**Notes:** "Clean separation, explicit purpose"

---

## Area 2: Endpoint design

| Option | Description | Selected |
|--------|-------------|----------|
| GET = preview, POST = execute | Separate methods: GET shows counts, POST executes | ✓ |
| Query param toggle | `POST ?dry=true` for preview, without for execute | |
| Single endpoint, return all | One call that returns preview counts and executes | |

**User's choice:** GET = preview, POST = execute

---

## Area 3: start_date handling

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve existing start_date | Keep whatever start_date already exists | ✓ |
| Reset to today | Set `start_date = today` for all migrated contracts | |
| Per-contract logic | Preserve if exists, reset if missing | |

**User's choice:** Preserve existing start_date
**Notes:** "Contracts that were in payment flow should retain their original start date"

---

## Area 4: Verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| Preview with counts | GET returns affected contract count + details | ✓ |
| Dry-run mode | Dry run first, then real run with --confirm flag | |
| Verification doc only | Migration endpoint + verification checklist in PHASE-6.md | ✓ |

**User's choice:** Preview with counts + Verification doc only

---

## Claude's Discretion

- Exact response field names (GET and POST payload shapes)
- Batch size (use existing 100 limit from `backfillTimestamps`)
- Error handling approach (follow existing pattern)

---

## Deferred Ideas

None — discussion stayed within phase scope.