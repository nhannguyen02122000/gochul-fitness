# Session Creation Flow - Role-Based Access

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Logs In (Clerk Auth)                    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Check User Role (from user_setting)                │
└─────────────────┬───────────────┬───────────────┬───────────────┘
                  │               │               │
        ┌─────────▼─────┐  ┌──────▼──────┐  ┌────▼────┐
        │   CUSTOMER    │  │    STAFF    │  │  ADMIN  │
        └───────┬───────┘  └──────┬──────┘  └────┬────┘
                │                 │              │
                │                 │              │
┌───────────────▼──────────────────▼──────────────▼──────────────┐
│           Navigate to Contracts or History Page                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Fetch Contracts (/api/contract/getAll)             │
│                                                                 │
│  CUSTOMER: Only purchased contracts                             │
│  STAFF: Only contracts they sold (sale_by = user_id)           │
│  ADMIN: ALL contracts                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Display Contracts with UI                      │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │  Contract Card (ACTIVE status)                     │        │
│  │  ┌──────────────────────────────────────────────┐ │        │
│  │  │ [Create Session Button]                      │ │        │
│  │  │                                               │ │        │
│  │  │ Visible if:                                   │ │        │
│  │  │ • Contract is ACTIVE                          │ │        │
│  │  │ • CUSTOMER: owned by user                     │ │        │
│  │  │ • STAFF: any contract they see                │ │        │
│  │  │ • ADMIN: any contract                         │ │        │
│  │  └──────────────────────────────────────────────┘ │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │  [+ FAB Button] (Bottom Right)                     │        │
│  │  Visible for: CUSTOMER, STAFF, ADMIN               │        │
│  └────────────────────────────────────────────────────┘        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              User Clicks "Create Session" Button                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CreateSessionModal Opens                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │  1. Select Contract (dropdown)                   │          │
│  │     • Pre-selected if clicked from card          │          │
│  │     • Shows ACTIVE contracts based on role       │          │
│  │     • Customer name shown for each contract      │          │
│  │                                                   │          │
│  │  2. Select Date (date picker)                    │          │
│  │     • Cannot select past dates                   │          │
│  │                                                   │          │
│  │  3. Select Time Slot                             │          │
│  │     • Fetches trainer's schedule                 │          │
│  │     • Shows available 90-minute slots            │          │
│  │     • Highlights occupied slots                  │          │
│  │                                                   │          │
│  │  [Create Session] [Cancel]                       │          │
│  └──────────────────────────────────────────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               Submit to /api/history/create                     │
│                                                                 │
│  Payload: {                                                     │
│    contract_id: string,                                         │
│    date: number (timestamp),                                    │
│    from: number (minutes),                                      │
│    to: number (minutes)                                         │
│  }                                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Validation Steps                         │
│                                                                 │
│  1. ✓ User authenticated (Clerk)                               │
│  2. ✓ User settings exist                                      │
│  3. ✓ Role is valid (CUSTOMER/STAFF/ADMIN)                     │
│  4. ✓ Required fields present                                  │
│  5. ✓ Field types valid                                        │
│  6. ✓ Time range valid (from < to)                             │
│  7. ✓ Contract exists                                          │
│  8. ✓ Role-based authorization:                                │
│        • CUSTOMER: purchased_by = user_id                      │
│        • STAFF: no additional check (sees only their contracts)│
│        • ADMIN: no additional check (sees all contracts)       │
│  9. ✓ Contract status is ACTIVE                                │
│ 10. ✓ Contract not expired                                     │
│ 11. ✓ Trainer assigned (sale_by exists)                        │
│ 12. ✓ No time conflict with trainer's schedule                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                     ┌───────┴────────┐
                     │                │
           ┌─────────▼──────┐  ┌──────▼───────┐
           │   SUCCESS      │  │    ERROR     │
           │   201 Created  │  │  400/403/404 │
           └─────────┬──────┘  └──────┬───────┘
                     │                │
                     │                ▼
                     │         Show error message
                     │                │
                     ▼                │
           Create history record      │
                     │                │
                     ▼                │
           Link to contract           │
                     │                │
                     ▼                │
           Link to user              │
                     │                │
                     ▼                │
           Return created session     │
                     │                │
                     ▼                │
           Show success message       │
                     │                │
                     ▼                │
           Close modal               │
                     │                │
                     ▼                │
           Refresh data (React Query) │
                     │                │
                     └────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Session appears in History List                    │
│              Contract credits updated (if applicable)           │
└─────────────────────────────────────────────────────────────────┘
```

## Permission Matrix

| Role     | View Contracts       | Create Session For              | UI Access              |
|----------|----------------------|---------------------------------|------------------------|
| CUSTOMER | Own contracts only   | Own active contracts only       | Button + FAB           |
| STAFF    | Contracts they sold  | Any active contract they see    | Button + FAB           |
| ADMIN    | All contracts        | Any active contract             | Button + FAB           |

## API Endpoints Flow

### GET /api/contract/getAll
```typescript
// Role-based filtering
if (role === 'ADMIN') {
  // Query: ALL contracts
} else if (role === 'STAFF') {
  // Query: WHERE sale_by = user_id
} else if (role === 'CUSTOMER') {
  // Query: WHERE purchased_by = user_id
}
```

### POST /api/history/create
```typescript
// Authorization check
if (role === 'CUSTOMER') {
  if (contract.purchased_by !== userInstantId) {
    return 403 Forbidden
  }
} else if (role === 'ADMIN' || role === 'STAFF') {
  // Allowed - no additional checks
  // (STAFF can only see their contracts anyway)
} else {
  return 403 Invalid role
}
```

## Data Flow

```
User Action
    ↓
UI Component (ContractCard / History Page)
    ↓
CreateSessionModal
    ↓
useCreateHistory hook (React Query)
    ↓
POST /api/history/create
    ↓
Authorization & Validation
    ↓
Create history record (InstantDB)
    ↓
Link relationships (contract ↔ history ↔ user)
    ↓
Return created session
    ↓
React Query invalidates cache
    ↓
UI auto-refreshes with new data
```

## Key Security Points

1. **Server-Side Validation**: All authorization happens on the server
2. **Role Verification**: User role is fetched from database, not trusted from client
3. **Contract Ownership**: Validated against database records
4. **Time Conflict Prevention**: Checked against trainer's existing schedule
5. **Status Validation**: Only ACTIVE contracts can create sessions
6. **Expiration Check**: Expired contracts automatically updated to EXPIRED status

## Error Handling

| Error Code | Scenario                              | User Message                                  |
|------------|---------------------------------------|-----------------------------------------------|
| 401        | User not authenticated                | "Unauthorized - Please sign in"               |
| 403        | CUSTOMER tries other's contract       | "You can only create history for contracts you purchased" |
| 403        | Invalid role                          | "Forbidden - Invalid user role"               |
| 404        | User settings not found               | "User settings not found"                     |
| 404        | Contract not found                    | "Contract not found"                          |
| 400        | Missing required fields               | "Missing required fields: ..."                |
| 400        | Invalid field types                   | "Invalid field: ... must be a ..."            |
| 400        | Invalid time range                    | "Invalid time range: from must be less than to" |
| 400        | Contract not active                   | "Contract is not active. Only active contracts can create sessions." |
| 400        | Contract expired                      | "Contract has expired"                        |
| 400        | No trainer assigned                   | "Contract does not have a sale_by user assigned" |
| 400        | Time conflict                         | "Time conflict: The trainer already has a session from X to Y on this date" |
| 500        | Server error                          | "Internal server error"                       |

## React Query Cache Management

```typescript
// On successful session creation:
1. Invalidate history queries → Refresh session lists
2. Invalidate contract queries → Update contract credits
3. Modal closes
4. Success message displayed
5. UI automatically shows new session
```

## UI State Management

```typescript
// CreateSessionModal state
- form: Form data (contract, date, time)
- selectedTrainerId: Derived from selected contract
- selectedDate: Derived from date picker
- scheduleData: Fetched trainer's occupied slots
- isLoadingSchedule: Loading state for schedule fetch
- isPending: Loading state for create mutation

// Reactive dependencies
contract → trainerId → schedule fetch
date → schedule fetch
(trainerId + date) → available time slots
```

---

**Last Updated**: February 3, 2026  
**Version**: 2.1.0

