## For checking to move on Expired status of Contract:
Contracts — POST /api/contract/updateStatus:

Currently, auto-expire triggers (checked before any transition):
  ┌───────────────┬────────────────────────────────────────────────┬────────────────────┐
  │    Trigger    │                   Condition                    │       Result       │
  ├───────────────┼────────────────────────────────────────────────┼────────────────────┤
  │ Date expiry   │ NEWLY_CREATED + end_date < now                 │ Contract → EXPIRED │
  ├───────────────┼────────────────────────────────────────────────┼────────────────────┤
  │ Credit expiry │ ACTIVE + end_date < now + no remaining credits │ Contract → EXPIRED │
  └───────────────┴────────────────────────────────────────────────┴────────────────────┘
Let's remove this logic and replace by:
1. For Contract that has NEWLY_CREATED + end_date < now:
- ADMIN/STAFF will see a "Kích hoạt" button and a "Huỷ" button
- Clicking on "Kích hoạt" will trigger the confirmation popup and move start_date to current date, end_date to current date + duration (Refer to docs/active_contract.md)
- Clicking on "Huỷ" will trigger a confirmation popup to move status of a contract to CANCELLED (This one has been implemented, refer to it)
- CUSTOMER role cannot see any button.

2. For contract that has ACTIVE + end_date < now + no remaining credits: Remove EXPIRED transition check logic, we will handle this later
3. Remove all logic in contract for EXPIRED transition check logic, we will handle this later
4. Never write EXPIRED status to DB for now, remove all code for this. Handle later


## Sessions — POST /api/history/updateStatus

Currently, Auto-expire trigger:

  ┌─────────────┬─────────────────────────────────────────────────────────────┬───────────────────┐
  │   Trigger   │                          Condition                          │      Result       │
  ├─────────────┼─────────────────────────────────────────────────────────────┼───────────────────┤
  │ Time expiry │ NEWLY_CREATED + session end time (date + to * 60_000) < now │ Session → EXPIRED │
  └─────────────┴─────────────────────────────────────────────────────────────┴───────────────────┘

1. Remove all logic in session(history) for EXPIRED transition check logic, we will handle this later
2. Never write EXPIRED status to DB for now, remove all code for this. Handle later