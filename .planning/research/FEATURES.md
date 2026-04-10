# Feature Research

**Domain:** Contract lifecycle management for gym/fitness studio web apps
**Researched:** 2026-04-10
**Confidence:** HIGH

## Context

GoChul Fitness currently has a 6-state contract lifecycle:

```
NEWLY_CREATED → CUSTOMER_REVIEW → CUSTOMER_CONFIRMED → CUSTOMER_PAID → PT_CONFIRMED → ACTIVE
```

**Target:** Simplify to a 2-state lifecycle:

```
NEWLY_CREATED → ACTIVE
```

Terminal states: `EXPIRED`, `CANCELED` (unchanged).

**What's removed:** `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` — all customer review, payment, and staff-confirmation steps disappear.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visible pending contract for customer | Once staff creates a contract, customer must see it in their contract list | LOW | Currently `NEWLY_CREATED` is hidden from CUSTOMER via `canViewContract` filter in `getAll/route.ts`. Must change to show. |
| Customer can activate contract | The sole customer action in the new flow | LOW | Existing "Activate" button on `PT_CONFIRMED` moves to `NEWLY_CREATED`. Preserves the trigger-date modal + date-adjustment logic (Rule C4 in PROGRAM.md). |
| Staff/admin can cancel a new contract | Staff need a way to reject bad contracts before activation | LOW | Red "Cancel" button on `NEWLY_CREATED`. Already exists for some statuses — must extend to `NEWLY_CREATED` for ADMIN/STAFF. Requires confirmation dialog (already in `ContractCard.tsx`). |
| Session booking on active contracts | Core value — contracts are useless without booking | LOW | No change. `shouldShowCreateSession` already checks `contract.status === 'ACTIVE'`. |
| Auto-expiry by date | Prevents stale pending contracts from lingering | LOW | Rule C1 (`isPreActiveContractStatus` → `EXPIRED`) already exists. With 2 states, expiry from `NEWLY_CREATED` is the only path. |
| Auto-expiry by credits (PT/REHAB) | Credits-based contracts must expire when exhausted | LOW | Rule C2 unchanged — applies when `ACTIVE`. |
| Credit tracking display | Customers and staff need to see remaining sessions | LOW | No change. `ContractCard.tsx` credit badge already works. |
| Status badge on card | Visual clarity on contract state | LOW | `getContractStatusVariant` and `getContractStatusText` need updating — 4 statuses removed from display map. |
| Contract detail view | Staff need full contract info | LOW | No structural change to detail page expected. |

### Differentiators (Competitive Advantage)

Features that set the product apart in the gym management space.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Trigger-date activation modal | Customers choose when to start — deferred start without needing staff to re-create a contract | MEDIUM | Already implemented in `ContractCard.tsx` (`pendingActivation` + `AlertDialog`). Reuses same date-adjustment logic (Rule C4: `start_date`/`end_date` recalculation). Only trigger changes from `PT_CONFIRMED` → `NEWLY_CREATED`. |
| One-step contract activation | Competing products still require review/payment flow; this is meaningfully faster | LOW | The simplification itself is the differentiator — reduced friction from 6 steps to 1. |
| ADMIN force-cancel on ACTIVE | ADMIN override for sensitive situations | LOW | Existing behavior (`ACTIVE → CANCELED` by ADMIN only) is unchanged. |
| Staff cancel on NEWLY_CREATED | Staff can self-correct mistakes | LOW | New capability — `STAFF` gains `NEWLY_CREATED → CANCELED` transition. Already blocked for `ACTIVE` contracts. |
| Dual check-in on sessions | Both parties confirm attendance — trust mechanism | LOW | No change. Session lifecycle (`NEWLY_CREATED → CHECKED_IN`) is independent of contract lifecycle. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic activation on creation | "Just make it live immediately" | Staff need a chance to review contract details before it's active. Also breaks credit tracking — active contracts consume credits, but if the customer never intended to start yet, credits are consumed prematurely. | Staff intentionally sends to customer (now: customer activates). The manual step is intentional friction for safety. |
| Customer can cancel ACTIVE contracts | "Customers should be able to walk away" | Active sessions are already booked; canceling mid-contract orphans scheduled sessions and disrupts trainer schedules. Credits were already consumed. | ADMIN can force-cancel if genuinely needed. Customer cancels via support request → ADMIN handles. |
| Payment integration as a separate step | "Real businesses need payment" | Adds Stripe/MoMo integration complexity, a payment confirmation step, and potential for failed payments. For a small gym operation, payment is typically handled in-person (cash, bank transfer). | Keep manual — payment is assumed done before or at contract creation. Staff confirms receipt and activates. |
| Staff can edit contract fields post-creation | "Mistakes happen, let staff fix them" | Changing credits, duration, or price after sessions are booked creates accounting inconsistency. If contract was already activated and some sessions are in progress, the math breaks. | ADMIN force-update still exists (`/api/contract/update`). Scope edit to ADMIN only, only on pre-ACTIVE contracts, with a warning. |
| Multiple active contracts per customer | "Same customer, multiple PTs" | In practice, most customers have one active trainer relationship at a time. Multiple active contracts create credit ambiguity (which contract does a session consume?). | Allow multiple ACTIVE contracts for ADMIN/STAFF visibility. CUSTOMER-facing: show a warning if customer tries to activate a second contract. |

---

## Feature Dependencies

```
[Contract Lifecycle Simplification]
    │
    ├──requires──> [API: remove intermediate status transitions]
    │                  │
    │                  ├──requires──> [RBAC: simplify updateStatus guards]
    │                  └──requires──> [Data migration: existing intermediate-status contracts]
    │
    ├──requires──> [UI: update getContractActionButtons for 2 states]
    │                  │
    │                  ├──requires──> [NEWLY_CREATED: ADMIN/STAFF Cancel + CUSTOMER Activate]
    │                  └──requires──> [ACTIVE: Session button only (unchanged)]
    │
    ├──requires──> [UI: make NEWLY_CREATED visible to CUSTOMER]
    │                  │
    │                  └──requires──> [getAll route: remove NEWLY_CREATED filter for CUSTOMER]
    │
    ├──requires──> [UI: update status badge display map]
    │                  │
    │                  └──requires──> [statusUtils.ts: remove 4 status variants]
    │
    ├──requires──> [AI chatbot: update system prompt + tool definitions]
    │                  │
    │                  └──requires──> [Remove CUSTOMER_REVIEW/CONFIRMED/PAID/PT_CONFIRMED from allowed values]
    │
    └──requires──> [PROGRAM.md: update lifecycle diagram]
                       │
                       └──requires──> [docs/v1.1-enhance-contract-flow.md: replace v1 with v1.1 spec]
```

### Dependency Notes

- **[API: remove intermediate status transitions] requires [RBAC: simplify updateStatus guards]:** The transition validation in `updateStatus/route.ts` currently allows 3 roles to transition through 4 intermediate states. With only `NEWLY_CREATED → ACTIVE`, the guard logic collapses significantly — but must still enforce that ADMIN/STAFF cannot activate (only CUSTOMER can), and STAFF/ADMIN cannot activate (only CUSTOMER).
- **[UI: make NEWLY_CREATED visible to CUSTOMER] requires [getAll route: remove NEWLY_CREATED filter for CUSTOMER]:** The current query filter `NEWLY_CREATED is always excluded` for CUSTOMER must be removed. `canViewContract` in `statusUtils.ts` will need an update (or can be simplified to `return true` for CUSTOMER).
- **[Data migration: existing intermediate-status contracts] is a prerequisite for clean state:** Contracts currently in `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, or `PT_CONFIRMED` will be in an invalid state after code deployment. Either a one-time migration script (ADMIN-only route) backfills them to `NEWLY_CREATED`, or the code handles legacy statuses gracefully.
- **[AI chatbot: update system prompt + tool definitions] requires [API removal]:** The chatbot's permission-aware intent routing checks what transitions are allowed. Removing intermediate statuses means the bot must not offer "confirm details", "mark as paid", or "PT confirm receipt" actions.

---

## MVP Definition

### Launch With (v1.1)

Minimum viable product for the simplified flow.

- [ ] **API: Remove 4 intermediate statuses from transition validation** — Simplify `updateStatus/route.ts` guards. Only `NEWLY_CREATED → ACTIVE` (CUSTOMER), `NEWLY_CREATED → CANCELED` (ADMIN/STAFF/CUSTOMER own), and `ACTIVE → CANCELED` (ADMIN force) remain.
- [ ] **API: Remove intermediate statuses from `validStatuses` array** — TypeScript type `ContractStatus` in `type/api/index.ts` must also drop `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED`.
- [ ] **UI: Move "Activate" button to NEWLY_CREATED for CUSTOMER** — Update `getContractActionButtons` in `statusUtils.ts`. Remove `Send to Customer` button (ADMIN/STAFF on `NEWLY_CREATED`). Add `Cancel` for ADMIN/STAFF on `NEWLY_CREATED`.
- [ ] **UI: Make NEWLY_CREATED visible to CUSTOMER** — Remove `NEWLY_CREATED` exclusion in `getAll` route query. Update `canViewContract` in `statusUtils.ts`.
- [ ] **UI: Add red Cancel button with confirmation popup** — `ContractCard.tsx` already has `AlertDialog` confirm modal. Ensure the red/danger button appears for ADMIN/STAFF `NEWLY_CREATED` cancel.
- [ ] **UI: Update status badge display map** — Remove `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` from `getContractStatusVariant`, `getContractStatusText`, `CONTRACT_STATUS_ICON`.
- [ ] **Data migration: backfill existing intermediate contracts** — One-time ADMIN script to set all contracts with removed statuses to `NEWLY_CREATED` (or `ACTIVE` if they're past the point of no return). Triggered manually at deploy time.
- [ ] **PROGRAM.md: update lifecycle diagram** — Replace the 6-state diagram with the 2-state diagram. Update RBAC tables in Section 4.2.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **AI chatbot: update system prompt + contract tool definitions** — Remove intermediate status mentions; update allowed transitions in the AI's permission knowledge.
- [ ] **docs/v1.1-enhance-contract-flow.md: archive** — Move completed spec to `docs/archived/`.
- [ ] **Expiry rule cleanup for pre-ACTIVE state** — Rule C1 currently auto-expires any pre-ACTIVE contract by date. With only `NEWLY_CREATED` as the pre-ACTIVE state, this simplifies to: `NEWLY_CREATED` contracts whose `end_date < now` expire automatically.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Payment integration (MoMo/VNPay)** — If payment is moved online, re-evaluating the flow. Current scope keeps it manual/in-person.
- [ ] **Multiple active contracts per customer guard** — CUSTOMER-facing warning when activating a second active contract. Trigger for v2.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| API: remove intermediate status transitions | HIGH — core simplification | MEDIUM — collapse guard logic, update validStatuses | P1 |
| UI: move Activate button to NEWLY_CREATED for CUSTOMER | HIGH — enables new flow | LOW — `statusUtils.ts` one-line change | P1 |
| UI: make NEWLY_CREATED visible to CUSTOMER | HIGH — enables new flow | LOW — remove filter in `getAll` route | P1 |
| UI: red Cancel button + confirmation popup | MEDIUM — staff safety net | LOW — already built in `ContractCard.tsx` | P1 |
| UI: update status badge display map | LOW — cosmetic | LOW — remove 4 entries from maps | P1 |
| Data migration: backfill legacy contracts | MEDIUM — data integrity | MEDIUM — one-time script + manual trigger | P1 |
| PROGRAM.md: update lifecycle diagram | MEDIUM — documentation | LOW — update 1 diagram + 1 table | P1 |
| AI chatbot: update prompts + tool defs | MEDIUM — chatbot stays consistent | MEDIUM — update system prompt + tool schemas | P2 |
| Expiry rule cleanup for pre-ACTIVE | LOW — simplification | LOW — simplify Rule C1 condition | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Mindbody (market leader) | GymMaster | Vagaro | Our Approach |
|---------|-------------------------|-----------|--------|--------------|
| Contract status visibility | Active / Paused / Expired / Canceled | Active / Pending / Expired | Active / Completed / Canceled | 2 states: Active / Expired (Canceled as terminal) |
| Customer-facing contract steps | Customers sign contracts digitally (1 step after staff creates) | Staff creates → customer reviews and accepts | Staff creates → customer confirms | Staff creates → customer activates directly |
| Payment as separate step | Yes — integrated into contract signing flow | Yes | Yes | No — handled offline/in-person |
| Staff cancel pre-active contract | Yes | Yes | Yes | Yes — Cancel button on `NEWLY_CREATED` |
| Trigger-date activation | No — contracts start immediately on accept | No | No | Yes — trigger-date modal preserves contract duration |
| Session booking only on active | Yes | Yes | Yes | Yes — unchanged |
| Auto-expiry | By date + by usage | By date + by usage | By date | By date + by credits — unchanged |

### Key Insight

Industry leaders (Mindbody, GymMaster, Vagaro) still retain a review/acceptance step for customers, but it is a **single click**, not the 4-step flow GoChul Fitness currently has. The simplification to `NEWLY_CREATED → ACTIVE` is actually **more streamlined** than most competitors — the trigger-date modal is a genuine differentiator, allowing deferred start without staff re-creating a contract.

The key risk is **perceived as "too simple"** — some customers may expect a payment confirmation step because "that's how contracts work." The activation confirmation dialog (showing the date adjustment) must communicate clearly: "You're activating this contract. Your sessions will start from today."

---

## Sources

- `.planning/PROJECT.md` — v1.1 milestone definition
- `docs/v1.1-enhance-contract-flow.md` — v1.1 requirement from founder
- `docs/PROGRAM.md` — existing contract lifecycle, RBAC tables, expiry rules
- `src/app/api/contract/updateStatus/route.ts` — current transition validation logic
- `src/utils/statusUtils.ts` — current button logic, badge variants, visibility checks
- `src/components/cards/ContractCard.tsx` — current button rendering + confirmation dialog

---

*Feature research for: GoChul Fitness Contract Lifecycle Simplification (6 states → 2 states)*
*Researched: 2026-04-10*