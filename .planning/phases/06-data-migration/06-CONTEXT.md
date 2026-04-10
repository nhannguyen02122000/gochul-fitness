# Phase 6: Data Migration - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

One-time backfill of existing contracts from deprecated intermediate states (`CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED`) to `ACTIVE` status. Runs as a pre-flight step before Phase 7 TypeScript changes. This is a data-only phase — no UI, no API changes for the app, just the migration endpoint.

</domain>

<decisions>
## Implementation Decisions

### Migration endpoint location
- **D-01:** Dedicated endpoint at `src/app/api/admin/migrateContractStatuses/route.ts` — clean separation from the existing `backfillTimestamps` endpoint; explicit purpose

### Endpoint design
- **D-02:** `GET /api/admin/migrateContractStatuses` — returns preview: count of contracts by each deprecated status, per-contract details (id, status, start_date, purchased_by)
- **D-03:** `POST /api/admin/migrateContractStatuses` — executes the migration: sets all 4 deprecated statuses → `ACTIVE`, preserving `start_date` and all other fields

### Role guard
- **D-04:** ADMIN-only access via `requireRole('ADMIN')` — same pattern as existing admin routes

### start_date handling
- **D-05:** Preserve existing `start_date` — do NOT reset to today. Contracts that were in payment flow should retain their original start date
- **D-06:** If `start_date` is missing, leave it as-is (null/undefined) — do not set a default

### Verification
- **D-07:** GET response returns: `{ CUSTOMER_REVIEW: N, CUSTOMER_CONFIRMED: N, CUSTOMER_PAID: N, PT_CONFIRMED: N }` counts + array of contracts affected with their current status and start_date
- **D-08:** POST response returns: `{ migrated: N, by_status: { ... } }` summary
- **D-09:** PHASE-6.md includes manual verification checklist (read the data, confirm counts match expectations)

### Batch processing
- **D-10:** Process in batches of 100 (consistent with existing `backfillTimestamps` pattern)

### No dry-run flag
- **D-11:** No dry-run mode — GET preview is sufficient; POST executes. The preview gives full visibility before committing.

</decisions>

<specifics>
## Specific Ideas

- "Keep it simple — one endpoint with GET preview and POST execute"
- "Don't touch start_date — if it's already set, keep it"

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Migration pattern
- `src/app/api/admin/backfillTimestamps/route.ts` — existing admin endpoint pattern: auth + role guard + batch processing + InstantDB transact
- `src/lib/dbServer.ts` — instantServer instance for admin transactions

### Requirements
- `.planning/REQUIREMENTS.md` §MIGRATE-01 through MIGRATE-04 — migration requirements
- `.planning/ROADMAP.md` §Phase 6 — phase goal and success criteria

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `instantServer.tx.contract[id].update({ status: 'ACTIVE' })` — InstantDB transaction pattern from `backfillTimestamps`
- `chunkArray()` utility — existing batching function in `backfillTimestamps`

### Established Patterns
- Admin route: `auth()` → `instantServer.query()` → role check → `instantServer.transact()` batch
- Response format: `{ message, updated_X, ... }`

### Integration Points
- Reads from `contract` entity with `status` filter
- Writes to `contract` entity only — no history/session changes needed

</codebase_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-data-migration*
*Context gathered: 2026-04-10*
