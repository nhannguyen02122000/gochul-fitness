---
gsd_state_version: 1.0
milestone: v1.1
phase: 09-documentation
phase_name: Documentation
status: pending
wave: 1
depends_on: []
files_modified:
  - docs/PROGRAM.md
  - .cursor/rules/gochul-fitness-rules.mdc
autonomous: false
---

# Phase 9 Plan: Documentation

**Goal:** Update `docs/PROGRAM.md` and `.cursor/rules/gochul-fitness-rules.mdc` to reflect the v1.1 simplified 4-state contract model. No code changes.

**Requirements covered:** DOCS-01, DOCS-02, DOCS-03, DOCS-04

---

## Wave 1 (sequential — PROGRAM.md must be edited before cursor rules, both read first)

### Task 1 — PROGRAM.md: §1 bullet, §2 ContractStatus block, §4 RBAC table

**<read_first>**
- `docs/PROGRAM.md` — read in full; confirm line ranges before editing
- `.planning/phases/09-documentation/09-RESEARCH.md` §1 — exact replacement text for each section
- `.planning/phases/09-documentation/09-CONTEXT.md` D-01, D-08, D-09 — migration note placement and wording
</read_first>

**<acceptance_criteria>**
```
# §1 bullet 2: no mention of 5-step approval chain
grep 'confirms → pays → PT confirms' docs/PROGRAM.md
→ 0 matches (exit code 1)

# §2 block: only NEWLY_CREATED, ACTIVE, CANCELED, EXPIRED appear
grep -E 'CUSTOMER_REVIEW|CUSTOMER_CONFIRMED|CUSTOMER_PAID|PT_CONFIRMED' docs/PROGRAM.md | grep -v '//\|#\|removed'
→ 0 matches (all deprecated statuses gone from §2 block and §4 table)

# §4 table: exactly 5 transition rows
# Count non-blank, non-header, non-divider lines between "| Transition" and next h2 heading
# Expected rows: NEWLY_CREATED→ACTIVE, NEWLY_CREATED→CANCELED, ACTIVE→CANCELED, NEWLY_CREATED→EXPIRED, ACTIVE→EXPIRED
awk '/\| Transition/,/^## / {print}' docs/PROGRAM.md | grep '→' | grep -v '----' | wc -l
→ 5
```
</acceptance_criteria>

**<action>**

**§1 bullet 2 — Replace (line 33):**
- **FROM:** `2. Customer reviews → confirms → pays → PT confirms → customer activates contract`
- **TO:** `2. Customer reviews the contract and activates it (→ `ACTIVE`), or STAFF/ADMIN cancels it (→ `CANCELED`)`

**§2 ContractStatus block — Replace (lines 68–75):**
- **FROM:** 6-state ASCII diagram with arrows → CUSTOMER_REVIEW → ... → PT_CONFIRMED → ACTIVE
- **TO:**
```
NEWLY_CREATED → ACTIVE → EXPIRED
     ↓
  CANCELED
```
Terminal statuses: `CANCELED`, `EXPIRED`

**§4 RBAC table — Replace (lines 262–275):**
- **FROM:** 12 rows covering CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, PT_CONFIRMED transitions
- **TO:** 5 rows:

| Transition | ADMIN | STAFF | CUSTOMER |
|------------|-------|-------|---------|
| `NEWLY_CREATED` → `ACTIVE` | ✅ | ❌ | ✅ (own contract) |
| `NEWLY_CREATED` → `CANCELED` | ✅ | ✅ (sale_by ownership) | ❌ |
| `ACTIVE` → `CANCELED` | ✅ (force) | ❌ | ❌ |
| `NEWLY_CREATED` → `EXPIRED` | ✅ (force) | ❌ | ❌ |
| `ACTIVE` → `EXPIRED` | ✅ (force) | ❌ | ❌ |

Also update §4.2 intro text (line 237) if it says "6-state chain" — change to reference the 4-state model.

**§4 customer-getAll note (line 284) — Replace:**
- **FROM:** `| CUSTOMER | Contracts where purchased_by = their user ID; NEWLY_CREATED is always excluded |`
- **TO:** `| CUSTOMER | Contracts where purchased_by = their user ID; NEWLY_CREATED is included (customer can activate own contracts) |`

---

### Task 2 — PROGRAM.md: §5 Expired Rules — remove Rule C1 and Rule C4, add non-expiry note

**<read_first>**
- `docs/PROGRAM.md` lines 334–421 — read §5 in full; confirm exact start/end lines of Rule C1 and Rule C4
- `.planning/phases/09-documentation/09-RESEARCH.md` §1.4 — exact wording for `NEWLY_CREATED` non-expiry statement
</read_first>

**<acceptance_criteria>**
```
# Rule C1 gone
grep -n 'Rule C1' docs/PROGRAM.md
→ 0 matches

# Rule C4 gone
grep -n 'Rule C4' docs/PROGRAM.md
→ 0 matches

# Rule C3 preserved
grep -n 'Rule C3' docs/PROGRAM.md
→ 1 match

# NEWLY_CREATED non-expiry statement present
grep -c "NEWLY_CREATED.*do not auto-expire\|NEWLY_CREATED.*never auto-expire" docs/PROGRAM.md
→ ≥ 1 match
```
</acceptance_criteria>

**<action>**

**§5.1 Contract Expiry Rules — Insert new intro paragraph before Rule C2 (after line 336 "A contract can be automatically marked as EXPIRED under two conditions:"):**
```
Contracts in `NEWLY_CREATED` do not auto-expire. They remain in
`NEWLY_CREATED` until the customer activates them (`→ ACTIVE`) or
STAFF/ADMIN cancels them (`→ CANCELED`). Only `ACTIVE` contracts can
reach `EXPIRED` automatically.
```

**Rule C1 — REMOVE ENTIRELY (lines 340–347):**
Delete the entire `#### Rule C1: Pre-Active Expiry by Date` block including its trigger description, "Where checked" bullets, and behavior statement.

**Rule C4 — REMOVE ENTIRELY (lines 369–374):**
Delete the entire `#### Rule C4: Activating a Contract (PT_CONFIRMED → ACTIVE) — Date Adjustment` block. This rule no longer applies in the 4-state model (activate is now NEWLY_CREATED → ACTIVE with dates reset to today server-side).

**§5.3 Summary Table (lines 416–421) — Update first row:**
- **FROM:** `Contract (pre-ACTIVE) | end_date < now | EXPIRED | ✅`
- **TO (2 rows):**
  - `Contract (NEWLY_CREATED) | never auto-expires | — | ❌`
  - `Contract (ACTIVE, PT/REHAB) | end_date < now AND credits exhausted | EXPIRED | ✅`

Also update Rule C2 trigger text if it explicitly references "pre-ACTIVE" — change "A contract is in a pre-ACTIVE status" to "A contract is in `ACTIVE` status".

---

### Task 3 — PROGRAM.md: §6 Contract Workflow Lifecycle — migration note, new diagram, simplified transitions

**<read_first>**
- `docs/PROGRAM.md` lines 425–481 — read §6 in full; confirm exact line ranges
- `.planning/phases/09-documentation/09-RESEARCH.md` §1.5 — exact ASCII diagram text, migration note text, and transitions-by-role text
- `.planning/phases/09-documentation/09-CONTEXT.md` D-08, D-09 — migration note placement
</read_first>

**<acceptance_criteria>**
```
# Migration note with v1.1 present
grep -c 'v1.1' docs/PROGRAM.md
→ ≥ 1 (migration note contains "v1.1 (2026-04)")

# ASCII diagram: contains all 4 valid statuses
grep -E 'NEWLY_CREATED|ACTIVE|CANCELED|EXPIRED' docs/PROGRAM.md | grep -A 30 'Contract Workflow Lifecycle'
→ contains all 4 status names; no CUSTOMER_REVIEW/CUSTOMER_CONFIRMED/CUSTOMER_PAID/PT_CONFIRMED

# Transitions by Role: no deprecated status names
grep -E 'CUSTOMER_REVIEW|CUSTOMER_CONFIRMED|CUSTOMER_PAID|PT_CONFIRMED' docs/PROGRAM.md | grep -v '//\|removed\|deprecated'
→ 0 matches (grep returns exit code 1)

# §6 ASCII diagram shape: NEWLY_CREATED → ACTIVE branch, ACTIVE → EXPIRED, side branch CANCELED
grep 'Create Session button' docs/PROGRAM.md
→ 0 matches (old trigger-date modal reference gone)
```
</acceptance_criteria>

**<action>**

**§6 header — Insert migration note block above the ASCII diagram (line 427):**
```
> **v1.1 Change (2026-04):** In v1.1 (2026-04), the contract flow was
> simplified from 6 states to 4. The statuses `CUSTOMER_REVIEW`,
> `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, and `PT_CONFIRMED` were removed.
> Existing contracts in those states were migrated to `ACTIVE`.
```

**§6 ASCII diagram — REPLACE ENTIRELY (lines 427–467):**
- **FROM:** Full 6-state diagram with intermediate states and multiple EXPIRED branches
- **TO:**
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

**§6 Status Transitions by Role — REPLACE (lines 469–480):**
- **FROM:** ADMIN/STAFF/CUSTOMER with intermediate state transitions
- **TO:**
```
ADMIN:  Can force any status to any other (except blocked by expiry rules)
STAFF:  NEWLY_CREATED → CANCELED (sale_by ownership required)
CUSTOMER: NEWLY_CREATED → ACTIVE (purchased_by ownership required)
          NEWLY_CREATED → CANCELED (❌ — customer cannot cancel)
```

---

### Task 4 — PROGRAM.md: Appendix ContractStatus type, header date update

**<read_first>**
- `docs/PROGRAM.md` lines 624–647 — read Appendix TypeScript Types in full
- `.planning/phases/09-documentation/09-RESEARCH.md` §1.8 — Appendix changes checklist
</read_first>

**<acceptance_criteria>**
```
# ContractStatus type in Appendix: only 4 values
grep -A 10 'type ContractStatus' docs/PROGRAM.md
→ output contains only: NEWLY_CREATED, ACTIVE, CANCELED, EXPIRED

# No deprecated values in ContractStatus type block
grep -E 'CUSTOMER_REVIEW|CUSTOMER_CONFIRMED|CUSTOMER_PAID|PT_CONFIRMED' docs/PROGRAM.md
→ 0 matches across entire file (all references removed)
```
</acceptance_criteria>

**<action>**

**Header date — UPDATE (line 3):**
- **FROM:** `> **Last updated:** 2026-04-01`
- **TO:** `> **Last updated:** 2026-04-12`

**Appendix ContractStatus type — REPLACE (lines 636–647):**
- **FROM:**
```typescript
type ContractStatus =
  | 'NEWLY_CREATED'
  | 'CUSTOMER_REVIEW'
  | 'CUSTOMER_CONFIRMED'
  | 'CUSTOMER_PAID'
  | 'PT_CONFIRMED'
  | 'ACTIVE'
  | 'CANCELED'
  | 'EXPIRED'
```
- **TO:**
```typescript
type ContractStatus =
  | 'NEWLY_CREATED'
  | 'ACTIVE'
  | 'CANCELED'
  | 'EXPIRED'
```

---

### Task 5 — cursor/rules: §5 Lifecycle state machines — rewrite for 4-state model

**<read_first>**
- `.cursor/rules/gochul-fitness-rules.mdc` — read in full; confirm exact line ranges for all sections to edit
- `.planning/phases/09-documentation/09-RESEARCH.md` §2 — exact replacement text for each cursor/rules section
</read_first>

**<acceptance_criteria>**
```
# §5 Contract statuses line: shows 4-state model only
grep -n 'Contract statuses' .cursor/rules/gochul-fitness-rules.mdc
→ line shows: NEWLY_CREATED -> ACTIVE -> EXPIRED ; CANCELED on terminal branch

# No deprecated status values in §5 or §6
grep -n 'CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED' .cursor/rules/gochul-fitness-rules.mdc
→ 0 matches (exit code 1)

# §5 Transition enforcement: no intermediate-state transition rules remain
grep -n 'CUSTOMER_REVIEW ->\|CUSTOMER_CONFIRMED ->\|CUSTOMER_PAID ->\|PT_CONFIRMED ->' .cursor/rules/gochul-fitness-rules.mdc
→ 0 matches

# §5 Auto-expire rules: NEWLY_CREATED does-not-expire note present
grep -c "NEWLY_CREATED.*do not auto-expire\|NEWLY_CREATED.*never auto-expire" .cursor/rules/gochul-fitness-rules.mdc
→ ≥ 1

# §6 Contract card identity display rules: block removed entirely
grep -n 'Contract card identity display rules' .cursor/rules/gochul-fitness-rules.mdc
→ 0 matches (exit code 1)
```
</acceptance_criteria>

**<action>**

**§5 Contract statuses line (lines 98–101) — REPLACE:**
- **FROM:**
```
### Contract statuses
`NEWLY_CREATED -> CUSTOMER_REVIEW -> CUSTOMER_CONFIRMED -> CUSTOMER_PAID -> PT_CONFIRMED -> ACTIVE -> EXPIRED`
Terminal side branch: `CANCELED`
```
- **TO:**
```
### Contract statuses
`NEWLY_CREATED -> ACTIVE -> EXPIRED`
Terminal side branch: `CANCELED`
`NEWLY_CREATED` contracts do not auto-expire — they remain pending until manually activated (`→ ACTIVE`) or canceled (`→ CANCELED`).
```

**§5 Transition enforcement block (lines 103–116) — REPLACE:**
- **FROM:** 10-line block covering STAFF `NEWLY_CREATED → CUSTOMER_REVIEW`, `CUSTOMER_PAID → PT_CONFIRMED`, CUSTOMER `CUSTOMER_REVIEW → CUSTOMER_CONFIRMED`, etc.
- **TO:**
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

**§5 Contract action-button runtime behavior (lines 118–139) — REWRITE:**
- **FROM:** Full button map for all 8 statuses per role, including intermediate states and trigger-date dialog
- **TO:**
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

**§5 Auto-expire rules (lines 141–145) — UPDATE:**
- **FROM:** `"pre-active status and end_date < now"` wording
- **TO:**
```
#### Auto-expire contract rules
- On contract list and status update paths, contracts may be auto-set to `EXPIRED` when:
  - status is `ACTIVE`, `end_date < now`, and no available credits remain (for `PT`/`REHAB`), where consumed credits are counted from history with status `NEWLY_CREATED` or `CHECKED_IN`
- `NEWLY_CREATED` contracts do not auto-expire.
- `ADMIN` can force-expire any contract.
```

**§6 Contract card identity display rules (lines 202–237) — REMOVE ENTIRE BLOCK.**
This block covers deprecated intermediate-state button rendering rules (CUSTOMER_REVIEW Confirm Details, CUSTOMER_PAID PT Confirm Receipt, etc.) which are all removed in the 4-state model. Remove the entire block starting at "#### Contract card identity display rules" (line 202) through the "Create Session button behavior" paragraph (line 237).

**POST-REMOVAL NOTE (optional but recommended at executor's discretion):**
The "Create Session button behavior" paragraph (formerly lines 235–237) was part of this block and has been removed. Re-add it as a standalone note after the `/contracts` page description, or as part of the contracts page section, with this text:
```
- Create Session button behavior:
  - shown only when contract is `ACTIVE` and user is `ADMIN`/`STAFF`, or `CUSTOMER` owner.
  - for `PT`/`REHAB`, requires `used_credits < credits`; for `PT_MONTHLY`, credit-cap check is bypassed.
```

---

## Final Verification (run after ALL tasks complete)

After completing all tasks, run these commands in sequence and confirm each returns zero matches / expected values before marking done:

```bash
# 1. PROGRAM.md: zero deprecated status references
grep -n 'CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED' docs/PROGRAM.md
# → exit code 1 (zero matches)

# 2. cursor/rules: zero deprecated status references
grep -n 'CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED' .cursor/rules/gochul-fitness-rules.mdc
# → exit code 1 (zero matches)

# 3. PROGRAM.md §4 RBAC: exactly 5 transition rows
awk '/\| Transition/,/^## / {print}' docs/PROGRAM.md | grep '→' | grep -v '----' | wc -l
# → 5

# 4. PROGRAM.md §6: migration note present
grep 'v1.1 (2026-04)' docs/PROGRAM.md
# → 1 match (migration note blockquote in §6)

# 5. cursor/rules §5: only 4 statuses in lifecycle line
grep -A 2 '### Contract statuses' .cursor/rules/gochul-fitness-rules.mdc
# → NEWLY_CREATED -> ACTIVE -> EXPIRED; terminal CANCELED on separate line

# 6. cursor/rules §6: contract card display block removed
grep -n 'Contract card identity display rules' .cursor/rules/gochul-fitness-rules.mdc
# → exit code 1 (zero matches)
```

---

## Dependency Map

```
Task 1 ──────────────────────────────────────────────────────────┐
(§1, §2, §4 RBAC)                                                │
                                                                ▼
Task 2 ───────────────────────────────────────────────────────┐ │
(§5 expiry rules)                                              │ │
                                                              │ ▼
Task 3 ───────────────────────────────────────────────────┐  │ │
(§6 lifecycle diagram, migrations note)                      │  │ │
                                                            │  │ ▼
Task 4 ─────────────────────────────────────────────────┐  │  │ │
(Appendix ContractStatus type, header date)              │  │  │ │
                                                            │  │ │ │
                                                            ▼  │  │ │
Task 5 ───────────────────────────────────────────────┐  │  │  │ │
(.cursor/rules all sections)                           │  │  │  │ │
                                                          │  │  │ │ │
                                                          ▼  ▼  ▼ ▼
                                                    Final Verification
```

Tasks 1–4 are sequential against `docs/PROGRAM.md` (each task reads its target file sections first). Task 5 is independent and can run in parallel with Tasks 1–4, but all edits to PROGRAM.md should complete before or concurrently with Task 5. Both files must pass verification before Phase 9 is marked complete.

---

## Coverage Checklist

| Requirement | Covered by Task |
|------------|----------------|
| DOCS-01: PROGRAM.md lifecycle diagram updated to 4-state | Task 3 |
| DOCS-02: PROGRAM.md RBAC transition table updated | Task 1 |
| DOCS-03: PROGRAM.md expiry rules updated for 4-state | Task 2 |
| DOCS-04: cursor/rules updated with new lifecycle and status values | Task 5 |
