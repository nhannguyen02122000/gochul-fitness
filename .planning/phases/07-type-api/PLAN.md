---
gsd_plan_version: 1.0
wave: 1
phase: 07-type-api
depends_on: []
files_modified:
  - src/app/type/api/index.ts
  - src/app/api/contract/updateStatus/route.ts
  - src/app/api/contract/getAll/route.ts
  - src/app/api/contract/update/route.ts
  - src/app/api/history/create/route.ts
  - src/utils/statusUtils.ts
  - src/app/(main)/contracts/page.tsx
autonomous: false
---

# Phase 7 Plan: Type & API

**Phase:** 7 of v1.1
**Goal:** Remove 4 deprecated `ContractStatus` values from TypeScript types; add transition guards for `NEWLY_CREATED → CANCELED` (STAFF/ADMIN) and `NEWLY_CREATED → ACTIVE` (CUSTOMER); expose `NEWLY_CREATED` to CUSTOMER in `canViewContract()`. No new features — only removing deprecated states and updating transition logic.

**Requirements:** TYPE-01, API-01, API-02, API-03, API-04, API-05, API-06, API-07

---

## Wave 1 (Type-only changes — can run in parallel)

### Task 1.1 — Update `ContractStatus` union type (`src/app/type/api/index.ts`)

<read_first>
- `src/app/type/api/index.ts` lines 11–19 — current `ContractStatus` union
</read_first>

<action>
Replace lines 11–19 of `src/app/type/api/index.ts` with:

```typescript
export type ContractStatus =
    | 'NEWLY_CREATED'
    | 'ACTIVE'
    | 'CANCELED'
    | 'EXPIRED'
```

Keep all other types in the file unchanged. Specifically:
- `DeprecatedContractStatus` (line 535) and `MigrateContractStatusesPreviewContract`/`MigrateContractStatusesSuccessResponse` must remain for the Phase 6 migration types.
- All other type definitions must remain as-is.
</action>

<acceptance_criteria>
- `grep -n "ContractStatus" src/app/type/api/index.ts` shows no `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, or `PT_CONFIRMED` in the union type definition (lines 11–15)
- `grep -n "DeprecatedContractStatus" src/app/type/api/index.ts` returns the line with the deprecated type (migrations need it)
- `UpdateContractStatusRequest.status` field type is `ContractStatus` (line 352) — no manual change needed since it already references the union; TypeScript will enforce the new union once the type is updated
</acceptance_criteria>

---

### Task 1.2 — Update `validStatuses` array in `updateStatus/route.ts`

<read_first>
- `src/app/api/contract/updateStatus/route.ts` lines 132–141 — current `validStatuses` array
</read_first>

<action>
Replace the `validStatuses` array (lines 132–141) in `src/app/api/contract/updateStatus/route.ts` with:

```typescript
    const validStatuses: ContractStatus[] = [
      'NEWLY_CREATED',
      'ACTIVE',
      'CANCELED',
      'EXPIRED'
    ]
```

This removes `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` from the allowed values in the guard (API-05 / TYPE-01).
</action>

<acceptance_criteria>
- `grep -A 5 "const validStatuses" src/app/api/contract/updateStatus/route.ts` shows only `NEWLY_CREATED | ACTIVE | CANCELED | EXPIRED`
- No `CUSTOMER_REVIEW | CUSTOMER_CONFIRMED | CUSTOMER_PAID | PT_CONFIRMED` appear in the `validStatuses` array
</acceptance_criteria>

---

### Task 1.3 — Update `CONTRACT_STATUS_VALUES` in `getAll/route.ts` + remove CUSTOMER `NEWLY_CREATED` filter

<read_first>
- `src/app/api/contract/getAll/route.ts` lines 12–21 — current `CONTRACT_STATUS_VALUES` array
- `src/app/api/contract/getAll/route.ts` lines 251–281 — CUSTOMER status filter block
</read_first>

<action>
**Part A — Update `CONTRACT_STATUS_VALUES` array**

Replace the `CONTRACT_STATUS_VALUES` array (lines 12–21) in `src/app/api/contract/getAll/route.ts` with:

```typescript
const CONTRACT_STATUS_VALUES: ContractStatus[] = [
  'NEWLY_CREATED',
  'ACTIVE',
  'CANCELED',
  'EXPIRED'
]
```

**Part B — Remove the CUSTOMER `NEWLY_CREATED` filter block**

Replace the entire CUSTOMER status filter block (lines 251–281) with:

```typescript
    if (statusesFilter.length === 1) {
      contractWhere.status = statusesFilter[0]
    } else if (statusesFilter.length > 1) {
      contractWhere.status = { $in: statusesFilter }
    }
```

This implements API-06: CUSTOMER can now see `NEWLY_CREATED` contracts (D-15, D-16). The old block explicitly excluded `NEWLY_CREATED` for CUSTOMER — that filter is now removed.
</action>

<acceptance_criteria>
- `grep -A 5 "const CONTRACT_STATUS_VALUES" src/app/api/contract/getAll/route.ts` shows only `NEWLY_CREATED | ACTIVE | CANCELED | EXPIRED`
- `grep "CUSTOMER must never see NEWLY_CREATED" src/app/api/contract/getAll/route.ts` returns no results (comment removed)
- `grep "NEWLY_CREATED" src/app/api/contract/getAll/route.ts` does NOT appear in any CUSTOMER-specific status filter logic
- CUSTOMER role no longer has a separate `contractWhere.status` branch with `NEWLY_CREATED` exclusion
</acceptance_criteria>

---

### Task 1.4 — Update `CONTRACT_STATUS_VALUES` in `update/route.ts`

<read_first>
- `src/app/api/contract/update/route.ts` lines 8–17 — current `CONTRACT_STATUS_VALUES` array
</read_first>

<action>
Replace the `CONTRACT_STATUS_VALUES` array (lines 8–17) in `src/app/api/contract/update/route.ts` with:

```typescript
const CONTRACT_STATUS_VALUES: ContractStatus[] = [
    'NEWLY_CREATED',
    'ACTIVE',
    'CANCELED',
    'EXPIRED'
]
```

This removes the 4 deprecated statuses from the validation array (TYPE-01).
</action>

<acceptance_criteria>
- `grep -A 5 "const CONTRACT_STATUS_VALUES" src/app/api/contract/update/route.ts` shows only `NEWLY_CREATED | ACTIVE | CANCELED | EXPIRED`
- No `CUSTOMER_REVIEW | CUSTOMER_CONFIRMED | CUSTOMER_PAID | PT_CONFIRMED` appear in the `CONTRACT_STATUS_VALUES` array
</acceptance_criteria>

---

### Task 1.5 — Simplify `isPreActiveContractStatus()` in `statusUtils.ts`

<read_first>
- `src/utils/statusUtils.ts` lines 130–138 — current `isPreActiveContractStatus()` function
</read_first>

<action>
Replace the `isPreActiveContractStatus()` function (lines 130–138) in `src/utils/statusUtils.ts` with:

```typescript
export function isPreActiveContractStatus(status: ContractStatus): boolean {
  return status === 'NEWLY_CREATED'
}
```

This implements D-17: only `NEWLY_CREATED` is a pre-ACTIVE status. The old multi-value logic (which listed all 4 deprecated statuses) is removed.
</action>

<acceptance_criteria>
- `grep -A 3 "export function isPreActiveContractStatus" src/utils/statusUtils.ts` shows only `return status === 'NEWLY_CREATED'`
- `grep "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" src/utils/statusUtils.ts | grep isPreActiveContractStatus` returns no results
</acceptance_criteria>

---

### Task 1.6 — Rewrite `getContractActionButtons()` in `statusUtils.ts`

<read_first>
- `src/utils/statusUtils.ts` lines 31–94 — current `getContractActionButtons()` function
</read_first>

<action>
Replace the entire `getContractActionButtons()` function (lines 31–94) in `src/utils/statusUtils.ts` with:

```typescript
export function getContractActionButtons(
  status: ContractStatus,
  role: Role
): ActionButton[] {
  const buttons: ActionButton[] = []

  if (role === 'ADMIN') {
    switch (status) {
      case 'NEWLY_CREATED':
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'ACTIVE':
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'CANCELED':
      case 'EXPIRED':
        // No actions for terminal statuses
        break
    }
  } else if (role === 'STAFF') {
    if (status === 'NEWLY_CREATED') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  } else if (role === 'CUSTOMER') {
    if (status === 'NEWLY_CREATED') {
      buttons.push({ label: 'Activate', nextStatus: 'ACTIVE', type: 'primary' })
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  }

  return buttons
}
```

This implements API-01 through API-04:
- ADMIN: force-cancel on `NEWLY_CREATED` and `ACTIVE` (D-08, D-09)
- STAFF: cancel on `NEWLY_CREATED` (D-05, D-06)
- CUSTOMER: activate + cancel on `NEWLY_CREATED` (D-10, D-11)
- No cases for deprecated statuses remain.
</action>

<acceptance_criteria>
- `grep "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" src/utils/statusUtils.ts` does NOT appear in `getContractActionButtons()`
- `grep "Send to Customer\|Confirm Details\|Payment Completed\|PT Confirm Receipt" src/utils/statusUtils.ts` returns no results
- `grep "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" src/utils/statusUtils.ts` returns no results anywhere in the file (see Task 1.7)
</acceptance_criteria>

---

### Task 1.7 — Remove deprecated status entries from status maps in `statusUtils.ts`

<read_first>
- `src/utils/statusUtils.ts` lines 185–197 — `getContractStatusText()`
- `src/utils/statusUtils.ts` lines 219–235 — `getContractStatusVariant()`
- `src/utils/statusUtils.ts` lines 238–247 — `CONTRACT_STATUS_ICON`
- `src/utils/statusUtils.ts` lines 281–293 — `getContractStatusColor()`
</read_first>

<action>
Replace each function/object as follows:

**`getContractStatusText()` (lines 185–197):**
```typescript
export function getContractStatusText(status: ContractStatus): string {
  const statusMap: Record<ContractStatus, string> = {
    'NEWLY_CREATED': 'Newly Created',
    'ACTIVE': 'Active',
    'CANCELED': 'Canceled',
    'EXPIRED': 'Expired'
  }
  return statusMap[status] || status
}
```

**`getContractStatusVariant()` (lines 219–235):**
```typescript
export function getContractStatusVariant(status: ContractStatus): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string } {
  const variantMap: Record<ContractStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    'NEWLY_CREATED': { variant: 'secondary', className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' },
    'EXPIRED':       { variant: 'secondary', className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' },
    'ACTIVE':        { variant: 'secondary', className: 'bg-[var(--color-success-bg)] text-[var(--color-success)]' },
    'CANCELED':      { variant: 'destructive', className: 'bg-red-50 text-red-700' },
  }
  return variantMap[status] || variantMap['NEWLY_CREATED']
}
```

**`CONTRACT_STATUS_ICON` (lines 238–247):**
```typescript
export const CONTRACT_STATUS_ICON: Record<ContractStatus, string> = {
  'NEWLY_CREATED': 'Circle',
  'ACTIVE':        'Zap',
  'CANCELED':      'XCircle',
  'EXPIRED':       'Clock',
}
```

**`getContractStatusColor()` (lines 281–293):**
```typescript
export function getContractStatusColor(status: ContractStatus): string {
  const colorMap: Record<ContractStatus, string> = {
    'NEWLY_CREATED': 'default',
    'ACTIVE': 'success',
    'CANCELED': 'error',
    'EXPIRED': 'default'
  }
  return colorMap[status] || 'default'
}
```

All deprecated status mappings (`CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED`) are removed from these lookups (D-18).
</action>

<acceptance_criteria>
- `grep "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" src/utils/statusUtils.ts` returns no results in `getContractStatusText()`, `getContractStatusVariant()`, `CONTRACT_STATUS_ICON`, or `getContractStatusColor()`
- `grep -A 3 "export function getContractStatusText" src/utils/statusUtils.ts` shows only 4 status entries
- `grep -A 6 "export function getContractStatusVariant" src/utils/statusUtils.ts` shows only 4 status entries
- `grep -A 5 "CONTRACT_STATUS_ICON" src/utils/statusUtils.ts` shows only 4 status entries
</acceptance_criteria>

---

### Task 1.8 — Update `contracts/page.tsx` — remove deprecated status filters

<read_first>
- `src/app/(main)/contracts/page.tsx` lines 62–71 — `CONTRACT_STATUSES` array
- `src/app/(main)/contracts/page.tsx` lines 147–158 — `availableStatuses` and `effectiveStatuses` useMemo
- `src/app/(main)/contracts/page.tsx` lines 226–233 — `contractsByStatus.pending` filter
</read_first>

<action>
**Part A — Update `CONTRACT_STATUSES` filter options array**

Replace the `CONTRACT_STATUSES` array (lines 62–71) with:

```typescript
const CONTRACT_STATUSES: { value: ContractStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'NEWLY_CREATED', label: 'Newly Created' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELED', label: 'Canceled' },
]
```

**Part B — Remove CUSTOMER-specific status filtering in `availableStatuses` and `effectiveStatuses`**

Replace the `availableStatuses` and `effectiveStatuses` useMemo blocks (lines 147–158) with:

```typescript
  const availableStatuses = CONTRACT_STATUSES

  const effectiveStatuses = statuses
```

This allows CUSTOMER to see `NEWLY_CREATED` contracts in the filter options — consistent with API-06.

**Part C — Simplify `contractsByStatus.pending`**

Replace the `pending` filter (lines 226–233) with:

```typescript
      pending: allContracts.filter(
        (c) => c.status === 'NEWLY_CREATED'
      ).length,
```
</action>

<acceptance_criteria>
- `grep "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" src/app/\(main\)/contracts/page.tsx` returns no results
- `grep "NEWLY_CREATED" src/app/\(main\)/contracts/page.tsx | grep -v "//\|label\|value" | grep -v "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED"` — `availableStatuses` no longer filters `NEWLY_CREATED` for CUSTOMER
- `grep -A 3 "contractsByStatus.pending" src/app/\(main\)/contracts/page.tsx` shows only `c.status === 'NEWLY_CREATED'` (no deprecated statuses)
</acceptance_criteria>

---

## Wave 2 (Transition guard rewrites — sequential dependency on Wave 1)

### Task 2.1 — Rewrite STAFF transitions (API-01)

<read_first>
- `src/app/api/contract/updateStatus/route.ts` lines 207–218 — current STAFF block
</read_first>

<action>
Replace the entire STAFF `else if (role === 'STAFF')` block (lines 207–218) with:

```typescript
    } else if (role === 'STAFF') {
      // STAFF can cancel NEWLY_CREATED contracts (with sale_by ownership check)
      if (newStatus === 'CANCELED' && currentStatus === 'NEWLY_CREATED') {
        // ownership check: STAFF can only cancel contracts they sold
        if (contract.sale_by !== userInstantId) {
          return NextResponse.json(
            { error: 'Forbidden - You can only cancel contracts you sold' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid status transition for STAFF role' },
          { status: 403 }
        )
      }
```

This implements API-01:
- STAFF can transition `NEWLY_CREATED → CANCELED`
- STAFF cancel requires `sale_by` ownership check (D-06)

The existing non-admin `CANCELED` block (lines 180–206) must be kept for CUSTOMER cancels on pre-ACTIVE contracts (D-05), but the `currentStatus === 'ACTIVE'` guard within it (line 182–187) now correctly blocks non-ADMINs from canceling ACTIVE contracts.
</action>

<acceptance_criteria>
- `grep -A 20 "role === 'STAFF'" src/app/api/contract/updateStatus/route.ts` shows the new STAFF block
- `grep "You can only cancel contracts you sold" src/app/api/contract/updateStatus/route.ts` returns the ownership error message for STAFF
- `grep "Invalid status transition for STAFF role" src/app/api/contract/updateStatus/route.ts` returns the error for disallowed STAFF transitions
</acceptance_criteria>

---

### Task 2.2 — Rewrite CUSTOMER transitions (API-04)

<read_first>
- `src/app/api/contract/updateStatus/route.ts` lines 219–237 — current CUSTOMER block
</read_first>

<action>
Replace the entire CUSTOMER `else if (role === 'CUSTOMER')` block (lines 219–237) with:

```typescript
    } else if (role === 'CUSTOMER') {
      if (contract.purchased_by !== userInstantId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only update contracts you purchased' },
          { status: 403 }
        )
      }

      if (newStatus === 'ACTIVE' && currentStatus === 'NEWLY_CREATED') {
        // CUSTOMER activates their own NEWLY_CREATED contract
        // Dates are reset to today in the update below (D-12)
      } else {
        return NextResponse.json(
          { error: 'Invalid status transition for CUSTOMER role' },
          { status: 403 }
        )
      }
```

This implements API-04:
- CUSTOMER can transition `NEWLY_CREATED → ACTIVE` (D-10)
- Requires `purchased_by` ownership check (D-11)
- Dates reset to today handled in the next task (Task 2.3)
</action>

<acceptance_criteria>
- `grep -A 18 "role === 'CUSTOMER'" src/app/api/contract/updateStatus/route.ts` shows the new CUSTOMER block
- `grep "Forbidden - You can only update contracts you purchased" src/app/api/contract/updateStatus/route.ts` returns the ownership error for CUSTOMER
- `grep "Invalid status transition for CUSTOMER role" src/app/api/contract/updateStatus/route.ts` returns the error for disallowed CUSTOMER transitions
- No `CUSTOMER_REVIEW | CUSTOMER_CONFIRMED | CUSTOMER_PAID | PT_CONFIRMED` transition logic remains in the CUSTOMER block
</acceptance_criteria>

---

### Task 2.3 — Remove `dateUpdates` logic from `updateStatus/route.ts` (API-04 part 2)

<read_first>
- `src/app/api/contract/updateStatus/route.ts` lines 245–272 — current date adjustment and update logic
</read_first>

<action>
Replace the entire date-adjustment block and the `updateData` declaration (lines 245–272) with:

```typescript
    // Update the contract status
    const updateData: {
      status: ContractStatus
      updated_at: number
      start_date: number
      end_date: number
    } = {
      status: newStatus,
      updated_at: now,
      start_date: now,
      end_date: now
    }
```

This removes the complex `dateUpdates` logic (D-13). When `newStatus === 'ACTIVE'` the dates are reset to `now` (today). When `newStatus === 'CANCELED'` the `start_date`/`end_date` are set to `now`, which is acceptable since canceled contracts don't need accurate dates. The old condition `if (newStatus === 'ACTIVE' && contract.start_date && contract.end_date)` is removed entirely.

Note: `start_date` and `end_date` are declared as optional in the `Contract` interface (`start_date?: number`, `end_date?: number`) but the transaction update uses them unconditionally — this is intentional as the API always writes them.
</action>

<acceptance_criteria>
- `grep -n "dateUpdates" src/app/api/contract/updateStatus/route.ts` returns no results (removed)
- `grep -n "contractDuration" src/app/api/contract/updateStatus/route.ts` returns no results (removed)
- `grep -n "now !== contract.start_date" src/app/api/contract/updateStatus/route.ts` returns no results (removed)
- `grep -A 4 "const updateData" src/app/api/contract/updateStatus/route.ts` shows `start_date: now, end_date: now` (no conditional date logic)
</acceptance_criteria>

---

### Task 2.4 — Update `canViewContract()` in `statusUtils.ts` (API-06)

<read_first>
- `src/utils/statusUtils.ts` lines 146–158 — current `canViewContract()` function
</read_first>

<action>
Replace the `canViewContract()` function (lines 146–158) in `src/utils/statusUtils.ts` with:

```typescript
export function canViewContract(status: ContractStatus, role: Role): boolean {
  // ADMIN and STAFF can view all contracts
  if (role === 'ADMIN' || role === 'STAFF') {
    return true
  }

  // CUSTOMER can view NEWLY_CREATED contracts (to see pending contracts to activate)
  // No restriction based on status for CUSTOMER
  return true
}
```

This implements API-06: CUSTOMER can now view `NEWLY_CREATED` contracts (D-15, D-16). The function previously returned `false` for CUSTOMER on `NEWLY_CREATED`.
</action>

<acceptance_criteria>
- `grep -A 10 "export function canViewContract" src/utils/statusUtils.ts` shows the updated function with no `status === 'NEWLY_CREATED'` guard for CUSTOMER
- `grep "return false" src/utils/statusUtils.ts` does NOT appear inside `canViewContract()` (no conditional false return for CUSTOMER)
</acceptance_criteria>

---

## Verification

After all tasks complete, run the following checks to confirm all requirements are met:

| Check | Command | Expected |
|-------|---------|----------|
| TYPE-01: ContractStatus union | `grep -A 5 "export type ContractStatus" src/app/type/api/index.ts` | `NEWLY_CREATED \| ACTIVE \| CANCELED \| EXPIRED` only |
| API-05: validStatuses | `grep -A 5 "const validStatuses" src/app/api/contract/updateStatus/route.ts` | 4 values, no deprecated statuses |
| API-01: STAFF cancel | `grep "You can only cancel contracts you sold" src/app/api/contract/updateStatus/route.ts` | Found |
| API-04: CUSTOMER activate | `grep "Forbidden - You can only update contracts you purchased" src/app/api/contract/updateStatus/route.ts` | Found |
| API-07: session ACTIVE guard | `grep "Contract is not active" src/app/api/history/create/route.ts` | Found (unchanged) |
| API-06: canViewContract CUSTOMER | `grep -A 10 "export function canViewContract" src/utils/statusUtils.ts` | No `status === 'NEWLY_CREATED'` restriction |
| dateUpdates removed | `grep "dateUpdates" src/app/api/contract/updateStatus/route.ts` | No results |
| getAll: CONTRACT_STATUS_VALUES | `grep -A 5 "const CONTRACT_STATUS_VALUES" src/app/api/contract/getAll/route.ts` | 4 values only |
| getAll: CUSTOMER filter removed | `grep "CUSTOMER must never see NEWLY_CREATED" src/app/api/contract/getAll/route.ts` | No results |
| update: CONTRACT_STATUS_VALUES | `grep -A 5 "const CONTRACT_STATUS_VALUES" src/app/api/contract/update/route.ts` | 4 values only |
| isPreActiveContractStatus | `grep -A 3 "export function isPreActiveContractStatus" src/utils/statusUtils.ts` | `return status === 'NEWLY_CREATED'` |
| statusUtils: no deprecated statuses | `grep "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" src/utils/statusUtils.ts` | No results |
| contracts/page.tsx: no deprecated statuses | `grep "CUSTOMER_REVIEW\|CUSTOMER_CONFIRMED\|CUSTOMER_PAID\|PT_CONFIRMED" src/app/\(main\)/contracts/page.tsx` | No results |
| TypeScript compilation | `npx tsc --noEmit 2>&1 \| head -30` | No errors related to removed status values |
