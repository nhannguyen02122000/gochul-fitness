---
gsd_phase: 08
wave: 1
depends_on: []
files_modified:
  - src/utils/statusUtils.ts
  - src/components/cards/ContractCard.tsx
autonomous: true
requirements:
  - UI-01
  - UI-02
  - UI-03
  - UI-04
  - UI-05
  - UI-06
  - UI-07
  - UI-08
must_haves:
  - All contract action buttons use Vietnamese labels: 'Hủy' (Cancel), 'Kích hoạt' (Activate)
  - All contract status badges use Vietnamese text: 'Mới tạo', 'Đang hoạt động', 'Đã hủy', 'Đã hết hạn'
  - ADMIN/STAFF Cancel button triggers AlertDialog confirmation before calling API
  - CUSTOMER Activate button calls API directly with loading spinner
  - Contract Date Adjustment dialog fully removed from ContractCard.tsx
  - `getCurrentTimestamp()` and `pendingActivation` state removed from ContractCard.tsx
  - Cancel dialog title: "Xác nhận hủy hợp đồng", body: "Bạn có chắc chắn muốn hủy hợp đồng này?"
  - Cancel button label: "Hủy", Confirm button label: "Xác nhận hủy"
---

# Phase 08: UI — Plan

**Phase goal:** Update all UI components to reflect the simplified 4-state contract model (NEWLY_CREATED → ACTIVE → CANCELED/EXPIRED). All user-facing labels in Vietnamese.

## Tasks

### Task 1 — Update statusUtils.ts labels to Vietnamese

**Files read first:**
- `src/utils/statusUtils.ts` — the file being modified (lines 31–61 for button labels, lines 144–152 for status text)

**Changes:**

#### `getContractActionButtons()` — 5 button labels updated

**Lines 40, 43, 52, 56, 57** — change English labels to Vietnamese:

```typescript
// Line 40 — ADMIN NEWLY_CREATED
{ label: 'Hủy', nextStatus: 'CANCELED', type: 'danger' }

// Line 43 — ADMIN ACTIVE
{ label: 'Hủy', nextStatus: 'CANCELED', type: 'danger' }

// Line 52 — STAFF NEWLY_CREATED
{ label: 'Hủy', nextStatus: 'CANCELED', type: 'danger' }

// Line 56 — CUSTOMER NEWLY_CREATED Activate
{ label: 'Kích hoạt', nextStatus: 'ACTIVE', type: 'primary' }

// Line 57 — CUSTOMER NEWLY_CREATED Cancel
{ label: 'Hủy', nextStatus: 'CANCELED', type: 'danger' }
```

#### `getContractStatusText()` — 4 status labels updated

**Lines 145–150** — change English text to Vietnamese:

```typescript
const statusMap: Record<ContractStatus, string> = {
  'NEWLY_CREATED': 'Mới tạo',
  'ACTIVE':        'Đang hoạt động',
  'CANCELED':      'Đã hủy',
  'EXPIRED':       'Đã hết hạn',
}
```

**Acceptance criteria:**
- [ ] `getContractActionButtons()` returns `'Hủy'` for all Cancel buttons (ADMIN NEWLY_CREATED, ADMIN ACTIVE, STAFF NEWLY_CREATED, CUSTOMER NEWLY_CREATED)
- [ ] `getContractActionButtons()` returns `'Kích hoạt'` for the CUSTOMER Activate button
- [ ] `getContractStatusText('NEWLY_CREATED')` returns `'Mới tạo'`
- [ ] `getContractStatusText('ACTIVE')` returns `'Đang hoạt động'`
- [ ] `getContractStatusText('CANCELED')` returns `'Đã hủy'`
- [ ] `getContractStatusText('EXPIRED')` returns `'Đã hết hạn'`
- [ ] `StatusBadge.tsx` renders the new Vietnamese text automatically (cascades from `getContractStatusText`)

---

### Task 2 — Update ContractCard.tsx: remove trigger-date logic + replace dialog

**Files read first:**
- `src/components/cards/ContractCard.tsx` — the file being modified
- `src/components/ui/alert-dialog.tsx` — AlertDialog API confirmation
- `src/theme/colors.ts` — design token reference (for `bg-destructive/10 text-destructive` verification)

**Changes:**

#### A. Remove `getCurrentTimestamp()` function (lines 46–48)

Delete the entire `function getCurrentTimestamp()` block:

```typescript
// REMOVE THIS ENTIRE BLOCK:
function getCurrentTimestamp() {
  return Date.now()
}
```

#### B. Remove `pendingActivation` state (lines 97–101)

Delete the entire `useState` declaration for `pendingActivation`:

```typescript
// REMOVE THIS ENTIRE BLOCK:
const [pendingActivation, setPendingActivation] = useState<{
  newStartDate: number
  newEndDate: number
  durationDays: number
} | null>(null)
```

#### C. Simplify `handleStatusChange()` (lines 147–161)

Replace the current function body (which checks `now !== contract.start_date` and triggers the date-adjustment dialog) with:

```typescript
const handleStatusChange = (newStatus: ContractStatus) => {
  // CUSTOMER activate: API resets start_date/end_date to now server-side — no dialog needed
  // ADMIN/STAFF cancel: show Cancel Confirmation dialog (via button.onClick branching)
  executeStatusChange(newStatus)
}
```

#### D. Replace button `onClick` logic (lines 301–318)

Current code calls `handleStatusChange(button.nextStatus)` for every button. Replace with branching on `button.type`:

```typescript
{actionButtons.map((button) => (
  <Button
    key={button.nextStatus}
    variant={button.type === 'danger' ? 'destructive' : button.type === 'primary' ? 'default' : 'outline'}
    size="default"
    disabled={loadingStatus !== null && loadingStatus !== button.nextStatus}
    onClick={(e) => {
      e.stopPropagation()
      if (button.type === 'danger') {
        // ADMIN/STAFF/CUSTOMER Cancel: open confirmation dialog, do NOT call API yet
        setConfirmDialogOpen(true)
      } else {
        // CUSTOMER Activate: call API directly — loading state handles UX
        executeStatusChange(button.nextStatus as ContractStatus)
      }
    }}
    className={cn(
      'flex-1 min-w-[100px] text-sm h-10',
      button.type === 'primary' && 'bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]'
    )}
  >
    {loadingStatus === button.nextStatus && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
    {button.label}
  </Button>
))}
```

**Key behavior:**
- `type === 'danger'` → opens the Cancel Confirmation dialog; does NOT call API
- `type === 'primary'` → calls `executeStatusChange('ACTIVE')` directly with loading spinner

#### E. Replace AlertDialog content (lines 339–378)

The existing `AlertDialog` (currently "Contract Date Adjustment" dialog) becomes "Cancel Confirmation" dialog. Replace the entire `<AlertDialog>` block with:

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

**Acceptance criteria:**
- [ ] `getCurrentTimestamp` function does not exist in the file
- [ ] `pendingActivation` state does not exist in the file
- [ ] `handleStatusChange` function body contains only `executeStatusChange(newStatus)` with no conditional date-checking logic
- [ ] AlertDialog title is `Xác nhận hủy hợp đồng`
- [ ] AlertDialog description is `Bạn có chắc chắn muốn hủy hợp đồng này?`
- [ ] Cancel button shows `Hủy` and closes the dialog (default `AlertDialogCancel` behavior)
- [ ] Confirm button shows `Xác nhận hủy` and calls `executeStatusChange('CANCELED')`
- [ ] Confirm button uses `className="bg-destructive/10 text-destructive hover:bg-destructive/20"`
- [ ] Clicking a Cancel button opens the dialog; clicking "Xác nhận hủy" calls the API
- [ ] Clicking "Kích hoạt" button directly calls `executeStatusChange('ACTIVE')` with no dialog

---

## Verification

Run these checks to confirm all tasks are complete:

```bash
# Task 1: Verify Vietnamese labels in statusUtils.ts
grep -n "'Hủy'" src/utils/statusUtils.ts
# Expected: 4 occurrences (lines 40, 43, 52, 57 — 3 ADMIN/STAFF cancels + 1 CUSTOMER cancel)
grep -n "'Kích hoạt'" src/utils/statusUtils.ts
# Expected: 1 occurrence (line 56 — CUSTOMER activate)
grep -n "'Mới tạo'" src/utils/statusUtils.ts
# Expected: 1 occurrence (statusMap NEWLY_CREATED)
grep -n "'Đang hoạt động'" src/utils/statusUtils.ts
# Expected: 1 occurrence (statusMap ACTIVE)
grep -n "'Đã hủy'" src/utils/statusUtils.ts
# Expected: 1 occurrence (statusMap CANCELED)
grep -n "'Đã hết hạn'" src/utils/statusUtils.ts
# Expected: 1 occurrence (statusMap EXPIRED)

# Task 2: Verify ContractCard.tsx cleanup
grep -n "getCurrentTimestamp" src/components/cards/ContractCard.tsx
# Expected: 0 occurrences (function removed)
grep -n "pendingActivation" src/components/cards/ContractCard.tsx
# Expected: 0 occurrences (state removed)

# Task 2: Verify new dialog content
grep -n "Xác nhận hủy hợp đồng" src/components/cards/ContractCard.tsx
# Expected: 1 occurrence (AlertDialogTitle)
grep -n "Bạn có chắc chắn muốn hủy hợp đồng này?" src/components/cards/ContractCard.tsx
# Expected: 1 occurrence (AlertDialogDescription)
grep -n "Xác nhận hủy" src/components/cards/ContractCard.tsx
# Expected: 1 occurrence (AlertDialogAction label)
grep -n "bg-destructive/10 text-destructive" src/components/cards/ContractCard.tsx
# Expected: 1 occurrence (AlertDialogAction className)

# Task 2: Verify no trigger-date dialog logic remains
grep -n "Contract Date Adjustment" src/components/cards/ContractCard.tsx
# Expected: 0 occurrences (old dialog title removed)
grep -n "Confirm & Activate" src/components/cards/ContractCard.tsx
# Expected: 0 occurrences (old confirm button removed)

# TypeScript compilation
npx tsc --noEmit 2>&1 | head -20
# Expected: no errors
```

---

## Side Effects (cascading automatic updates)

Per 08-CONTEXT D-14, `StatusBadge.tsx` reads from `getContractStatusText()`, `getContractStatusVariant()`, `CONTRACT_STATUS_ICON` — all defined in `statusUtils.ts`. When `getContractStatusText()` returns Vietnamese labels, `StatusBadge` renders them automatically. No changes needed to `StatusBadge.tsx`.

---

## Deferred Items

| Item | Reason |
|------|--------|
| UI-02 trigger-date modal | Phase 7 D-12 decided: activating resets dates server-side, no user choice needed. The modal was removed. `REQUIREMENTS.md` UI-02 text refers to this but it is not built. |