# Phase 8: UI - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Update all UI components to reflect the simplified 2-state contract model (NEWLY_CREATED → ACTIVE → CANCELED/EXPIRED). Phase 7 already updated the TypeScript types and API transition guards. Phase 8 updates the UI layer: buttons, badges, and dialogs. No new features.

</domain>

<decisions>
## Implementation Decisions

### Label Language
- **D-01:** All button labels and status text in Vietnamese — user-facing UI is for Vietnamese gym users
  - `getContractActionButtons()`: `'Hủy'` (Cancel), `'Kích hoạt'` (Activate)
  - `getContractStatusText()`: `'Mới tạo'` (Newly Created), `'Đang hoạt động'` (Active), `'Đã hủy'` (Canceled), `'Đã hết hạn'` (Expired)

### Cancel UX (UI-01)
- **D-02:** ADMIN/STAFF Cancel: show `AlertDialog` confirmation before calling API
- **D-03:** Cancel dialog content: "Bạn có chắc chắn muốn hủy hợp đồng này?" (Are you sure you want to cancel this contract?)
- **D-04:** Cancel dialog: "Hủy" (Cancel) button closes dialog, "Xác nhận hủy" (Confirm Cancel) triggers the API call

### Activate UX (UI-02)
- **D-05:** Activate resets `start_date`/`end_date` to today — **no trigger-date modal needed** (Phase 7 D-12 decision)
- **D-06:** The old trigger-date modal code in `ContractCard.tsx` (`handleStatusChange` date-adjustment logic + `pendingActivation` state + AlertDialog for date adjustment) must be removed
- **D-07:** CUSTOMER Activate: loading state while API call in-flight, then button disappears once contract becomes `ACTIVE` (TanStack Query refetch updates the card automatically)

### Already Correct (from Phase 7 — no changes needed)
- **D-08:** `getContractActionButtons()` logic: correct per role/status combination (ADMIN cancel both, STAFF cancel NEWLY_CREATED, CUSTOMER activate+cancel NEWLY_CREATED) — labels need updating only
- **D-09:** `getContractStatusVariant()`: correct badge styles for 4 statuses
- **D-10:** `getContractStatusText()`: logic correct, only label text needs updating
- **D-11:** `getContractStatusColor()`, `CONTRACT_STATUS_ICON`: correct, no changes needed
- **D-12:** `isPreActiveContractStatus()`: returns `true` only for `NEWLY_CREATED`
- **D-13:** `canViewContract()`: CUSTOMER returns `true` for `NEWLY_CREATED`
- **D-14:** `StatusBadge.tsx`: uses `getContractStatusText()`/`getContractStatusVariant()`/`CONTRACT_STATUS_ICON` — updates automatically when `statusUtils.ts` changes
- **D-15:** `shouldShowContractActionButtons()`: already correct — no changes needed

### Claude's Discretion
- Exact styling of the AlertDialog (fonts, spacing, CTA button color)
- Error toast messages (the existing error handling in `executeStatusChange` is fine)
- Whether the Activate button shows a spinner or the Lucide `Loader2` icon during loading

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Type changes (Phase 7)
- `src/app/type/api/index.ts` — `ContractStatus` union: `NEWLY_CREATED | ACTIVE | CANCELED | EXPIRED`

### API transitions (Phase 7)
- `src/app/api/contract/updateStatus/route.ts` — transition guards, validStatuses, ownership checks
  - Lines 132–137: `validStatuses[]` (4 values)
  - Lines 176–191: STAFF `NEWLY_CREATED → CANCELED` with `sale_by` ownership
  - Lines 219–232: CUSTOMER `NEWLY_CREATED → ACTIVE` with `purchased_by` ownership
  - Lines 250–251: dates reset to `now` (no conditional logic)

### Status utilities (Phase 7)
- `src/utils/statusUtils.ts` — `getContractActionButtons()` (lines 31–61), `getContractStatusText()` (lines 144–152), `getContractStatusVariant()` (lines 174–182), `CONTRACT_STATUS_ICON` (lines 185–190), `isPreActiveContractStatus()` (lines 98–100), `canViewContract()` (lines 108–116)

### UI components
- `src/components/cards/ContractCard.tsx` — action buttons rendering, AlertDialog (lines 340–378), `handleStatusChange()` (lines 147–161 — **remove date-adjustment logic**)
- `src/components/common/StatusBadge.tsx` — badge rendering using status utilities

### Requirements
- `.planning/REQUIREMENTS.md` §UI — UI-01 through UI-08
- `.planning/ROADMAP.md` §Phase 8 — phase goal and scope

### Prior phase context
- `.planning/phases/07-type-api/07-CONTEXT.md` — D-12 decision to remove trigger-date modal, all type/API changes
- `.planning/phases/06-data-migration/06-CONTEXT.md` — DeprecatedContractStatus type preserved

### Design system
- `src/theme/colors.ts` — canonical CSS custom property tokens (`--color-success`, `--color-warning`, etc.)

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `AlertDialog` from `@/components/ui/alert-dialog` — already imported in `ContractCard.tsx`, in use for date-adjustment confirmation
- `StatusBadge` from `@/components/common/StatusBadge` — already used in `ContractCard.tsx`, derives all display from `statusUtils.ts`
- `toast` from `sonner` — already in use for status change success/error feedback
- `Loader2` from `lucide-react` — already imported in `ContractCard.tsx`, available for loading state

### Established Patterns
- Button type: `type="primary"` for Activate (green CTA), `type="danger"` for Cancel
- AlertDialog pattern: `AlertDialog` + `AlertDialogAction` + `AlertDialogCancel` — already in use
- TanStack Query refetch: `onSuccess` in `useUpdateContractStatus` hook already triggers `onStatusChange` callback — card re-renders automatically when contract status changes

### Integration Points
- `ContractCard.tsx` renders buttons using `getContractActionButtons()` return value
- `StatusBadge.tsx` reads from `getContractStatusText()`, `getContractStatusVariant()`, `CONTRACT_STATUS_ICON` — all in `statusUtils.ts`
- Changes to `statusUtils.ts` labels cascade automatically to both `ContractCard.tsx` and `StatusBadge.tsx`

</codebase_context>

<specifics>
## Specific Ideas

- Use `Loader2` spinner on the activate button during loading — matches existing spinner pattern in the card
- Cancel dialog: use the existing `AlertDialog` component (already imported)
- After Phase 8: `REQUIREMENTS.md` UI-02 must be updated to remove the trigger-date modal reference

</specifics>

<deferred>
## Deferred Ideas

### UI-02 trigger-date modal (cancelled)
Phase 7 D-12 decided: activating a contract resets `start_date`/`end_date` to today — no user choice needed. The trigger-date modal is not implemented. `REQUIREMENTS.md` UI-02 references the modal but it is not built. Phase 8 planner should note this but not build it.

</deferred>

---

*Phase: 08-ui*
*Context gathered: 2026-04-12*
