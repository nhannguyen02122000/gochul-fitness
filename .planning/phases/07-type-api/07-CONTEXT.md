# Phase 7: Type & API - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove 4 deprecated `ContractStatus` values from TypeScript types; update transition guards in `updateStatus/route.ts` for the simplified 2-state model; expose `NEWLY_CREATED` to CUSTOMER in `canViewContract()`. All changes are code-only — no new features, just removing deprecated states and adding new transition paths.

</domain>

<decisions>
## Implementation Decisions

### Type changes (TYPE-01)
- **D-01:** `ContractStatus` union: remove `CUSTOMER_REVIEW | CUSTOMER_CONFIRMED | CUSTOMER_PAID | PT_CONFIRMED` — keep `NEWLY_CREATED | ACTIVE | CANCELED | EXPIRED`
- **D-02:** `validStatuses[]` array in `updateStatus/route.ts` updated to match new union
- **D-03:** `UpdateContractStatusRequest.status` field type updated to new union
- **D-04:** `DeprecatedContractStatus` type (Phase 6) kept — migration types still reference it; Phase 7 does NOT remove it

### Transition guards (API-01 through API-05)

#### STAFF transitions (API-01)
- **D-05:** STAFF can transition `NEWLY_CREATED` → `CANCELED` (cancel)
- **D-06:** STAFF cancel requires `sale_by` ownership check — STAFF can only cancel contracts they sold (not any STAFF)

#### ADMIN transitions (API-02, API-03)
- **D-07:** ADMIN can transition `NEWLY_CREATED` → `CANCELED` (existing force-cancel behavior)
- **D-08:** ADMIN can transition `ACTIVE` → `CANCELED` (existing force-cancel preserved — STATE.md decision)
- **D-09:** ADMIN has no ownership restrictions

#### CUSTOMER transitions (API-04)
- **D-10:** CUSTOMER can transition `NEWLY_CREATED` → `ACTIVE` (activate)
- **D-11:** CUSTOMER activate requires `purchased_by` ownership check
- **D-12:** On activate, `start_date` and `end_date` are RESET to today's date (not preserved) — simplifies trigger-date out of API layer
- **D-13:** Remove `dateUpdates` logic from `updateStatus/route.ts` — no more `start_date`/`end_date` adjustment on activate

#### Session creation (API-07)
- **D-14:** `status !== 'ACTIVE'` guard in `history/create/route.ts` remains unchanged — contract must be `ACTIVE` to book sessions

### Customer visibility (API-06)
- **D-15:** `canViewContract()` updated so CUSTOMER can view `NEWLY_CREATED` contracts (not just `ACTIVE`)
- **D-16:** Prior decision: `canViewContract()` returns `true` for CUSTOMER on `NEWLY_CREATED` (STATE.md decision, v1.1 milestone)

### Utility functions (API-07)
- **D-17:** `isPreActiveContractStatus()` returns `true` only for `NEWLY_CREATED` (already correct from Phase 6 — no change needed)
- **D-18:** `getContractStatusText()` and `getContractStatusVariant()` must handle only `NEWLY_CREATED | ACTIVE | CANCELED | EXPIRED` — Phase 8 UI handles this

### Claude's Discretion
- Exact error messages for invalid transition responses
- TypeScript strictness: whether to use `as ContractStatus` casts or update the request type inference
- Auto-expire logic (`shouldExpireByDate`, `shouldExpireByCredits`) — already correct, no changes needed

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Type definitions
- `src/app/type/api/index.ts` — ContractStatus union, UpdateContractStatusRequest, ApiErrorResponse

### Transition logic
- `src/app/api/contract/updateStatus/route.ts` — validStatuses array (line 132), STAFF transitions (line 207), CUSTOMER transitions (line 219), ADMIN transitions (line 178), date adjustment logic (lines 246-260)

### Utility functions
- `src/utils/statusUtils.ts` — `isPreActiveContractStatus()` (line 130), `canViewContract()` (line 146), `getContractStatusText()` (line 185), `getContractStatusVariant()` (line 219)

### Session guard
- `src/app/api/history/create/route.ts` — `status !== 'ACTIVE'` guard (line 154)

### Prior phase context
- `.planning/phases/06-data-migration/06-CONTEXT.md` — migration decisions, DeprecatedContractStatus type
- `.planning/STATE.md` §Decisions Made (v1.1) — locked decisions: isPreActiveContractStatus, canViewContract, ADMIN force-cancel

### Requirements
- `.planning/REQUIREMENTS.md` §Type & API — TYPE-01, API-01 through API-07
- `.planning/ROADMAP.md` §Phase 7 — phase goal

### Phase 8 alignment note
- `.planning/ROADMAP.md` §Phase 8 — Phase 8 UI plan currently includes trigger-date modal for activate (from STATE.md v1.1 decisions). **This decision supersedes that** — activate resets dates to today; Phase 8 UI should NOT show the trigger-date modal. Phase 8 planner must be informed.

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `instantServer.tx.contract[id].update()` — InstantDB update pattern used throughout
- `publishRealtimeEventSafely()` — already in use in updateStatus/route.ts
- `isPreActiveContractStatus()` — already correct, no implementation needed
- `hasAvailableCredits()` — already correct, no changes needed

### Established Patterns
- Role guards: `auth()` → `instantServer.query()` for user_setting → role check → transact
- Ownership checks: `purchased_by !== userInstantId` → 403
- Status guards: `if (!validStatuses.includes(newStatus))` → 400
- Error responses: `NextResponse.json({ error: '...' }, { status: N })`

### Integration Points
- `updateStatus/route.ts` — primary target; also modifies `Contract` interface changes
- `history/create/route.ts` — confirm guard (no changes needed)
- `statusUtils.ts` — `canViewContract()` needs update for CUSTOMER on `NEWLY_CREATED`
- Type changes cascade through all files importing `ContractStatus`

### Key code locations (from codebase scout)
- `updateStatus/route.ts` line 132: `validStatuses[]` — remove 4 deprecated values
- `updateStatus/route.ts` line 207: STAFF transitions block — needs `NEWLY_CREATED → CANCELED` + `sale_by` check
- `updateStatus/route.ts` line 219: CUSTOMER transitions block — needs `NEWLY_CREATED → ACTIVE` + `purchased_by` check + remove date updates
- `updateStatus/route.ts` line 246-260: date adjustment logic — REMOVE
- `statusUtils.ts` line 146: `canViewContract()` — update CUSTOMER branch for `NEWLY_CREATED`
- `src/app/type/api/index.ts` line 11-19: `ContractStatus` union

</codebase_context>

<deferred>
## Deferred Ideas

### Phase 8 trigger-date modal (cancelled)
The STATE.md v1.1 decisions previously included a "trigger-date modal on activate" feature. This decision (D-12) — resetting dates to today on activate — means the trigger-date modal is no longer needed at the API level. Phase 8 UI planner should be informed: remove trigger-date modal from Phase 8 scope, simplify activate button to just call API with no modal.

</deferred>

---

*Phase: 07-type-api*
*Context gathered: 2026-04-10*
