---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: verifying
last_updated: "2026-04-10T17:18:18.684Z"
last_activity: 2026-04-10
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 1
---

# GoChul Fitness — State

**Updated:** 2026-04-10
**Version:** 1.1

---

## Current Position

Phase: 8
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-10
Resume: .planning/phases/06-data-migration/06-CONTEXT.md

---

## Current Milestone: v1.1 Enhance Contract Flow

**Goal:** Simplify contract lifecycle from 6 states to 4 (NEWLY_CREATED → ACTIVE → EXPIRED; side branches to CANCELED). Remove customer review/payment/confirmation steps.

**Target features:**

- Data migration: backfill deprecated statuses → ACTIVE (Phase 6)
- Type & API: remove 4 deprecated ContractStatus values; add transition guards (Phase 7)
- UI: Cancel button (ADMIN/STAFF), Activate button (CUSTOMER), correct badges (Phase 8)
- Docs: PROGRAM.md + cursor/rules updated (Phase 9)

---

## Phase Summary

| # | Name | Requirements | Status |
|---|------|-------------|--------|
| 6 | Data Migration | MIGRATE-01–04 | Pending |
| 7 | Type & API | TYPE-01, API-01–07 | Pending |
| 8 | UI | UI-01–08 | Pending |
| 9 | Documentation | DOCS-01–04 | Pending |

---

## Decisions Made (v1.1)

| Decision | Rationale |
|----------|-----------|
| Data migration runs as Phase 6 (first) | Must complete before TypeScript types change — existing contracts in removed states break at runtime |
| No AI chatbot updates in v1.1 | Chatbot not tested; deferred to future milestone |
| ADMIN force-cancel on ACTIVE preserved | Sessions may be booked; ADMIN needs override capability |
| Trigger-date modal on activate | Aligns with original business intent — `start_date` controls when contract takes effect |
| `isPreActiveContractStatus()` returns `true` only for `NEWLY_CREATED` | Reflects simplified 2-state model — no intermediate pre-active states |
| `canViewContract()` opens to CUSTOMER on `NEWLY_CREATED` | Customer needs to see their own pending contracts to activate them |

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

*State last updated: 2026-04-10 after v1.1 roadmap created*
