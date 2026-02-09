# Credits Tracking Feature - Implementation Summary

## Overview
Successfully implemented a comprehensive credit tracking system for PT and REHAB contracts that displays original credits and used credits, prevents creating sessions when credits are exhausted, and automatically refreshes credit counts when session status changes.

## Files Modified

### 1. Type Definitions
**File**: [`src/app/type/api/index.ts`](src/app/type/api/index.ts)
- Added `used_credits?: number` field to Contract interface
- This field represents the count of history records with status `PT_CHECKED_IN`

### 2. Contract GetAll API
**File**: [`src/app/api/contract/getAll/route.ts`](src/app/api/contract/getAll/route.ts)
- Added import for `History` type
- Added calculation logic after fetching contracts to count `PT_CHECKED_IN` history records
- Sets `used_credits` on each contract before returning to client

**Implementation**:
```typescript
// Calculate used_credits for each contract
contracts.forEach(contract => {
  const usedCreditsCount = contract.history?.filter(
    (h: History) => h.status === 'PT_CHECKED_IN'
  ).length || 0
  
  contract.used_credits = usedCreditsCount
})
```

### 3. Contract Card Component
**File**: [`src/components/cards/ContractCard.tsx`](src/components/cards/ContractCard.tsx)

**Changes**:
1. Updated credits display to show "X / Y Credits Used" format
2. Added logic to check if credits are available
3. Hide "Create Session" button when credits are exhausted

**Key Updates**:
- Credits display now shows: `{used_credits || 0} / {credits}` with label "Credits Used"
- Added `hasAvailableCredits` check that returns `false` when `used_credits >= credits`
- Updated `shouldShowCreateSession` logic to include credits availability check

### 4. History Hooks
**File**: [`src/hooks/useHistory.ts`](src/hooks/useHistory.ts)
- Updated `useUpdateHistoryStatus` hook to invalidate contract queries
- This ensures credit counts refresh automatically when a session reaches `PT_CHECKED_IN` status

**Implementation**:
```typescript
export function useUpdateHistoryStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateHistoryStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
            // NEW: Invalidate contracts to refresh used_credits count
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
        }
    })
}
```

### 5. History Create API
**File**: [`src/app/api/history/create/route.ts`](src/app/api/history/create/route.ts)
- Added import for `History` type
- Added credit validation logic for PT and REHAB contracts
- Prevents session creation when credits are exhausted
- Returns clear error message with credit usage information

**Implementation**:
```typescript
// Check credits for PT and REHAB contracts
if (contract.kind === 'PT' || contract.kind === 'REHAB') {
  if (!contract.credits) {
    return NextResponse.json(
      { error: 'Contract does not have credits assigned' },
      { status: 400 }
    )
  }

  // Count history records with PT_CHECKED_IN status
  const usedCredits = contract.history?.filter(
    (h: History) => h.status === 'PT_CHECKED_IN'
  ).length || 0

  if (usedCredits >= contract.credits) {
    return NextResponse.json(
      { error: `No credits available. Used ${usedCredits} of ${contract.credits} credits.` },
      { status: 400 }
    )
  }
}
```

### 6. Create Session Modal
**File**: [`src/components/modals/CreateSessionModal.tsx`](src/components/modals/CreateSessionModal.tsx)
- Updated `activeContracts` filter to exclude contracts with exhausted credits
- Only filters PT/REHAB contracts (PT_MONTHLY contracts are unaffected)

**Implementation**:
```typescript
return allContracts.filter(c => {
  if (c.status !== 'ACTIVE') return false
  
  // For PT/REHAB contracts, check if credits are available
  const hasCreditsField = c.kind === 'PT' || c.kind === 'REHAB'
  if (hasCreditsField && c.credits) {
    const usedCredits = c.used_credits || 0
    return usedCredits < c.credits
  }
  
  // For PT_MONTHLY, no credit check needed
  return true
})
```

## Feature Behavior

### Credit Counting Rules
- ✅ Only sessions with status `PT_CHECKED_IN` count as used credits
- ✅ CANCELED, EXPIRED, and other statuses do NOT count toward used credits
- ✅ PT_MONTHLY contracts are unaffected (no credit system)

### UI Updates
1. **Contract Card Display**:
   - Before: Shows "10 Credits"
   - After: Shows "3 / 10 Credits Used"

2. **Create Session Button**:
   - Visible: Active contracts with available credits (used < total)
   - Hidden: Contracts with exhausted credits (used >= total)

3. **Session Creation Modal**:
   - Dropdown only shows contracts with available credits
   - Contracts with exhausted credits automatically filtered out

### API Validation
- Backend validates credits before creating a session
- Returns error: `"No credits available. Used X of Y credits."`
- Double protection: UI prevents selection + API validates

### Real-time Updates
- When history status changes to `PT_CHECKED_IN`, contract queries are invalidated
- React Query automatically refetches contracts with updated `used_credits`
- UI updates immediately to reflect new credit count

## Error Messages

### API Errors
1. **No Credits Available**: `"No credits available. Used {used} of {total} credits."`
2. **Missing Credits Field**: `"Contract does not have credits assigned"`

### User-Facing Feedback
- Contracts with no available credits don't appear in session creation dropdown
- Create Session button is hidden on contract cards when credits are exhausted
- Clear visual feedback with "X / Y Credits Used" display

## Testing Recommendations

### Manual Testing Checklist
- [ ] Create PT contract with 10 credits - should show "0 / 10 Credits Used"
- [ ] Create 3 sessions and move them to PT_CHECKED_IN - should show "3 / 10 Credits Used"
- [ ] Create 10 sessions all PT_CHECKED_IN - should show "10 / 10 Credits Used"
- [ ] Verify "Create Session" button hidden when credits exhausted
- [ ] Try to create session via API when credits exhausted - should receive error
- [ ] Create CANCELED session - should NOT count toward used credits
- [ ] Create PT_MONTHLY contract - should not be affected by credit system
- [ ] Change session status to PT_CHECKED_IN - contract should update automatically
- [ ] Session creation modal should not show contracts with exhausted credits

### Edge Cases Covered
✅ Contract with 0 credits assigned  
✅ Contract with undefined credits (PT_MONTHLY)  
✅ Multiple sessions with different statuses  
✅ Real-time updates via React Query invalidation  
✅ Type safety with TypeScript  

## Technical Notes

### Performance Considerations
- Credit calculation happens in-memory on already fetched history data
- No additional database queries required for credit counting
- React Query cache ensures efficient data fetching

### Data Consistency
- Credits are calculated on-demand from history records
- Not stored separately (single source of truth)
- Automatically stays in sync with actual session status

### Type Safety
- All files properly typed with TypeScript
- No `any` types in production code
- Imported `History` type where needed

## Documentation
- Implementation plan: [`plans/credits-tracking-plan.md`](plans/credits-tracking-plan.md)
- This summary: [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md)
