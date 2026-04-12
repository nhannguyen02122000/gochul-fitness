---
gsd_state_version: 1.0
milestone: v1.1
status: complete
last_updated: "2026-04-12T08:47:00.000Z"
last_activity: 2026-04-12 -- Phase 09 complete; all v1.1 phases finished
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 2
  completed_plans: 2
---

# GoChul Fitness — State

**Updated:** 2026-04-12
**Version:** 1.1

---

## Current Position

Phase: 09 (documentation) — COMPLETE ✅
Plan: 1 of 1
Status: All v1.1 phases complete
Last activity: 2026-04-12 -- Phase 09 documentation complete

---

## Current Milestone: v1.1 Enhance Contract Flow

**Goal:** Simplify contract lifecycle from 6 states to 4 (NEWLY_CREATED → ACTIVE → EXPIRED; side branches to CANCELED). Remove customer review/payment/confirmation steps.

**Target features:**

- Data migration: backfill deprecated statuses → ACTIVE (Phase 6) ✅ Complete
- Type & API: remove 4 deprecated ContractStatus values; add transition guards (Phase 7) ✅ Complete
- UI: Cancel button (ADMIN/STAFF), Activate button (CUSTOMER), correct badges (Phase 8) ✅ Complete
- Docs: PROGRAM.md + cursor/rules updated (Phase 9) ✅ Complete

---

## Phase Summary

| # | Name | Requirements | Status |
|---|------|-------------|--------|
| 6 | Data Migration | MIGRATE-01–04 | Complete |
| 7 | Type & API | TYPE-01, API-01–07 | Complete |
| 8 | UI | UI-01–08 | Complete |
| 9 | Documentation | DOCS-01–04 | Complete |

---

## Decisions Made (v1.1)

| Decision | Rationale |
|----------|-----------|
| Data migration runs as Phase 6 (first) | Must complete before TypeScript types change — existing contracts in removed states break at runtime |
| No AI chatbot updates in v1.1 | Chatbot not tested; deferred to future milestone |
| ADMIN force-cancel on ACTIVE preserved | Sessions may be booked; ADMIN needs override capability |
| `isPreActiveContractStatus()` returns `true` only for `NEWLY_CREATED` | Reflects simplified 2-state model — no intermediate pre-active states |
| `canViewContract()` opens to CUSTOMER on `NEWLY_CREATED` | Customer needs to see their own pending contracts to activate them |
| CUSTOMER activate → direct API call (no dialog) | Server resets start_date/end_date to now; no user choice needed |
| Cancel → AlertDialog with "Xác nhận hủy hợp đồng" for all roles | Confirmation guard before any cancellation |
| UI labels all in Vietnamese | Consistent with app localization (viVN Clerk locale) |

---

## Key Files to Modify

| File | Purpose | Phase |
|------|---------|-------|
| `src/app/api/admin/migrateContractStatuses/route.ts` (new or extend) | One-time migration: deprecated status → ACTIVE | 6 |
| `src/app/type/api/index.ts` | ContractStatus union: remove 4 deprecated values | 7 |
| `src/app/api/contract/updateStatus/route.ts` | validStatuses array, transition guards for NEWLY_CREATED → CANCELED/ACTIVE | 7 |
| `src/app/api/history/create/route.ts` | Confirm ACTIVE-only session creation guard | 7 |
| `src/components/cards/ContractCard.tsx` | Cancel + Activate buttons with popups | 8 |
| `src/utils/statusUtils.ts` | getContractActionButtons, getContractStatusVariant, getContractStatusText, isPreActiveContractStatus, canViewContract | 8 |
| `docs/PROGRAM.md` | Lifecycle diagram, RBAC table, expiry rules | 9 |
| `.cursor/rules/gochul-fitness-rules.mdc` | Runtime behavior rules | 9 |

---

## Open Items

| Item | Owner | Notes |
|------|-------|-------|
| Confirm migration script can run against production InstantDB | TBD | Uses INSTANTDB_ADMIN_TOKEN |
| Verify `start_date` preservation on all migrated contracts | TBD | Must not reset `start_date` to today |
| Validate no live sessions depend on deprecated contract statuses | TBD | Sessions link to contracts — must check before migrating |

---

*State last updated: 2026-04-12 after Phase 09 complete*
