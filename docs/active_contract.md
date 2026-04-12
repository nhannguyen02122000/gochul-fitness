When active a contract:

Check for contract start_date, and end_date, if at the time of calling API to Active contract (current time):

1. current time is start_date (just compare date, do not compare hour or minute): API will active contract, start_date and end_date remains unchanged
2. current time is not start_date (can be larger or smaller):
    - Calculate the duration of contract
    - Change start_date to be current time
    - Change end_date = current time + duration

In case #2, remember to show a popup to let user know there shall be a modification in the start_date and end_date on contract in Vietnamese. Let them confirm and then call API to update contract status