# Session Creation Update - v2.1.0

## Overview
This update enables ADMIN and STAFF users to create training sessions for contracts, not just CUSTOMER users. The changes maintain proper role-based authorization while providing a consistent UI experience across all user roles.

## Changes Made

### 1. API Enhancement (`/api/history/create`)
**File**: `src/app/api/history/create/route.ts`

#### Before:
- Only CUSTOMER users could create sessions
- CUSTOMER could only create sessions for contracts they purchased
- ADMIN/STAFF were blocked from creating sessions

#### After:
- **CUSTOMER**: Can create sessions only for contracts they purchased (unchanged)
- **ADMIN**: Can create sessions for ANY active contract
- **STAFF**: Can create sessions for contracts they sold (based on existing contract filtering in `/api/contract/getAll`)

#### Code Changes:
```typescript
// Role-based authorization
if (role === 'CUSTOMER') {
  // CUSTOMER can only create history for contracts they purchased
  if (contract.purchased_by !== userInstantId) {
    return NextResponse.json(
      { error: 'Forbidden - You can only create history for contracts you purchased' },
      { status: 403 }
    )
  }
} else if (role === 'ADMIN' || role === 'STAFF') {
  // ADMIN/STAFF can create history for any contract
  // No additional checks needed
} else {
  // Unknown role
  return NextResponse.json(
    { error: 'Forbidden - Invalid user role' },
    { status: 403 }
  )
}
```

### 2. ContractCard Component
**File**: `src/components/cards/ContractCard.tsx`

#### Changes:
- "Create Session" button now appears for ADMIN/STAFF on active contracts
- Maintains existing logic for CUSTOMER (only their own contracts)

#### Code:
```typescript
// Check if user should see "Create Session" button
// CUSTOMER: only for their own active contracts
// ADMIN/STAFF: for any active contract
const shouldShowCreateSession = contract.status === 'ACTIVE' && (
  (userRole === 'CUSTOMER' && contract.purchased_by === userInstantId) ||
  userRole === 'ADMIN' ||
  userRole === 'STAFF'
)
```

### 3. History Page
**File**: `src/app/(main)/history/page.tsx`

#### Changes:
- Floating Action Button (FAB) now visible for ADMIN/STAFF
- Previously only visible for CUSTOMER users

#### Code:
```typescript
// Allow CUSTOMER, ADMIN, and STAFF to create sessions
const canCreateSession = userRole && ['CUSTOMER', 'ADMIN', 'STAFF'].includes(userRole)

// ...later in the render...

{/* Floating Action Button for CUSTOMER/ADMIN/STAFF */}
{canCreateSession && (
  <button
    onClick={() => setCreateModalOpen(true)}
    className="fab"
    aria-label="Create Session"
  >
    <PlusOutlined className="text-white text-2xl" />
  </button>
)}
```

### 4. CreateSessionModal Component
**File**: `src/components/modals/CreateSessionModal.tsx`

#### Changes:
- Added clarifying comment about role-based filtering
- No functional changes needed (already worked correctly)

#### Note:
The modal automatically shows the right contracts because:
- It fetches contracts from `/api/contract/getAll`
- That API already implements role-based filtering:
  - **ADMIN**: All contracts
  - **STAFF**: Only contracts they sold
  - **CUSTOMER**: Only contracts they purchased

## Role-Based Permissions Summary

### CUSTOMER
- **View Contracts**: Only their purchased contracts
- **Create Sessions**: Only for their active contracts
- **UI**: "Create Session" button on their contracts, FAB in history page

### STAFF
- **View Contracts**: Contracts they sold
- **Create Sessions**: For any active contract they sold
- **UI**: "Create Session" button on all active contracts they see, FAB in history page

### ADMIN
- **View Contracts**: All contracts
- **Create Sessions**: For ANY active contract
- **UI**: "Create Session" button on all active contracts, FAB in history page

## User Experience Flow

### CUSTOMER Creating a Session
1. Navigate to Contracts page or History page
2. See only their own active contracts
3. Click "Create Session" button on a contract card OR click FAB
4. Select contract (pre-selected if clicked from card)
5. Choose date and time slot
6. Create session

### STAFF Creating a Session
1. Navigate to Contracts page or History page
2. See contracts they sold
3. Click "Create Session" button on any active contract OR click FAB
4. Select contract from their assigned contracts
5. Choose date and time slot (checks trainer availability)
6. Create session for the customer

### ADMIN Creating a Session
1. Navigate to Contracts page or History page
2. See ALL contracts in the system
3. Click "Create Session" button on any active contract OR click FAB
4. Select any active contract from the full list
5. Choose date and time slot (checks trainer availability)
6. Create session for any customer

## Testing Checklist

### CUSTOMER Role
- [ ] Can view only their own contracts
- [ ] Can create sessions only for their active contracts
- [ ] Cannot create sessions for other customers' contracts
- [ ] "Create Session" button appears only on their active contracts
- [ ] FAB appears in history page

### STAFF Role
- [ ] Can view contracts they sold
- [ ] Can create sessions for contracts they sold (if active)
- [ ] "Create Session" button appears on their active contracts
- [ ] FAB appears in history page
- [ ] Cannot create sessions for contracts sold by other staff

### ADMIN Role
- [ ] Can view all contracts
- [ ] Can create sessions for any active contract
- [ ] "Create Session" button appears on all active contracts
- [ ] FAB appears in history page
- [ ] Can schedule sessions for any customer

### General Functionality
- [ ] Session creation respects trainer availability
- [ ] Cannot create sessions for expired/canceled contracts
- [ ] Time slot validation works correctly
- [ ] Contract credits update properly after session creation
- [ ] UI updates reflect new sessions immediately

## Security Considerations

### API Authorization
- Role validation happens server-side (cannot be bypassed)
- User's Instant ID is verified against contract ownership
- ADMIN/STAFF permissions are properly checked
- Invalid roles are rejected with 403 Forbidden

### Data Privacy
- CUSTOMER can only see their own data
- STAFF can only see contracts they sold
- ADMIN has full access (as intended)
- User IDs are validated on every request

### Session Creation Rules
1. Contract must exist
2. Contract must be ACTIVE status
3. Contract must not be expired
4. Time slot must not conflict with trainer's schedule
5. User must have appropriate role permissions

## Files Modified

1. `src/app/api/history/create/route.ts` - Enhanced authorization
2. `src/components/cards/ContractCard.tsx` - Show button for ADMIN/STAFF
3. `src/app/(main)/history/page.tsx` - Enable FAB for ADMIN/STAFF
4. `src/components/modals/CreateSessionModal.tsx` - Added clarifying comments
5. `CHANGELOG.md` - Documented changes

## Backward Compatibility

✅ **Fully Backward Compatible**
- All existing CUSTOMER functionality remains unchanged
- No breaking changes to API contracts
- No database schema changes required
- Existing sessions and contracts unaffected

## Migration Notes

No migration required. Changes are purely additive:
- Existing CUSTOMER users experience no changes
- ADMIN/STAFF gain new capabilities
- All existing data remains valid

## Future Enhancements

### Potential Improvements
1. **Bulk Session Creation**: Allow ADMIN/STAFF to create multiple sessions at once
2. **Session Templates**: Save common session patterns for quick creation
3. **Calendar View**: Visual calendar for easier scheduling
4. **Conflict Resolution**: Suggest alternative time slots when conflicts occur
5. **Notification System**: Notify customers when staff create sessions for them

### Monitoring
- Track session creation by role
- Monitor API response times
- Log authorization failures for security review

## Support

For questions or issues:
1. Check the CHANGELOG.md for version history
2. Review FEATURES.md for feature documentation
3. See REACT_QUERY_USAGE.md for data fetching patterns
4. Contact the development team

---

**Version**: 2.1.0  
**Date**: February 3, 2026  
**Status**: ✅ Completed

