---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Enhance Contract Flow
status: defining_requirements
last_updated: "2026-04-10T05:13:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# GoChul Fitness — State

**Updated:** 2026-04-10
**Version:** 1.1

---

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-10 — Milestone v1.1 started

---

## Current Milestone: v1.1 Enhance Contract Flow

**Goal:** Simplify contract lifecycle: NEWLY_CREATED → ACTIVE → EXPIRED (remove customer review/payment steps)

**Target features:**
- Simplified contract flow (2 states instead of 6)
- ADMIN/STAFF Cancel button with red styling + confirmation popup
- CUSTOMER Activate button with trigger-date modal
- Session booking unchanged on ACTIVE contracts
- PROGRAM.md updated

---

## Decisions Made (v1.1)

*(TBD — accumulated during execution)*

---

## Key Files to Modify

| File | Purpose |
|------|---------|
| `src/app/api/contract/updateStatus/` | Remove deprecated statuses, add activate logic |
| `src/app/type/api/index.ts` | Remove CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, PT_CONFIRMED types |
| `src/components/cards/ContractCard.tsx` | Simplify status badges, update CTA buttons |
| `src/components/modals/CreateContractModal.tsx` | No change needed |
| `src/utils/statusUtils.ts` | Remove deprecated status utilities |
| `docs/PROGRAM.md` | Update lifecycle diagram |
| `AI chatbot system prompt` | Remove prompt rules for deprecated statuses |

---

## Open Items

*(TBD during execution)*

---

*State last updated: 2026-04-10 after v1.1 milestone started*
