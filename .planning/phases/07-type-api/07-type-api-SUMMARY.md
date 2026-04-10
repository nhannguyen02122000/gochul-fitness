---
phase: 07-type-api
plan: 1
subsystem: api
tags: [typescript, api, contract, status-machine]

# Dependency graph
requires: []
provides:
  - ContractStatus union simplified to 4 values (NEWLY_CREATED, ACTIVE, CANCELED, EXPIRED)
  - API transition guards for STAFF (NEWLY_CREATED → CANCELED), CUSTOMER (NEWLY_CREATED → ACTIVE/CANCELED)
  - CUSTOMER visibility for NEWLY_CREATED contracts in getAll and canViewContract
affects: [08-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Role-gated status transitions in API layer
    - Sequential if/else pattern for mutually-exclusive TypeScript type narrowing

key-files:
  created: []
  modified:
    - src/app/type/api/index.ts
    - src/app/api/contract/updateStatus/route.ts
    - src/app/api/contract/getAll/route.ts
    - src/app/api/contract/update/route.ts
    - src/utils/statusUtils.ts
    - src/app/(main)/contracts/page.tsx

key-decisions:
  - "Sequential if/else instead of else-if chain to avoid TypeScript type narrowing conflict"
  - "dateUpdates logic removed entirely — start_date/end_date always reset to now on any status change"

patterns-established:
  - "TypeScript union type narrowing in else-if chains can conflict with later guards; use sequential if/return instead"

requirements-completed: [TYPE-01, API-01, API-02, API-03, API-04, API-05, API-06, API-07]

# Metrics
duration: 15min
completed: 2026-04-10
---

# Phase 7 Plan 1: Type & API Summary

**Remove 4 deprecated ContractStatus values; add NEWLY_CREATED transition guards for STAFF and CUSTOMER**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-10T16:54:00Z
- **Completed:** 2026-04-10T17:01:35Z
- **Tasks:** 12 (all in single atomic commit)
- **Files modified:** 6

## Accomplishments

- ContractStatus union reduced from 8 → 4 values (removed CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, PT_CONFIRMED)
- STAFF can now cancel NEWLY_CREATED contracts they sold (sale_by ownership check)
- CUSTOMER can activate their own NEWLY_CREATED contracts (NEWLY_CREATED → ACTIVE) and cancel them
- ADMIN force-cancel preserved for NEWLY_CREATED and ACTIVE contracts
- CUSTOMER visibility for NEWLY_CREATED contracts added in getAll API and canViewContract utility
- dateUpdates/contractDuration logic removed — start_date/end_date always set to now on status change
- All 6 affected files updated consistently; TypeScript compiles cleanly

## Task Commits

All 12 tasks committed in one atomic unit:

1. **All Wave 1 + Wave 2 tasks** — `a99fbf3` (refactor)

**Plan metadata:** `a99fbf3` (part of main commit)

## Files Created/Modified

- `src/app/type/api/index.ts` — ContractStatus union: 4 values only
- `src/app/api/contract/updateStatus/route.ts` — validStatuses array, STAFF/CUSTOMER/ADMIN transition guards, dateUpdates removed
- `src/app/api/contract/getAll/route.ts` — CONTRACT_STATUS_VALUES updated, CUSTOMER NEWLY_CREATED filter removed
- `src/app/api/contract/update/route.ts` — CONTRACT_STATUS_VALUES updated
- `src/utils/statusUtils.ts` — getContractActionButtons, isPreActiveContractStatus, canViewContract, getContractStatusText/Variant/Color, CONTRACT_STATUS_ICON all simplified
- `src/app/(main)/contracts/page.tsx` — CONTRACT_STATUSES filter options, availableStatuses/effectiveStatuses, contractsByStatus.pending all simplified

## Decisions Made

- **Sequential if/else pattern for TypeScript type narrowing:** The original `else if (newStatus === 'CANCELED')` guard caused TypeScript to narrow `newStatus` away from `CANCELED` in the subsequent `else if (role === 'STAFF')` branch, making the comparison `newStatus === 'CANCELED'` a type error. Resolved by restructuring all role guards as sequential `if/return` blocks, eliminating the type-narrowing conflict.
- **dateUpdates removed entirely:** Instead of conditionally preserving contract duration when activating, start_date and end_date are always set to `now` on any status change. This simplifies the logic and matches the plan's specification; canceled contracts don't need accurate dates.

## Deviations from Plan

**1. [Rule 3 - Blocking] TypeScript type narrowing conflict in else-if chain**
- **Found during:** Task 2.1 (STAFF transitions)
- **Issue:** `else if (newStatus === 'CANCELED')` narrowed the type so subsequent `else if (role === 'STAFF')` branch could not reference `newStatus === 'CANCELED'`
- **Fix:** Restructured role validation as sequential independent `if`/`return` blocks per role, removing the `else if (newStatus === 'CANCELED')` guard
- **Files modified:** src/app/api/contract/updateStatus/route.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `a99fbf3` (Task 2.1–2.3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** TypeScript correctness fix required — essential for production build. No scope change.

## Issues Encountered

None beyond the TypeScript blocking issue (resolved as deviation above).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 08 (UI) is ready to begin. All type and API changes are committed and TypeScript-clean. Phase 08 will update ContractCard buttons and status badge rendering to match the new 4-state model.

---
*Phase: 07-type-api*
*Completed: 2026-04-10*
