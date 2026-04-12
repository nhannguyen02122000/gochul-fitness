# Phase 9: Documentation — Research

**Phase:** 09-documentation
**Date:** 2026-04-12
**Question:** "What do I need to know to PLAN this phase well?"

---

## Summary of What Needs to Change

This phase updates two documentation files to reflect the v1.1 simplified 4-state contract model. No code changes.

| File | Requirements addressed | Scope |
|------|----------------------|-------|
| `docs/PROGRAM.md` | DOCS-01, DOCS-02, DOCS-03 | 6 targeted section edits |
| `.cursor/rules/gochul-fitness-rules.mdc` | DOCS-04 | Remove/rewrite sections 5 (contract lifecycle, action buttons) |

---

## 1. PROGRAM.md — Section-by-Section Delta

### §1 Application Overview (lines 31–36) — Core business flow bullets

**Current:**
```
1. STAFF/ADMIN creates a contract for a customer (status = `NEWLY_CREATED`)
2. Customer reviews → confirms → pays → PT confirms → customer activates contract
3. Once ACTIVE, sessions (history) are booked against the contract
4. Sessions are checked-in by both customer and staff
5. Contracts/sessions expire based on date and time rules
```

**Target:** Bullet 2 changes from the 5-step approval chain to:
```
2. Customer reviews the contract and activates it (→ ACTIVE), or STAFF/ADMIN cancels it (→ CANCELED)
```

All other bullets unchanged.

---

### §2 Database — ContractStatus block (lines 68–75)

**Current:**
```
NEWLY_CREATED → CUSTOMER_REVIEW → CUSTOMER_CONFIRMED → CUSTOMER_PAID → PT_CONFIRMED → ACTIVE
                ↓                  ↓                   ↓                ↓
              CANCELED           CANCELED             CANCELED         CANCELED
                                                    (by ADMIN only)   (by ADMIN only)
```
Terminal statuses: `CANCELED`, `EXPIRED`

**Target — replace with:**
```
NEWLY_CREATED → ACTIVE → EXPIRED
     ↓
  CANCELED
```
Terminal statuses: `CANCELED`, `EXPIRED`

The `ContractStatus` type definition in the Appendix (lines 636–647) must be updated to match — remove the 4 deprecated string literals. Also update §4 RBAC overview table row "Update contract status" description if it mentions intermediate states.

---

### §4 RBAC — Contract Status Transitions table (lines 262–275)

**Current rows (13 rows covering 6 intermediate states):**

| Transition | ADMIN | STAFF | CUSTOMER |
|---|---|---|---|
| `NEWLY_CREATED` → `CUSTOMER_REVIEW` | ✅ | ✅ | ❌ |
| `NEWLY_CREATED` → `CANCELED` | ✅ | ❌ | ❌ |
| `CUSTOMER_REVIEW` → `CUSTOMER_CONFIRMED` | ✅ | ❌ | ✅ |
| `CUSTOMER_REVIEW` → `CANCELED` | ✅ | ❌ | ✅ |
| `CUSTOMER_CONFIRMED` → `CUSTOMER_PAID` | ✅ | ❌ | ✅ |
| `CUSTOMER_CONFIRMED` → `CANCELED` | ✅ | ❌ | ✅ |
| `CUSTOMER_PAID` → `PT_CONFIRMED` | ✅ | ✅ | ❌ |
| `CUSTOMER_PAID` → `CANCELED` | ✅ | ❌ | ❌ |
| `PT_CONFIRMED` → `ACTIVE` | ✅ | ❌ | ✅ |
| `PT_CONFIRMED` → `CANCELED` | ✅ | ❌ | ❌ |
| `ACTIVE` → `CANCELED` | ✅ (force) | ❌ | ❌ |
| Any → `EXPIRED` | ✅ (force) | ❌ | ❌ |

**Target rows (5 rows):**

| Transition | ADMIN | STAFF | CUSTOMER |
|---|---|---|---|
| `NEWLY_CREATED` → `ACTIVE` | ✅ | ❌ | ✅ (own contract) |
| `NEWLY_CREATED` → `CANCELED` | ✅ | ✅ (sale_by ownership) | ❌ |
| `ACTIVE` → `CANCELED` | ✅ (force) | ❌ | ❌ |
| `NEWLY_CREATED` → `EXPIRED` | ✅ (force) | ❌ | ❌ |
| `ACTIVE` → `EXPIRED` | ✅ (force) | ❌ | ❌ |

> **Note:** Phase 7 decisions (D-05, D-06, D-07, D-10) set: STAFF cancel requires `sale_by` ownership. This is already reflected in the API and needs to be reflected here. ADMIN force-expire on both `NEWLY_CREATED` and `ACTIVE` is also explicit from Phase 7 (D-07).

Also update §4.2 intro text if it mentions the 6-state chain.

---

### §5 Expired Rules — Contract Expiry (lines 334–374)

**Rule C1 (Pre-Active Expiry by Date) — REMOVE ENTIRELY (lines 340–347):**
```
#### Rule C1: Pre-Active Expiry by Date
**Trigger:** A contract is in a pre-ACTIVE status (`NEWLY_CREATED`,
`CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED`)
AND its `end_date` has passed.
```
In the 4-state model, `NEWLY_CREATED` contracts do NOT auto-expire. Per D-02: "Contracts in `NEWLY_CREATED` do not auto-expire — they remain pending until manually activated or canceled."

**Rule C4 (Date Adjustment on activate) — REMOVE ENTIRELY (lines 369–374):**
```
#### Rule C4: Activating a Contract (`PT_CONFIRMED` → `ACTIVE`) — Date Adjustment
When a customer activates a contract (`PT_CONFIRMED` → `ACTIVE`), if the
current time (`now`) differs from the stored `start_date`:
- `start_date` is reset to `now`
- `end_date` is recalculated: `now + (original_end_date - original_start_date)`
```
This no longer applies — activate is now `NEWLY_CREATED → ACTIVE` with date reset to today (Phase 7 D-12).

**Rule C2 (Active Expiry by Credits) — UPDATE trigger description (lines 349–364):**
Current: "A contract is `ACTIVE` AND its `end_date` has passed AND all credits have been used."
No wording changes needed — it already describes the `ACTIVE → EXPIRED` path correctly.

**Rule C3 (Manual Force-Expire) — UPDATE wording (line 366):**
Current references `updateStatus`; the force-expire rule is still valid for ADMIN. No content change needed.

**Expiry rules summary table (lines 416–421) — UPDATE first row:**
Current: "Contract (pre-ACTIVE) | `end_date < now` | `EXPIRED` | ✅"
Replace with:
- `Contract (NEWLY_CREATED)` | never auto-expires | — | ❌
- `Contract (ACTIVE, PT/REHAB)` | `end_date < now` AND credits exhausted | `EXPIRED` | ✅

**Add explicit `NEWLY_CREATED` non-expiry statement** — per D-02, add a clear note:
> `NEWLY_CREATED` contracts do not auto-expire. They remain in `NEWLY_CREATED` until the customer activates them (`→ ACTIVE`) or STAFF/ADMIN cancels them (`→ CANCELED`). Only `ACTIVE` contracts follow the `ACTIVE → EXPIRED` path.

This can go as a standalone paragraph before Rule C2, or as part of Rule C2's intro.

---

### §6 Contract Workflow Lifecycle (lines 425–480) — PRIMARY TARGET

**Three sub-changes required:**

#### 6a. Migration note — INSERT at top of section (D-08, D-09)
Placed above the ASCII diagram, visually distinct:

```
> **v1.1 Change (2026-04):** In v1.1, the contract flow was simplified from
> 6 states to 4. The statuses `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`,
> `CUSTOMER_PAID`, and `PT_CONFIRMED` were removed. Existing contracts in
> those states were migrated to `ACTIVE`.
```

#### 6b. ASCII diagram — REPLACE ENTIRELY (lines 427–467)

Current diagram is 5 intermediate states. Replace with:

```
[ADMIN/STAFF creates contract]
         │
         ▼
   NEWLY_CREATED
  (visible to customer)
         │
  ┌──────┴──────┐
  │             │
[CUSTOMER      [STAFF/ADMIN
 activates]     cancels]
  │             │
  ▼             ▼
  ACTIVE     CANCELED
(sessions     (terminal)
 can be
 booked)
         │
  [end_date
   passed,
  credits
  exhausted
  (PT/REHAB)]
         │
         ▼
     EXPIRED
   (terminal)
```

#### 6c. Status Transitions by Role — REPLACE (lines 469–480)

Current:
```
ADMIN:  Can force-set any status to any other (except blocked by expiry rules)
STAFF:  NEWLY_CREATED → CUSTOMER_REVIEW
        CUSTOMER_PAID → PT_CONFIRMED
        NEWLY_CREATED/CUSTOMER_REVIEW/CUSTOMER_CONFIRMED → CANCELED
CUSTOMER: CUSTOMER_REVIEW → CUSTOMER_CONFIRMED
          CUSTOMER_CONFIRMED → CUSTOMER_PAID
          PT_CONFIRMED → ACTIVE
          CUSTOMER_REVIEW/CUSTOMER_CONFIRMED → CANCELED
```

Target:
```
ADMIN:  Can force any status to any other (except blocked by expiry rules)
STAFF:  NEWLY_CREATED → CANCELED (sale_by ownership required)
        NEWLY_CREATED → ACTIVE (not in 4-state, not allowed — keep as-is: ❌)
CUSTOMER: NEWLY_CREATED → ACTIVE (purchased_by ownership required)
          NEWLY_CREATED → CANCELED (❌ — customer cannot cancel)
```

---

## 2. cursor/rules — Section-by-Section Delta

File: `.cursor/rules/gochul-fitness-rules.mdc`

### §5 Lifecycle state machines — Contract statuses block (lines 98–116)

**Current (lines 98–101):**
```
### Contract statuses
`NEWLY_CREATED -> CUSTOMER_REVIEW -> CUSTOMER_CONFIRMED -> CUSTOMER_PAID -> PT_CONFIRMED -> ACTIVE -> EXPIRED`
Terminal side branch: `CANCELED`
```

**Target:**
```
### Contract statuses
`NEWLY_CREATED -> ACTIVE -> EXPIRED`
Terminal side branch: `CANCELED`
`NEWLY_CREATED` contracts do not auto-expire — they remain pending until manually activated (`→ ACTIVE`) or canceled (`→ CANCELED`).
```

**Transition enforcement block (lines 103–116) — REPLACE ENTIRELY:**

Current covers all 6 intermediate states. Replace with:

```
#### Transition enforcement (`POST /api/contract/updateStatus`)
- `ADMIN`: can force any status.
- `STAFF`:
  - `NEWLY_CREATED -> ACTIVE`: ❌
  - `NEWLY_CREATED -> CANCELED`: ✅ (requires `sale_by` ownership)
- `CUSTOMER`:
  - `NEWLY_CREATED -> ACTIVE`: ✅ (requires `purchased_by` ownership)
  - `NEWLY_CREATED -> CANCELED`: ❌
- `ACTIVE` cannot be canceled by STAFF or CUSTOMER (ADMIN force-cancel only)
- Already `CANCELED` or `EXPIRED` cannot transition further
```

### §5 — Contract action-button runtime behavior (lines 118–139) — REWRITE

Current maps all 8 statuses per role. Replace with the simplified button map:

```
#### Contract action-button runtime behavior (`src/utils/statusUtils.ts`, `src/components/cards/ContractCard.tsx`)
- Action rendering requires `shouldShowContractActionButtons()`:
  - `ADMIN` and `STAFF`: can see action area for all contracts.
  - `CUSTOMER`: can see actions only when `contract.purchased_by === userInstantId`.
- Button generation source of truth is `getContractActionButtons()`:
  - `ADMIN`
    - `NEWLY_CREATED`: `Cancel`
    - `ACTIVE`, `CANCELED`, `EXPIRED`: no action buttons
  - `STAFF`
    - `NEWLY_CREATED`: `Cancel` (requires `sale_by` ownership)
    - `ACTIVE`, `CANCELED`, `EXPIRED`: no action buttons
  - `CUSTOMER`
    - `NEWLY_CREATED`: `Activate`
    - `ACTIVE`, `CANCELED`, `EXPIRED`: no action buttons
```

### §5 — Auto-expire contract rules (lines 141–145) — UPDATE wording

Current: "pre-active status and `end_date < now`"

Target: remove pre-active mention, since only `ACTIVE` auto-expires:

```
#### Auto-expire contract rules
- On contract list and status update paths, contracts may be auto-set to `EXPIRED` when:
  - status is `ACTIVE`, `end_date < now`, and no available credits remain (for `PT`/`REHAB`), where consumed credits are counted from history with status `NEWLY_CREATED` or `CHECKED_IN`
- `NEWLY_CREATED` contracts do not auto-expire.
- `ADMIN` can force-expire any contract.
```

### §6 Functional flows — Contract card identity display rules (lines 202–235) — REMOVE

This entire block covers the deprecated intermediate state button rendering (`CUSTOMER_REVIEW` Confirm Details, `CUSTOMER_PAID` PT Confirm Receipt, etc.). This is outdated in the 4-state model. Remove the entire block.

> **Note:** The Create Session button behavior paragraph at the end (lines 235–237) remains correct — `ACTIVE` contract guard unchanged — but it is part of the same block. If removing the whole block, re-add the Create Session paragraph separately, or keep it if it can be extracted cleanly.

**In practice:** the block starts at line 202 "#### Contract card identity display rules" and ends at line 237. The Create Session paragraph (lines 235–237) can be kept as a standalone note or merged into an adjacent section. Decision left to implementing agent.

### Appendix updates (none required)

The cursor rules Appendix doesn't contain a ContractStatus type definition — that lives in `src/app/type/api/index.ts` (already updated in Phase 7). No Appendix changes needed.

---

## 3. Migration Note — Placement and Wording

Per D-08 and D-09 (09-CONTEXT.md):

**Location:** §6 Contract Workflow Lifecycle, above the ASCII diagram.

**Format:** Blockquote (uses existing `> ` Markdown convention already present in PROGRAM.md §2 header).

**Wording:**
```
> **v1.1 Change (2026-04):** In v1.1 (2026-04), the contract flow was
> simplified from 6 states to 4. The statuses `CUSTOMER_REVIEW`,
> `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, and `PT_CONFIRMED` were removed.
> Existing contracts in those states were migrated to `ACTIVE`.
```

Do NOT add the same note to §1 overview or §4 RBAC — the §6 note is sufficient per D-09.

---

## 4. Expiry Rules — Precise Wording for `NEWLY_CREATED` Non-Expiry

Per D-02, the clearest placement is as a new sub-rule in §5 before Rule C2:

```
### 5.1 Contract Expiry Rules

Contracts in `NEWLY_CREATED` do not auto-expire. They remain in
`NEWLY_CREATED` until the customer activates them (`→ ACTIVE`) or
STAFF/ADMIN cancels them (`→ CANCELED`). Only `ACTIVE` contracts can
reach `EXPIRED` automatically.

#### Rule C2: Active Expiry by Credits ...
```

The rule-level description of Rule C2 ("A contract is `ACTIVE` ...") is already correct and needs no changes.

---

## 5. Verification — How to Confirm Docs Are Correct After Editing

After editing, run these grep checks to confirm no deprecated status values remain:

```bash
# PROGRAM.md — must return zero occurrences
grep -n "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" docs/PROGRAM.md

# cursor/rules — must return zero occurrences
grep -n "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" .cursor/rules/gochul-fitness-rules.mdc

# PROGRAM.md §4 RBAC table — should have exactly 5 transition rows
# (count non-header, non-divider lines between the table markers)
grep -c "→" docs/PROGRAM.md  # compare before/after counts

# PROGRAM.md §6 diagram — must contain NEWLY_CREATED, ACTIVE, CANCELED, EXPIRED
grep -A 20 "Contract Workflow Lifecycle" docs/PROGRAM.md | grep -E "NEWLY_CREATED|ACTIVE|CANCELED|EXPIRED"

# cursor/rules §5 — must contain only 4 valid statuses in lifecycle line
grep "Contract statuses" .cursor/rules/gochul-fitness-rules.mdc

# cursor/rules §6 — must NOT contain deprecated button states
grep -E "Confirm Details|Payment Completed|PT Confirm Receipt|Send to Customer" .cursor/rules/gochul-fitness-rules.mdc
```

**Pass criteria:**
- All `grep` commands for deprecated statuses return empty (exit code 1)
- §6 diagram contains all 4 valid statuses
- §6 diagram does NOT contain any of the 4 deprecated statuses
- §5 lifecycle line shows exactly `NEWLY_CREATED -> ACTIVE -> EXPIRED` (terminal `CANCELED` on separate line)
- §4 RBAC table has 5 transition rows (was 12)

---

## 6. Change Checklist for Implementation

### PROGRAM.md
- [ ] §1 bullet 2: update 5-step chain to 2-step
- [ ] §2 `ContractStatus` block: replace 6-state diagram with 4-state
- [ ] §4 RBAC table: replace 12-row table with 5-row table; update §4.2 intro if needed
- [ ] §5 Rule C1: remove entirely (pre-active expiry)
- [ ] §5 Rule C4: remove entirely (date adjustment on activate)
- [ ] §5 Rule C2: add `NEWLY_CREATED` non-expiry note before it
- [ ] §5 summary table: update first row; add explicit NEWLY_CREATED row
- [ ] §6: insert v1.1 migration note above diagram
- [ ] §6 ASCII diagram: replace with new 4-state diagram
- [ ] §6 Status Transitions by Role: replace with simplified 4-state rules
- [ ] Appendix `ContractStatus` type: remove 4 deprecated string literals
- [ ] Update header date to 2026-04-12

### cursor/rules
- [ ] §5 Contract statuses line: update to 4-state
- [ ] §5 Transition enforcement block: replace with simplified rules
- [ ] §5 Action-button block: rewrite for 4 states
- [ ] §5 Auto-expire rules: update wording (remove pre-active mention)
- [ ] §6 Contract card identity display rules: remove entirely (deprecated button states)
- [ ] (Optional) §6 Create Session paragraph: re-add if it was part of removed block

---

## 7. Known Boundaries and Out-of-Scope

- **AI chatbot docs** (`docs/FEAT_AIBOT.txt`, `AGENTS.md`): NOT updated in this phase (per deferred list, D-13 in 09-CONTEXT.md)
- **TypeScript source files**: NOT updated — Phase 7 already handled `src/app/type/api/index.ts`
- **UI code**: NOT updated — Phase 8 already handled `statusUtils.ts`, `ContractCard.tsx`
- **statusUtils.ts comment**: Adding a comment there about the simplified model is left to Claude's discretion (D-50 in 09-CONTEXT.md) — optional, not required
- **Section numbering in cursor rules**: NOT renumbered (D-07, D-04 in 09-CONTEXT.md) — gaps acceptable
- **v1.1 Change note format**: Using blockquote (existing convention in PROGRAM.md) rather than inventing a new format
