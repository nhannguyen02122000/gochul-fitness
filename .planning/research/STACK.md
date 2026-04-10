# Stack Research

**Domain:** Contract State Machine Simplification — Next.js/TypeScript/InstantDB
**Researched:** 2026-04-10
**Confidence:** HIGH

## Context

This is not a technology addition — it is a **state machine reduction**. The current 6-state contract flow (`NEWLY_CREATED → CUSTOMER_REVIEW → CUSTOMER_CONFIRMED → CUSTOMER_PAID → PT_CONFIRMED → ACTIVE`) is being collapsed to a 2-state flow (`NEWLY_CREATED → ACTIVE`), with the intermediate statuses removed entirely. No new libraries are needed; the work is purely in typing, logic, and UI layers.

---

## Recommended Approach: Zero New Stack

### Rationale

The app already has all required capabilities. No package additions, no architecture shifts, no new services. The work is:

1. **Remove dead types** from `ContractStatus` union
2. **Rewrite transition validation** in `updateStatus/route.ts`
3. **Prune status utilities** in `statusUtils.ts`
4. **Update badge/map constants** referencing removed statuses
5. **Update AI chatbot tool definitions** so the bot stops proposing removed transitions

Adding any new library (e.g., XState, Zustand state machines) would be disproportionate overhead for removing 4 string literals from an enum and their handlers.

---

## Files to Change

### 1. `src/app/type/api/index.ts`

**What:** Remove 4 values from `ContractStatus` union.

**Why:** The TypeScript type is the source of truth for all downstream consumers. Removing `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` from the union forces the compiler to catch every stale reference automatically.

**Change:**
```typescript
// BEFORE
export type ContractStatus =
    | 'NEWLY_CREATED'
    | 'CUSTOMER_REVIEW'      // ← remove
    | 'CUSTOMER_CONFIRMED'   // ← remove
    | 'CUSTOMER_PAID'        // ← remove
    | 'PT_CONFIRMED'         // ← remove
    | 'ACTIVE'
    | 'CANCELED'
    | 'EXPIRED'

// AFTER
export type ContractStatus =
    | 'NEWLY_CREATED'
    | 'ACTIVE'
    | 'CANCELED'
    | 'EXPIRED'
```

---

### 2. `src/app/api/contract/updateStatus/route.ts`

**What:** Rewrite the STAFF and CUSTOMER transition blocks; remove `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` from `validStatuses` array.

**Why:** This is the RBAC enforcement layer. The current STAFF block allows `NEWLY_CREATED→CUSTOMER_REVIEW` and `CUSTOMER_PAID→PT_CONFIRMED` — both are gone. The CUSTOMER block has 4 transition branches, all of which collapse to a single `PT_CONFIRMED→ACTIVE` path that must become `NEWLY_CREATED→ACTIVE`.

**Key changes:**

- `validStatuses` array: remove 4 entries, keep `NEWLY_CREATED`, `ACTIVE`, `CANCELED`, `EXPIRED`
- STAFF role: strip all transition logic — STAFF can no longer change status themselves (they create the contract; customer activates it). Remove the STAFF transition block entirely, keeping only the `CANCELED` cancel guard.
- CUSTOMER role: collapse to `currentStatus === 'NEWLY_CREATED' && newStatus === 'ACTIVE'`
- ADMIN role: unchanged (ADMIN can still force any status)

**After:**
```typescript
} else if (role === 'STAFF') {
  // STAFF can cancel pre-ACTIVE contracts (handled by CANCELED block above)
  // STAFF cannot transition to ACTIVE — only CUSTOMER can
  if (newStatus !== 'CANCELED') {
    return NextResponse.json(
      { error: 'STAFF can only cancel contracts' },
      { status: 403 }
    )
  }
} else if (role === 'CUSTOMER') {
  const isAllowedCustomerTransition =
    (currentStatus === 'NEWLY_CREATED' && newStatus === 'ACTIVE')

  if (!isAllowedCustomerTransition) {
    return NextResponse.json(
      { error: 'Invalid status transition for CUSTOMER role' },
      { status: 403 }
    )
  }
}
```

**Do not change:** The date-adjustment block (`if (newStatus === 'ACTIVE')`) — it is still valid and handles the trigger-date modal confirmed by the UI.

---

### 3. `src/utils/statusUtils.ts`

**What:** Rework 6 functions.

**Why:** `statusUtils.ts` is the primary UI-facing utility layer. Every function references removed statuses.

**Functions to change:**

| Function | Change |
|----------|--------|
| `getContractActionButtons` | ADMIN: remove `Send to Customer` and all intermediate buttons → only `Cancel` on `NEWLY_CREATED`. STAFF: only `Cancel` on `NEWLY_CREATED`. CUSTOMER: only `Activate` on `NEWLY_CREATED`, no cancel. |
| `isPreActiveContractStatus` | Remove all intermediate statuses — only `NEWLY_CREATED` remains as pre-active |
| `canViewContract` | **Critical change:** CUSTOMER cannot see `NEWLY_CREATED` → CUSTOMER **can** see `NEWLY_CREATED` (per new flow spec: "customer can see it from this moment") |
| `getContractStatusText` | Remove entries for `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` |
| `getContractStatusVariant` | Remove entries for the 4 removed statuses |
| `CONTRACT_STATUS_ICON` | Remove entries for the 4 removed statuses |

---

### 4. `src/app/api/contract/getAll/route.ts`

**What:** Remove 4 statuses from `CONTRACT_STATUS_VALUES`; change CUSTOMER scope to include `NEWLY_CREATED`.

**Why:** `getAll` is the primary data-fetching route. `CONTRACT_STATUS_VALUES` is the allowlist for the `statuses` filter — removing the 4 values prevents filtering to them. The CUSTOMER role block currently excludes `NEWLY_CREATED` from the visible scope — this must be inverted per the new flow.

**Changes:**
```typescript
const CONTRACT_STATUS_VALUES: ContractStatus[] = [
  'NEWLY_CREATED',   // now visible to CUSTOMER
  'ACTIVE',
  'CANCELED',
  'EXPIRED'
]

// In CUSTOMER role block — replace the NEWLY_CREATED exclusion:
// REMOVE:
const customerVisibleStatuses = CONTRACT_STATUS_VALUES.filter(
  (status) => status !== 'NEWLY_CREATED'
)
// REPLACE with: no filter — CUSTOMER sees all statuses from NEWLY_CREATED onward
```

Also update `isPreActiveContractStatus` usage in this file to match the simplified function.

---

### 5. `src/components/cards/ContractCard.tsx`

**What:** Verify button rendering matches simplified `getContractActionButtons` output; wire CANCELED confirmation popup.

**Why:** `ContractCard` calls `getContractActionButtons` and renders its result. After the utility rewrite, it will automatically render the correct buttons (Cancel for ADMIN/STAFF on `NEWLY_CREATED`, Activate for CUSTOMER on `NEWLY_CREATED`). The `handleStatusChange` → `executeStatusChange` flow and the activation confirmation dialog already handle the trigger-date modal — no structural changes needed.

**Watch for:**
- The `pendingActivation` state and confirmation dialog should remain — they handle the "show modal if trigger date is not today" requirement.
- The `CANCELED` confirmation popup (red button + popup) must be wired in `handleStatusChange` when `newStatus === 'CANCELED'` — the spec requires "a color of red button and a popup to ask for user's confirmation before this action."

---

### 6. `src/lib/ai/toolDefinitions.ts`

**What:** Update `update_contract_status` tool description and enum values.

**Why:** The AI chatbot uses tool definitions passed to the Claude API. The tool's description and enum tell the AI which transitions are valid. If not updated, the AI will propose removed transitions (e.g., "send to customer review") and those calls will fail at the API layer.

**Changes in `update_contract_status.description`:**
```
BEFORE:
'STAFF: NEWLY_CREATED→CUSTOMER_REVIEW, CUSTOMER_PAID→PT_CONFIRMED, ...'
'CUSTOMER: CUSTOMER_REVIEW→CUSTOMER_CONFIRMED/CANCELED, ...'

AFTER:
'STAFF: can cancel NEWLY_CREATED contracts. Cannot transition to ACTIVE.'
'CUSTOMER: NEWLY_CREATED→ACTIVE. Can cancel NEWLY_CREATED contracts.'
```

**Changes in `status` enum:**
- Remove: `'CUSTOMER_REVIEW'`, `'CUSTOMER_CONFIRMED'`, `'CUSTOMER_PAID'`, `'PT_CONFIRMED'`
- Keep: `'NEWLY_CREATED'`, `'ACTIVE'`, `'CANCELED'`, `'EXPIRED'`
- Update default: `'NEWLY_CREATED'`

---

### 7. `src/lib/ai/systemPrompt.ts`

**What:** Update contract workflow description.

**Why:** The system prompt is embedded in every AI chatbot conversation. Stale descriptions of the 6-state flow would confuse the AI about which transitions to suggest.

**Changes:** Replace the contract lifecycle description with the simplified flow. Update the `update_contract_status` rules section to match the new allowed transitions.

---

## What NOT to Add

| Avoid | Why |
|-------|-----|
| **XState or any state machine library** | The app's state machine is a 4-string union, not a complex reactive system. XState would add ~50KB+ bundle weight for zero runtime benefit. |
| **New Zustand stores** | `useAIChatbotStore` already exists for chatbot state. Session/modal state is already in components. No new global state needed. |
| **Additional API routes** | No new endpoints required. The existing `updateStatus` route handles the simplified flow with minor logic changes. |
| **Database migrations** | InstantDB is schemaless. No schema migration needed — simply stop using the 4 removed status values. |
| **New TanStack Query hooks** | Existing `useUpdateContractStatus` and `useContracts` hooks already call the right endpoints. |

---

## Integration Points Summary

| File | Role | Change Scope |
|------|------|-------------|
| `src/app/type/api/index.ts` | Type source of truth | Remove 4 from union |
| `src/app/api/contract/updateStatus/route.ts` | RBAC enforcement | Rewrite STAFF/CUSTOMER transition blocks |
| `src/app/api/contract/getAll/route.ts` | Data fetching + customer visibility | Update allowlist + scope |
| `src/utils/statusUtils.ts` | UI utility layer | Rewrite 6 functions |
| `src/components/cards/ContractCard.tsx` | Contract UI | Wire CANCELED confirmation popup; rest auto-corrects |
| `src/lib/ai/toolDefinitions.ts` | AI tool schema | Update description + enum |
| `src/lib/ai/systemPrompt.ts` | AI instructions | Update workflow description |
| `docs/PROGRAM.md` | Runtime behavior doc | Update lifecycle diagram + RBAC tables |
| `.cursor/rules/gochul-fitness-rules.mdc` | Cursor rules | Update state machine rules |

---

## Rollout Note

Because this is a **removal** (not an addition), the changes are safe to deploy in a single PR. The TypeScript compiler will surface any stale references as errors, making accidental retention of removed statuses impossible. No feature flags needed.

**Test the following manually after deploy:**
1. ADMIN creates a contract → verify it appears as `NEWLY_CREATED`
2. CUSTOMER activates the contract → verify it transitions to `ACTIVE`
3. ADMIN cancels a `NEWLY_CREATED` contract → verify red popup confirmation appears
4. STAFF cannot transition a contract to ACTIVE (API should return 403)
5. AI chatbot: verify it no longer proposes "send to customer review" or "confirm payment"

---

*Stack research for: Contract State Machine Simplification v1.1*
*Researched: 2026-04-10*
