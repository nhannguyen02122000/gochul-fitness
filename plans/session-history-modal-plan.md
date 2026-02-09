# Session History Modal - Implementation Plan

## Overview
Add a feature to display session history when users click on the "used credits" section in the ContractCard. This will show a modal with a list of all sessions (history records) associated with that contract, including session dates, times, and status information.

## Context Analysis

### Current State
- **ContractCard** displays contract information including used credits count
- **History API** (`/api/history/getAll`) exists but returns all history records with filtering
- **Database Schema**: History records are linked to contracts via `historyContract` relationship
- **Existing Patterns**: 
  - Modal components like `CreateSessionModal` for reference
  - Card components like `SessionCard` for displaying session info
  - Custom hooks in `useHistory.ts` for data fetching

### User Roles
Based on the existing code:
- **CUSTOMER**: Can only view their own contract sessions
- **STAFF**: Can view sessions they teach
- **ADMIN**: Can view all sessions

## Implementation Plan

### 1. Create New API Endpoint

**File**: `src/app/api/history/getByContract/route.ts`

**Purpose**: Fetch all history records for a specific contract with proper role-based access control

**Features**:
- Accept `contract_id` as query parameter
- Verify user has permission to view this contract's history:
  - ADMIN: Can view any contract's history
  - STAFF: Can view if they are the trainer (`teach_by` matches their ID)
  - CUSTOMER: Can view only if they purchased the contract
- Return history records ordered by date (newest first)
- Include contract details and user information
- Handle expired session detection (similar to existing `/getAll` endpoint)

**Response Structure**:
```typescript
{
  history: History[],
  contract: Contract,
  role: Role
}
```

### 2. Update TypeScript Types

**File**: `src/app/type/api/index.ts`

Add new types for the endpoint:
```typescript
export interface GetHistoryByContractRequest {
  contract_id: string
}

export interface GetHistoryByContractSuccessResponse {
  history: History[]
  contract: Contract
  role: Role
}

export type GetHistoryByContractResponse = 
  GetHistoryByContractSuccessResponse | ApiErrorResponse
```

### 3. Create Custom React Hook

**File**: `src/hooks/useHistory.ts` (add to existing file)

**Hook Name**: `useContractHistory`

**Features**:
- Accept `contractId` as parameter
- Use `useQuery` from React Query
- Fetch from `/api/history/getByContract?contract_id={id}`
- Provide loading states, error handling
- Cache the results with appropriate query key
- Only fetch when `contractId` is defined (enabled: !!contractId)

**Example Usage**:
```typescript
const { data, isLoading, error } = useContractHistory(contractId)
```

### 4. Create SessionHistoryModal Component

**File**: `src/components/modals/SessionHistoryModal.tsx`

**Design Features**:

#### Visual Design
- **Modal Header**: 
  - Display contract type badge (PT/REHAB/PT_MONTHLY) with matching colors
  - Show total sessions count
  - Display contract status
  
- **Session List**:
  - Chronologically ordered (newest first)
  - Each session displays:
    - Date (formatted: "Mon, Jan 15, 2024")
    - Time range (formatted: "08:00 AM - 09:00 AM")
    - Status badge with color coding
    - Session type icon
  - Visual separator between sessions
  - Different styling for upcoming vs completed sessions
  - Empty state when no sessions exist

- **Summary Section** (at bottom):
  - Total sessions: X
  - Completed sessions: Y
  - Remaining credits: Z (for PT/REHAB)

#### UX Features
- Loading skeleton while fetching data
- Error state with retry button
- Responsive design (mobile-friendly)
- Smooth animations when opening/closing
- Click outside or ESC key to close
- No scrolling on body when modal is open

#### Component Props
```typescript
interface SessionHistoryModalProps {
  open: boolean
  onClose: () => void
  contractId: string
  contractKind: ContractKind
  totalCredits?: number
  usedCredits?: number
}
```

#### UI Components to Use
- Ant Design `Modal` for container
- Ant Design `List` for session items
- Ant Design `Skeleton` for loading states
- Ant Design `Empty` for no data state
- Custom `StatusBadge` component (already exists)
- Icons from `@ant-design/icons`

#### Color Scheme
Match existing contract card gradient colors:
- **PT**: Purple to Pink gradient (`from-purple-500 to-pink-500`)
- **REHAB**: Blue to Cyan gradient (`from-blue-500 to-cyan-500`)
- **PT_MONTHLY**: Orange to Red gradient (`from-orange-500 to-red-500`)

### 5. Update ContractCard Component

**File**: `src/components/cards/ContractCard.tsx`

**Changes**:
1. Add state to manage modal visibility:
   ```typescript
   const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
   ```

2. Make the credits section clickable:
   - Wrap the credits display in a clickable div/button
   - Add hover effects to indicate it's clickable
   - Add cursor pointer
   - Stop propagation to prevent card onClick from firing
   - Add tooltip: "Click to view session history"

3. Add the SessionHistoryModal component at the bottom:
   ```tsx
   <SessionHistoryModal
     open={isHistoryModalOpen}
     onClose={() => setIsHistoryModalOpen(false)}
     contractId={contract.id}
     contractKind={contract.kind}
     totalCredits={contract.credits}
     usedCredits={contract.used_credits}
   />
   ```

4. Update credits display section (lines 161-168):
   - Add onClick handler
   - Add hover styles
   - Add transition effects
   - Add visual indicator (maybe a small eye icon or chevron)

### 6. Testing Checklist

- [ ] API endpoint returns correct data for different roles
- [ ] API properly restricts access based on user role
- [ ] Modal opens when clicking on used credits
- [ ] Modal displays session list correctly
- [ ] Sessions are ordered by date (newest first)
- [ ] Status badges show correct colors
- [ ] Loading state shows skeleton correctly
- [ ] Empty state displays when no sessions exist
- [ ] Error state shows retry option
- [ ] Modal closes on backdrop click
- [ ] Modal closes on ESC key
- [ ] Responsive design works on mobile
- [ ] No scrolling issues on body when modal open
- [ ] Contract card onClick doesn't fire when clicking credits
- [ ] Data refreshes when creating new sessions
- [ ] Works for all three contract types (PT, REHAB, PT_MONTHLY)

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── history/
│   │       └── getByContract/
│   │           └── route.ts          [NEW]
│   └── type/
│       └── api/
│           └── index.ts               [MODIFIED]
├── components/
│   ├── cards/
│   │   └── ContractCard.tsx          [MODIFIED]
│   └── modals/
│       └── SessionHistoryModal.tsx   [NEW]
└── hooks/
    └── useHistory.ts                  [MODIFIED]
```

## UI/UX Mockup Description

### Modal Layout
```
┌─────────────────────────────────────────────────────┐
│  [X] Personal Training Sessions                     │
│  ───────────────────────────────────────────────────│
│                                                      │
│  Contract: PT • Active                              │
│  Total Sessions: 8 / 10                             │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📅 Mon, Feb 5, 2024                           │  │
│  │ ⏰ 08:00 AM - 09:00 AM                        │  │
│  │ Status: [PT_CHECKED_IN]                       │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📅 Wed, Jan 31, 2024                          │  │
│  │ ⏰ 09:00 AM - 10:00 AM                        │  │
│  │ Status: [PT_CHECKED_IN]                       │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📅 Mon, Jan 29, 2024 • UPCOMING               │  │
│  │ ⏰ 08:00 AM - 09:00 AM                        │  │
│  │ Status: [PT_CONFIRMED]                        │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ───────────────────────────────────────────────────│
│  Summary                                            │
│  • Completed: 8 sessions                            │
│  • Remaining: 2 credits                             │
└─────────────────────────────────────────────────────┘
```

### Credits Section (ContractCard) - Before Click
```
┌────────────────┐
│   8 / 10       │  ← Shows count
│ Credits Used   │
└────────────────┘
```

### Credits Section (ContractCard) - After Hover
```
┌────────────────┐
│   8 / 10    👁  │  ← Eye icon appears
│ Credits Used   │  ← Slightly highlighted
│ Click to view  │  ← Tooltip/subtitle
└────────────────┘
```

## Additional Considerations

### Performance
- Use React Query's caching to avoid redundant API calls
- Implement pagination if session list becomes very long (> 50 items)
- Use virtualization for large lists if needed

### Accessibility
- Add proper ARIA labels for clickable elements
- Ensure keyboard navigation works
- Screen reader support for modal content
- Focus management when modal opens/closes

### Error Handling
- Network errors: Show retry button
- No data: Show friendly empty state
- Permission errors: Show access denied message
- Invalid contract ID: Show error message

### Future Enhancements
- Add search/filter by date range
- Add export to CSV functionality
- Show session details on click (expand/collapse)
- Add trainer information for each session
- Show attendance rate statistics

## Security Considerations

- Verify user authentication in API endpoint
- Implement proper role-based access control
- Validate contract_id parameter
- Prevent SQL injection (using InstantDB's query builder)
- Rate limiting on API endpoint

## Dependencies

All dependencies already exist in the project:
- ✅ React Query (@tanstack/react-query)
- ✅ Ant Design (antd)
- ✅ TypeScript
- ✅ InstantDB
- ✅ dayjs (for date formatting)
- ✅ Clerk (for authentication)

## Estimated Implementation Order

1. **Backend First** (API + Types): ~30-45 min
   - Create API endpoint
   - Add TypeScript types
   - Test with different roles

2. **Hook & Component** (UI): ~45-60 min
   - Create custom hook
   - Build SessionHistoryModal component
   - Style and polish UI

3. **Integration** (ContractCard): ~15-20 min
   - Make credits section clickable
   - Wire up modal
   - Test integration

4. **Testing & Polish**: ~20-30 min
   - Test all user roles
   - Test edge cases
   - Refine UX details

## Success Criteria

✅ Users can click on used credits to view session history  
✅ Modal displays all sessions for the contract  
✅ Sessions show date, time, and status clearly  
✅ Different roles see appropriate data  
✅ UI is responsive and accessible  
✅ Loading and error states work properly  
✅ Modal integrates seamlessly with existing design
