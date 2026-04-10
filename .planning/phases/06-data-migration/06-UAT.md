---
status: partial
phase: 06-data-migration
source: [06-data-migration/SUMMARY.md]
started: 2026-04-10T00:00:00Z
updated: 2026-04-10T00:00:00Z
---

## Current Test

[testing paused — 1 issue, 2 blocked, 2 skipped]

## Tests

### 1. Preview migration as ADMIN
expected: |
  Signed in as ADMIN. Navigating to or calling GET /api/admin/migrateContractStatuses
  returns JSON with counts broken down by each deprecated status (CUSTOMER_REVIEW,
  CUSTOMER_CONFIRMED, CUSTOMER_PAID, PT_CONFIRMED) and a contracts array showing
  id, current_status, start_date, purchased_by, and kind for each affected contract.
  Non-ADMIN users receive 403 Forbidden.
result: pass

### 2. Preview migration blocked for non-ADMIN
expected: |
  Signed in as STAFF or CUSTOMER. Calling GET /api/admin/migrateContractStatuses
  returns 403 Forbidden with error message "Forbidden - Only ADMIN can preview migration".
result: pass

### 3. Execute migration (POST)
expected: |
  Signed in as ADMIN. Calling POST /api/admin/migrateContractStatuses executes the
  migration. Response includes { message: "Contract status migration completed",
  migrated: N, by_status: { CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID,
  PT_CONFIRMED } } with accurate counts.
result: issue
reported: "405 method not found"
severity: blocker

### 4. Migration execution blocked for non-ADMIN
expected: |
  Signed in as STAFF or CUSTOMER. Calling POST /api/admin/migrateContractStatuses
  returns 403 Forbidden with error message "Forbidden - Only ADMIN can run migration".
result: blocked
blocked_by: server
reason: "405 method not found — same root cause as test 3, POST handler not registered in dev server"

### 5. Contracts migrated to ACTIVE (re-verify after POST)
expected: |
  Calling GET /api/admin/migrateContractStatuses again after POST returns total: 0
  and counts all 0 — confirming all deprecated-status contracts have been migrated.
  Contracts that were in deprecated statuses are now queryable as ACTIVE.
result: skipped
reason: "depends on test 3"

### 6. start_date preserved during migration
expected: |
  Before running POST, note the start_date of at least one affected contract.
  After POST, querying that contract shows the same start_date — it was never
  changed to today's date.
result: skipped
reason: "dev server needs restart to test POST — source code review confirms start_date is never modified in migration transactions"

### 7. updated_at set on migrated contracts
expected: |
  Migrated contracts have updated_at set to the migration timestamp (all the same
  value, within seconds of the POST call time — not null, not their old value).
result: skipped
reason: "dev server needs restart to test POST — source code review confirms updated_at is set to Date.now() in migration transactions"

## Summary

total: 7
passed: 2
issues: 1
pending: 0
skipped: 2
blocked: 2

## Gaps

- truth: "POST /api/admin/migrateContractStatuses executes the migration and returns success response"
  status: failed
  reason: "User reported: 405 method not found"
  severity: blocker
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
