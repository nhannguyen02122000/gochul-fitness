# Test Plan: Session Creation for ADMIN/STAFF

## Overview
This document provides a comprehensive test plan to verify that ADMIN and STAFF users can create sessions for contracts as intended in v2.1.0.

## Prerequisites
- App running locally or deployed
- Test users created with different roles:
  - 1 ADMIN user
  - 1 STAFF user  
  - 2+ CUSTOMER users
- At least 2 ACTIVE contracts:
  - 1 sold by the STAFF user
  - 1 sold by another staff member (or any other user)

## Test Scenarios

### Test Case 1: CUSTOMER Session Creation (Existing Functionality)
**Purpose**: Verify that existing CUSTOMER functionality still works correctly

**Steps**:
1. Sign in as CUSTOMER
2. Navigate to Contracts page
3. Verify you see only your own contracts
4. Find an ACTIVE contract
5. Click "Create Session" button on the contract card
6. Verify the modal opens with the contract pre-selected
7. Select a date (today or future)
8. Select an available time slot
9. Click "Create Session"
10. Verify success message appears
11. Navigate to History page
12. Verify the new session appears in the list

**Expected Results**:
- ✓ Can only see own contracts
- ✓ "Create Session" button only on own active contracts
- ✓ Can successfully create session
- ✓ FAB button visible in History page
- ✓ Cannot see other customers' contracts

**Test Data**:
```
Role: CUSTOMER
Contract: Own active contract (purchased_by = user_id)
Date: Today + 1 day
Time: 8:00 AM - 9:30 AM (90 minutes)
```

---

### Test Case 2: STAFF Session Creation for Own Contracts
**Purpose**: Verify STAFF can create sessions for contracts they sold

**Steps**:
1. Sign in as STAFF
2. Navigate to Contracts page
3. Verify you see contracts you sold (sale_by = your user_id)
4. Find an ACTIVE contract you sold
5. Click "Create Session" button
6. Modal opens - select the contract (or verify pre-selected)
7. Select date and time
8. Click "Create Session"
9. Verify success message
10. Check History page for the new session

**Expected Results**:
- ✓ Can see contracts they sold
- ✓ "Create Session" button appears on active contracts
- ✓ Can create session for any customer's contract they sold
- ✓ FAB button visible in History page
- ✓ Session created successfully

**Test Data**:
```
Role: STAFF
Contract: Active contract sold by this staff (sale_by = staff_user_id)
Customer: Any customer
Date: Today + 2 days
Time: 10:00 AM - 11:30 AM
```

---

### Test Case 3: STAFF Cannot See Other Staff's Contracts
**Purpose**: Verify STAFF only sees their own contracts

**Steps**:
1. Sign in as STAFF user A
2. Navigate to Contracts page
3. Note the contracts visible
4. Sign out
5. Sign in as different STAFF user B
6. Navigate to Contracts page
7. Compare the contracts visible

**Expected Results**:
- ✓ STAFF A sees only contracts they sold
- ✓ STAFF B sees only contracts they sold
- ✓ Lists are different (unless they share contracts)
- ✓ No overlap unless legitimately shared

**Test Data**:
```
Role: STAFF (two different staff members)
Contracts: Different sale_by values
```

---

### Test Case 4: ADMIN Session Creation for Any Contract
**Purpose**: Verify ADMIN can create sessions for any active contract

**Steps**:
1. Sign in as ADMIN
2. Navigate to Contracts page
3. Verify you see ALL contracts in the system
4. Find an ACTIVE contract for Customer A
5. Click "Create Session" button
6. Create a session for Customer A
7. Verify success
8. Find a different ACTIVE contract for Customer B
9. Create a session for Customer B
10. Verify both sessions appear in History

**Expected Results**:
- ✓ Can see all contracts (ADMIN privilege)
- ✓ "Create Session" button on all active contracts
- ✓ Can create sessions for any customer
- ✓ FAB button visible
- ✓ All created sessions appear in history

**Test Data**:
```
Role: ADMIN
Contract 1: Customer A's active contract
Contract 2: Customer B's active contract
Dates: Different dates for each
Times: Different time slots
```

---

### Test Case 5: UI Button Visibility
**Purpose**: Verify buttons appear for the correct roles

**Steps**:
1. Test each role (CUSTOMER, STAFF, ADMIN)
2. For each role:
   - Navigate to Contracts page
   - Check for "Create Session" buttons on contract cards
   - Navigate to History page
   - Check for FAB (+ floating action button)

**Expected Results**:

| Role     | Contract Card Button | History FAB | Notes                          |
|----------|---------------------|-------------|--------------------------------|
| CUSTOMER | ✓ (own active only) | ✓           | Only on purchased contracts    |
| STAFF    | ✓ (all visible)     | ✓           | On contracts they sold         |
| ADMIN    | ✓ (all active)      | ✓           | On all active contracts        |

---

### Test Case 6: Authorization Enforcement
**Purpose**: Verify API enforces role-based permissions

**Steps**:
1. Sign in as CUSTOMER A
2. Get contract ID of Customer B's contract (via dev tools or database)
3. Attempt API call to create session for Customer B's contract
   ```bash
   curl -X POST https://your-app.com/api/history/create \
     -H "Content-Type: application/json" \
     -d '{
       "contract_id": "customer_b_contract_id",
       "date": 1738540800000,
       "from": 480,
       "to": 570
     }'
   ```
4. Verify API returns 403 Forbidden
5. Check error message

**Expected Results**:
- ✓ API rejects the request
- ✓ Returns 403 status code
- ✓ Error message: "Forbidden - You can only create history for contracts you purchased"
- ✓ No session created in database

---

### Test Case 7: Contract Status Validation
**Purpose**: Verify sessions can only be created for ACTIVE contracts

**Steps**:
1. Sign in as ADMIN (to access all contracts)
2. Find contracts with different statuses:
   - ACTIVE
   - EXPIRED
   - CANCELED
   - NEWLY_CREATED
3. Try to create session for each status

**Expected Results**:
- ✓ ACTIVE: Session created successfully
- ✓ EXPIRED: Error "Contract is not active"
- ✓ CANCELED: Error "Contract is not active"
- ✓ NEWLY_CREATED: Error "Contract is not active"

---

### Test Case 8: Trainer Schedule Conflict
**Purpose**: Verify time conflict detection works for ADMIN/STAFF

**Steps**:
1. Sign in as ADMIN
2. Find an active contract with Trainer X
3. Create a session for 10:00 AM - 11:30 AM on Date Y
4. Find a different contract with the same Trainer X
5. Try to create session for 10:30 AM - 12:00 PM on Date Y (overlaps)
6. Verify error message

**Expected Results**:
- ✓ First session created successfully
- ✓ Second session rejected
- ✓ Error message indicates time conflict
- ✓ Suggests existing session time range

**Test Data**:
```
Trainer: Same trainer for both contracts
Date: Same date
Session 1: 10:00 - 11:30
Session 2: 10:30 - 12:00 (overlaps)
Expected: Error on Session 2
```

---

### Test Case 9: Modal Pre-selection
**Purpose**: Verify contract pre-selection in modal

**Steps**:
1. Sign in as STAFF
2. Navigate to Contracts page
3. Click "Create Session" on specific contract
4. Verify modal opens with that contract pre-selected
5. Close modal
6. Click FAB button in History page
7. Verify modal opens with no pre-selection

**Expected Results**:
- ✓ From contract card: Contract pre-selected
- ✓ From FAB: No pre-selection, must choose
- ✓ Can change contract even if pre-selected

---

### Test Case 10: Cross-Role Data Consistency
**Purpose**: Verify session appears correctly for all roles

**Steps**:
1. Sign in as ADMIN
2. Create session for Customer A (10:00 AM - 11:30 AM)
3. Sign out, sign in as Customer A
4. Navigate to History page
5. Verify the session appears in their history
6. Verify session details are correct
7. Sign out, sign in as the Trainer (STAFF)
8. Navigate to History page
9. Verify session appears in trainer's schedule

**Expected Results**:
- ✓ ADMIN sees the session they created
- ✓ CUSTOMER sees the session in their history
- ✓ STAFF (trainer) sees the session in their schedule
- ✓ All details consistent across views

---

## API Testing

### Test with cURL

#### Create Session as CUSTOMER
```bash
curl -X POST http://localhost:3000/api/history/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "contract_id": "customer_contract_id",
    "date": 1738540800000,
    "from": 480,
    "to": 570
  }'
```

#### Create Session as STAFF
```bash
curl -X POST http://localhost:3000/api/history/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STAFF_CLERK_TOKEN" \
  -d '{
    "contract_id": "staff_sold_contract_id",
    "date": 1738627200000,
    "from": 540,
    "to": 630
  }'
```

#### Create Session as ADMIN
```bash
curl -X POST http://localhost:3000/api/history/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_CLERK_TOKEN" \
  -d '{
    "contract_id": "any_active_contract_id",
    "date": 1738713600000,
    "from": 600,
    "to": 690
  }'
```

---

## Automated Test Script

### Browser Console Tests

```javascript
// Test 1: Verify role-based contract filtering
async function testContractFiltering() {
  const response = await fetch('/api/contract/getAll?page=1&limit=10');
  const data = await response.json();
  console.log('Role:', data.role);
  console.log('Contract count:', data.contracts.length);
  console.log('Contracts:', data.contracts.map(c => ({
    id: c.id,
    status: c.status,
    customer: c.purchased_by_user?.[0]?.email,
    seller: c.sale_by_user?.[0]?.email
  })));
}

// Test 2: Attempt to create session
async function testCreateSession(contractId, date, from, to) {
  const response = await fetch('/api/history/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contract_id: contractId,
      date: date,
      from: from,
      to: to
    })
  });
  
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
  return data;
}

// Run tests
testContractFiltering();

// Example: Create session for 8:00 AM - 9:30 AM tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);

testCreateSession(
  'YOUR_CONTRACT_ID',
  tomorrow.getTime(),
  480,  // 8:00 AM
  570   // 9:30 AM
);
```

---

## Manual Testing Checklist

### CUSTOMER Role Testing
- [ ] Can view only own contracts
- [ ] "Create Session" button only on own active contracts
- [ ] FAB visible in History page
- [ ] Can create session for own contract
- [ ] Cannot access other customers' contracts
- [ ] API returns 403 for other customers' contracts

### STAFF Role Testing
- [ ] Can view contracts they sold
- [ ] "Create Session" button on all visible active contracts
- [ ] FAB visible in History page
- [ ] Can create session for any contract they sold
- [ ] Cannot see contracts sold by other staff
- [ ] Sessions appear in trainer's schedule

### ADMIN Role Testing
- [ ] Can view all contracts
- [ ] "Create Session" button on all active contracts
- [ ] FAB visible in History page
- [ ] Can create session for any customer
- [ ] Can create sessions for different trainers
- [ ] All sessions visible in history

### General Functionality
- [ ] Time validation works (from < to)
- [ ] Date validation (no past dates in UI)
- [ ] Trainer schedule fetched correctly
- [ ] Occupied time slots displayed
- [ ] Time conflict detection works
- [ ] Success messages displayed
- [ ] Error messages clear and helpful
- [ ] Modal closes after successful creation
- [ ] React Query cache updates automatically
- [ ] UI refreshes with new data

---

## Bug Report Template

If you find issues, use this template:

```markdown
**Bug Title**: [Brief description]

**Role**: CUSTOMER / STAFF / ADMIN

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:


**Actual Behavior**:


**Screenshots/Logs**:


**Environment**:
- Browser: 
- OS: 
- App Version: 2.1.0
```

---

## Success Criteria

All tests must pass:
- ✅ CUSTOMER functionality unchanged (backward compatible)
- ✅ STAFF can create sessions for their contracts
- ✅ ADMIN can create sessions for any contract
- ✅ UI buttons appear for correct roles
- ✅ API enforces authorization
- ✅ Time conflict detection works
- ✅ No security vulnerabilities
- ✅ Data consistency across roles

---

**Test Plan Version**: 1.0  
**Date Created**: February 3, 2026  
**Last Updated**: February 3, 2026

