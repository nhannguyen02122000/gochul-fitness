# Phase 8: UI — Research

**Research date:** 2026-04-12
**Phase:** 08-ui

---

## Research Question

**"What do I need to know to PLAN this phase well?"**

---

## Summary

Phase 8 requires changes in exactly **two files**: `statusUtils.ts` (label text only) and `ContractCard.tsx` (Confirm Activation dialog → Cancel Confirmation dialog + cleanup). No TypeScript types, API routes, hooks, or other components need changes.

---

## What Is Already Correct (D-08 through D-15 from 08-CONTEXT.md)

These require **no changes**:

| What | Where | Verdict |
|------|-------|---------|
| `getContractActionButtons()` role/status logic | `statusUtils.ts` lines 31–61 | Correct — only labels need updating |
| `getContractStatusVariant()` badge styles | `statusUtils.ts` lines 174–182 | Correct — 4 statuses mapped, CSS tokens in use |
| `getContractStatusColor()` | `statusUtils.ts` lines 224–232 | Correct |
| `CONTRACT_STATUS_ICON` | `statusUtils.ts` lines 185–190 | Correct |
| `isPreActiveContractStatus()` | `statusUtils.ts` lines 98–100 | Correct — returns `true` only for `NEWLY_CREATED` |
| `canViewContract()` | `statusUtils.ts` lines 108–116 | Correct — CUSTOMER returns `true` unconditionally |
| `shouldShowContractActionButtons()` | `statusUtils.ts` lines 256–272 | Correct |
| `StatusBadge.tsx` | `src/components/common/StatusBadge.tsx` | Correct — derives all display from `statusUtils.ts`, cascades automatically |
| `getHistoryActionButtons()` | `statusUtils.ts` lines 69–86 | Unchanged — session lifecycle not affected by Phase 8 |

---

## Changes Required

### 1. `src/utils/statusUtils.ts` — Label text only (3 functions)

#### `getContractActionButtons()` — Line 40, 43, 52, 56, 57

**Current labels (English):**
```typescript
// ADMIN NEWLY_CREATED
{ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' }
// ADMIN ACTIVE
{ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' }
// STAFF NEWLY_CREATED
{ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' }
// CUSTOMER NEWLY_CREATED
{ label: 'Activate', nextStatus: 'ACTIVE', type: 'primary' }
{ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' }
```

**Change to (Vietnamese):**
```typescript
// ADMIN NEWLY_CREATED
{ label: 'Hủy', nextStatus: 'CANCELED', type: 'danger' }
// ADMIN ACTIVE
{ label: 'Hủy', nextStatus: 'CANCELED', type: 'danger' }
// STAFF NEWLY_CREATED
{ label: 'Hủy', nextStatus: 'CANCELED', type: 'danger' }
// CUSTOMER NEWLY_CREATED
{ label: 'Kích hoạt', nextStatus: 'ACTIVE', type: 'primary' }
{ label: 'Hủy', nextStatus: 'CANCELED', type: 'danger' }
```

#### `getContractStatusText()` — Lines 145–150

**Current:**
```typescript
'NEWLY_CREATED': 'Newly Created',
'ACTIVE':        'Active',
'CANCELED':      'Canceled',
'EXPIRED':       'Expired'
```

**Change to:**
```typescript
'NEWLY_CREATED': 'Mới tạo',
'ACTIVE':        'Đang hoạt động',
'CANCELED':      'Đã hủy',
'EXPIRED':       'Đã hết hạn'
```

#### `getHistoryActionButtons()` — Line 81 (if needed)
- `'Cancel'` label is internal (never shown on session cards per current behavior) — verify this before changing.

---

### 2. `src/components/cards/ContractCard.tsx` — Three coordinated changes

#### Change A: Remove trigger-date dialog logic from `handleStatusChange()` (lines 147–161)

**Current code (problematic):**
```typescript
const handleStatusChange = (newStatus: ContractStatus) => {
  if (newStatus === 'ACTIVE' && contract.start_date && contract.end_date) {
    const now = getCurrentTimestamp()
    if (now !== contract.start_date) {
      const contractDuration = contract.end_date - contract.start_date
      const newStartDate = now
      const newEndDate = now + contractDuration
      const durationDays = Math.ceil(contractDuration / (1000 * 60 * 60 * 24))
      setPendingActivation({ newStartDate, newEndDate, durationDays })
      setConfirmDialogOpen(true)
      return
    }
  }
  executeStatusChange(newStatus)
}
```

**Problem:** `getCurrentTimestamp()` returns `Date.now()` (milliseconds since 1970 epoch), while `contract.start_date` is also a millisecond timestamp but created at contract creation time. These are almost never equal, so this condition fires on every ACTIVATE click for any contract with dates set — incorrectly triggering the date-adjustment dialog. Per Phase 7 D-12: activating resets dates to now server-side, no user choice needed.

**Change to:**
```typescript
const handleStatusChange = (newStatus: ContractStatus) => {
  // CUSTOMER activate: API resets start_date/end_date to now server-side — no dialog needed
  // ADMIN/STAFF cancel: show Cancel Confirmation dialog (see handleCancelClick)
  executeStatusChange(newStatus)
}
```

#### Change B: Replace Confirm Activation dialog with Cancel Confirmation dialog (lines 339–378)

The existing `AlertDialog` (rendered when `confirmDialogOpen === true`) is currently the "Contract Date Adjustment" dialog. It must become the "Cancel Confirmation" dialog.

**New dialog:**
```tsx
<AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Xác nhận hủy hợp đồng</AlertDialogTitle>
      <AlertDialogDescription>
        Bạn có chắc chắn muốn hủy hợp đồng này?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Hủy</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          setConfirmDialogOpen(false)
          executeStatusChange('CANCELED')
        }}
        className="bg-destructive/10 text-destructive hover:bg-destructive/20"
      >
        Xác nhận hủy
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Dialog styling decision (D-42 in 08-CONTEXT):**
- `AlertDialogAction` uses `className="bg-destructive/10 text-destructive hover:bg-destructive/20"` — matches the `destructive` variant palette without adding new design tokens. Confirmed available in the design system via `globals.css`.
- "Xác nhận hủy" (Confirm Cancel) is the destructive CTA per D-04.
- "Hủy" (Cancel) button closes the dialog per D-04 — `AlertDialogCancel` already does this by default.

#### Change C: Cancel buttons must open the dialog, not call `handleStatusChange` directly

**Current button rendering (lines 301–318):**
```tsx
{actionButtons.map((button) => (
  <Button
    onClick={(e) => {
      e.stopPropagation()
      handleStatusChange(button.nextStatus as ContractStatus)
    }}
    ...
  />
))}
```

**Change:**
- For `button.nextStatus === 'CANCELED'`: open cancel confirmation dialog, do NOT call API
- For `button.nextStatus === 'ACTIVE'`: call `executeStatusChange('ACTIVE')` directly (loading state handles UX)

**Implementation approach — two options:**

**Option A (simplest — no new state):** Change button rendering to branch on `button.type`:
```tsx
{actionButtons.map((button) => (
  <Button
    onClick={(e) => {
      e.stopPropagation()
      if (button.type === 'danger') {
        setConfirmDialogOpen(true)
      } else {
        executeStatusChange(button.nextStatus as ContractStatus)
      }
    }}
    ...
  />
))}
```
- `type === 'danger'` → open cancel confirmation dialog (CANCELED action)
- `type === 'primary'` → call API directly (CUSTOMER ACTIVATE)

**Option B (more explicit):** Add a dedicated `handleCancelClick()`:
```tsx
const handleCancelClick = () => setConfirmDialogOpen(true)

<Button
  onClick={(e) => {
    e.stopPropagation()
    button.type === 'danger' ? handleCancelClick() : executeStatusChange(button.nextStatus as ContractStatus)
  }}
  ...
/>
```

**Decision: Option A** — no new state, no new functions, minimal diff.

#### Change D: Remove dead state `pendingActivation` (lines 97–101)

```typescript
// REMOVE:
const [pendingActivation, setPendingActivation] = useState<{
  newStartDate: number
  newEndDate: number
  durationDays: number
} | null>(null)
```

#### Change E: Remove `getCurrentTimestamp()` helper (lines 46–48)

```typescript
// REMOVE:
function getCurrentTimestamp() {
  return Date.now()
}
```

---

## CSS Custom Property Tokens (for reference)

The design system tokens from `src/theme/colors.ts` + `globals.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-cta` | `#F26076` | Primary CTA (Activate button) |
| `--color-success` | `#458B73` | Active/success states |
| `--color-success-bg` | `#E8F5EF` | Active/success background |
| `--color-warning` | `#FF9760` | Pending/warning states |
| `--color-warning-bg` | `#FFF4EC` | Pending/warning background |

The Cancel Confirmation dialog CTA uses `bg-destructive/10 text-destructive` (semantic danger) — no new CSS variable needed.

---

## AlertDialog API (from `src/components/ui/alert-dialog.tsx`)

Key props used in this phase:
- `<AlertDialog open={...} onOpenChange={...}>` — controlled open state
- `<AlertDialogContent>` — modal container, uses `size="default"` (already the default)
- `<AlertDialogHeader>` / `<AlertDialogFooter>` — layout slots
- `<AlertDialogTitle>` — heading text
- `<AlertDialogDescription>` — description text
- `<AlertDialogCancel>` — closes dialog on click (no explicit onClick needed)
- `<AlertDialogAction>` — confirm button, accepts `onClick` + `className`

All already imported in `ContractCard.tsx`.

---

## Re-render Trigger (TanStack Query)

After `executeStatusChange` calls `useUpdateContractStatus`:
- `onSuccess` → TanStack Query `queryClient.invalidateQueries({ queryKey: contractKeys.lists() })` fires
- `ContractCard` re-renders with new `contract.status === 'ACTIVE'`
- `getContractActionButtons()` now returns `[]` (no buttons for ACTIVE for CUSTOMER)
- Activate button disappears automatically — no manual DOM manipulation needed

This was already the mechanism; Phase 8 just confirms it works correctly after the label change.

---

## UI-06: Status Badge for Invalid Statuses

**Current fallback behavior (line 181):**
```typescript
return variantMap[status] || variantMap['NEWLY_CREATED']
```

If an unknown status somehow reaches `StatusBadge`, it silently renders as "Mới tạo" (NEWLY_CREATED variant).

**Analysis:** Phase 7 changed `ContractStatus` type to the 4-value union. If TypeScript is working correctly, no deprecated status value can reach this function at runtime. The fallback is defensive.

**Decision:** Keep the fallback as-is. The `|| variantMap['NEWLY_CREATED']` acts as a safe fallback rather than crashing. Adding a fifth `error` variant would require extending the badge component beyond what Phase 8 scope requires.

---

## UI-03: CUSTOMER Cancel on NEWLY_CREATED

**08-CONTEXT D-08 says:** `getContractActionButtons()` logic is correct — only labels need updating.

**Confirmed in current code (lines 54–58):**
```typescript
} else if (role === 'CUSTOMER') {
  if (status === 'NEWLY_CREATED') {
    buttons.push({ label: 'Activate', nextStatus: 'ACTIVE', type: 'primary' })
    buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
  }
}
```

CUSTOMER does get **both** Activate and Cancel buttons on NEWLY_CREATED. Both need confirmation UX:
- Activate → loading state → done
- Cancel → AlertDialog confirmation → API

**Button rendering (Option A above)** handles this by branching on `button.type`:
- `type === 'danger'` → cancel dialog
- `type === 'primary'` → direct API call

This correctly differentiates CUSTOMER's two buttons.

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/utils/statusUtils.ts` | 3 label changes: `getContractActionButtons` (5 labels), `getContractStatusText` (4 labels) |
| `src/components/cards/ContractCard.tsx` | 5 changes: replace dialog, simplify `handleStatusChange`, update button onClick, remove `pendingActivation`, remove `getCurrentTimestamp()` |
| `src/components/common/StatusBadge.tsx` | **No changes** — cascades automatically |
| Any other file | **No changes** |

---

## Open Questions / Clarifications Needed

| # | Question | Recommended Answer | Notes |
|---|----------|-------------------|-------|
| 1 | Does `getHistoryActionButtons()` label `'Cancel'` appear anywhere user-facing? | If not visible, no change needed; if visible on session cards, change to `'Hủy'` | Current session cards use `shouldShowHistoryActionButtons()` gating — check if label is ever rendered |
| 2 | Should the Cancel Confirmation dialog title/body be in Vietnamese or bilingual? | Vietnamese per D-01 (all user-facing labels in Vietnamese) | |
| 3 | Does `getHistoryStatusText()` need updating? | No — session lifecycle not in Phase 8 scope | |

---

*Research complete — ready to write 08-PLAN.md*
