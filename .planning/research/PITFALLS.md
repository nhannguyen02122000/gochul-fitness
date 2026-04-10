# Pitfalls Research

**Domain:** Contract Lifecycle Simplification — GoChul Fitness (Next.js 16, TypeScript, InstantDB, TanStack Query, Anthropic AI SDK)
**Researched:** 2026-04-10
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Legacy Contracts Stuck in Removed Intermediate States

**What goes wrong:**
Existing contracts in InstantDB that are currently in `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, or `PT_CONFIRMED` have no valid transition path under the new 2-state model. These contracts become permanently dead-ended: they cannot advance to `ACTIVE` (because `updateStatus` for `PT_CONFIRMED → ACTIVE` requires `role === 'CUSTOMER'` but the state machine no longer routes through `PT_CONFIRMED`), and they cannot go to `ACTIVE` from `CUSTOMER_PAID` because `CUSTOMER_PAID → ACTIVE` was never a valid transition in the current model. The contracts appear in the UI with buttons that do nothing or with error-toast failures.

**Why it happens:**
Migration is planned but not automated. The simplification removes all intermediate statuses and routes all NEWLY_CREATED contracts directly to ACTIVE. Any contract currently in `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, or `PT_CONFIRMED` was created under the old flow and has no equivalent "resume" path. Manual one-by-one fixing is error-prone and slow at scale.

**How to avoid:**
1. **Write a one-time migration script** (`POST /api/admin/backfillContractStatuses`) that:
   - Finds all contracts where `status IN ('CUSTOMER_REVIEW', 'CUSTOMER_CONFIRMED', 'CUSTOMER_PAID', 'PT_CONFIRMED')`
   - Sets them to `ACTIVE` if `end_date >= now` (they were paid and confirmed, just not yet activated)
   - Sets them to `CANCELED` if `end_date < now` (expired before activation)
   - Sets them to `CANCELED` if `end_date >= now` but the customer never completed payment (treat as abandoned)
   - Logs every change with timestamp and reason for audit
2. **Add a dry-run mode** to the migration: `--dry-run` returns a count of what would change without modifying anything
3. **Notify affected customers** before migration if any contract is moved to `CANCELED`
4. **Add a database-level constraint** (after migration) that `updateStatus` only accepts `NEWLY_CREATED → ACTIVE` for non-ADMIN roles, making it impossible to create new intermediate-state contracts

**Warning signs:**
- Contracts appear in the UI with no buttons (status stuck, no valid action)
- API `updateStatus` returns 400 with "Invalid status transition for CUSTOMER/STAFF role" on contracts users expect to work
- Database query shows non-zero count for `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` after migration

**Phase to address:**
**Phase 1 — Data Migration** (before any code changes are deployed to production). Must be resolved before the simplified UI ships.

---

### Pitfall 2: AI Chatbot Still Mentions Removed Status Names in Its Responses

**What goes wrong:**
The AI chatbot system prompt and tool descriptions reference `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, and `PT_CONFIRMED` extensively. After the simplification, the AI may still say things like: "Your contract is in CUSTOMER_REVIEW status" or "You need to complete payment first" — statuses that no longer exist. Even worse: the AI may attempt to call `update_contract_status` with one of the removed status values, causing the API to reject it (since `validStatuses` in the route will be updated to only accept the 4-valid statuses), resulting in a confusing 400 error surfaced to the user.

**Why it happens:**
The AI model was trained with the old lifecycle. Its internal knowledge (grounded via the system prompt) includes the removed statuses. The tool definition `update_contract_status` enum currently lists all 6 workflow statuses — if only `ACTIVE`, `CANCELED`, and `EXPIRED` remain, the enum must be trimmed, but the AI may still generate the old status values as part of its reasoning.

**How to avoid:**
1. **Update `update_contract_status` tool definition** (`src/lib/ai/toolDefinitions.ts`): Remove `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` from the `status` enum. Keep only: `ACTIVE`, `CANCELED`, `EXPIRED`.
2. **Update the system prompt RBAC section**: Replace the old 6-state transition table with the new 2-state table:
   - `NEWLY_CREATED → ACTIVE` (CUSTOMER activates)
   - `NEWLY_CREATED → CANCELED` (ADMIN/STAFF/CUSTOMER cancel)
   - `ACTIVE → CANCELED` (ADMIN only)
   - Any → `EXPIRED` (ADMIN only)
3. **Update the AI's description of the contract lifecycle**: Remove all references to review, payment, and PT-confirmation steps. Replace with: "Contracts start as NEWLY_CREATED. The customer activates the contract to start sessions."
4. **Add a translation layer in `translateError()`**: If the API ever receives an old status value (defensive), return a clear message: "This contract status is no longer valid in the current system. Please contact support."
5. **Test with AI conversation prompts** that reference old statuses: "Where's my contract? I already confirmed it." — AI should respond with the correct simplified flow, not refer to removed statuses.

**Warning signs:**
- AI chatbot responds with "Your contract is in CUSTOMER_REVIEW" — old status surfaced to user
- AI calls `update_contract_status` with `status: 'CUSTOMER_REVIEW'` — API 400 error returned to user
- Tool definition enum still contains `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED`

**Phase to address:**
**Phase 4 — AI Chatbot Update** (simultaneous with UI and API changes). Must be tested in the same deployment that ships the new UI.

---

### Pitfall 3: UI Renders Removed Status Badges and Ghost Buttons

**What goes wrong:**
The UI (`ContractCard`, `StatusBadge`, `getContractActionButtons` in `statusUtils.ts`) still maps removed statuses to visual elements. Contracts in `CUSTOMER_REVIEW` or `CUSTOMER_PAID` still show colored badges ("Customer Review", "Payment Completed by Customer") even though these states no longer exist in the flow. Worse: `getContractActionButtons` still returns buttons for removed transitions — e.g., STAFF sees "Send to Customer" on `NEWLY_CREATED`, CUSTOMER sees "Confirm Details" on `CUSTOMER_REVIEW`. These buttons either do nothing or call APIs that return errors.

**Why it happens:**
`getContractStatusVariant` in `statusUtils.ts` has a full mapping for all 8 statuses. `getContractStatusText` has display strings for all 8 statuses. `getContractActionButtons` has a switch over all roles and all 8 statuses. The simplification removes statuses but these functions keep returning values for them (as long as the TypeScript type still includes them).

**How to avoid:**
1. **Update `getContractStatusVariant`** — remove mappings for `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED`. Add a fallback: if an unexpected status is encountered, return `variant: 'secondary', className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'` with a console.warn.
2. **Update `getContractStatusText`** — remove display strings for removed statuses. Fallback to `status` (the raw enum value) for unknown statuses.
3. **Update `getContractActionButtons`** — simplify the switch to only 3 cases: `NEWLY_CREATED`, `ACTIVE`, and terminal (`CANCELED`/`EXPIRED`). All other statuses (if any legacy data slips through) should return no buttons and log a warning.
4. **Update `CONTRACT_STATUS_ICON`** — remove icons for removed statuses.
5. **Add a runtime guard in `ContractCard`**: If `contract.status` is a removed value, display a "Legacy Contract" badge with a neutral style and hide action buttons.

**Warning signs:**
- Browser console shows: `No variant mapping for status CUSTOMER_PAID`
- User sees a "Customer Review" badge on a contract
- User clicks "Confirm Details" button and gets a 403 or 400 error

**Phase to address:**
**Phase 3 — UI Component Update** (after API and types are updated, before deployment).

---

### Pitfall 4: Session Creation Guard Still Checks `PT_CONFIRMED` — Blocks All Bookings

**What goes wrong:**
The `create_session` API route checks `contract.status !== 'ACTIVE'` as the guard that allows session creation. This is already correct for the new flow — only `ACTIVE` contracts allow sessions. However, the `updateStatus` transition that activates contracts is now `NEWLY_CREATED → ACTIVE` (bypassing `PT_CONFIRMED`). If the session creation guard also checks intermediate statuses (e.g., `PT_CONFIRMED`) it will reject sessions on legacy contracts that were migrated to `ACTIVE`. More subtly: if the session creation guard checks `status !== 'ACTIVE'` but also has an explicit allowlist that includes `PT_CONFIRMED`, legacy contracts in `PT_CONFIRMED` that were never migrated will block sessions.

**Why it happens:**
The session creation permission check in `/api/history/create` was written against the 6-state model. Its logic was: "session can be created if contract is in `PT_CONFIRMED` or `ACTIVE`". After simplification, `PT_CONFIRMED` no longer exists, but if the guard still has an explicit `PT_CONFIRMED` check (for backward compat during migration), legacy contracts in `PT_CONFIRMED` will still pass the guard even after migration ends.

**How to avoid:**
1. **Simplify the guard in `/api/history/create`** to a single check: `if (contract.status !== 'ACTIVE') return 400 'Contract must be ACTIVE to create a session'`. Remove all `PT_CONFIRMED` and other intermediate checks.
2. **Verify no other route** has a `PT_CONFIRMED` status check. Grep the codebase for `PT_CONFIRMED` occurrences and remove all references outside of the legacy-data migration script.
3. **Add a defensive check**: If a contract with a removed status somehow reaches the session creation guard, return a specific error: "This contract is in a legacy status and cannot be used for new sessions. Please contact support."

**Warning signs:**
- Session creation returns 400 "Contract must be ACTIVE" for contracts that appear ACTIVE in the UI
- Session creation returns 400 "Contract must be ACTIVE" for contracts migrated to ACTIVE that have `PT_CONFIRMED` still lingering in the history link
- Grep finds `PT_CONFIRMED` outside of the migration script or TypeScript types

**Phase to address:**
**Phase 2 — API Route Logic** (concurrent with type updates).

---

## High-Risk Pitfalls

### Pitfall 5: `validStatuses` in `updateStatus` Route Still Includes Removed Statuses

**What goes wrong:**
The `POST /api/contract/updateStatus` route has a local `validStatuses` array that validates incoming status values. It currently lists all 8 statuses. After simplification, if this array is not updated, the route will still accept `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, and `PT_CONFIRMED` as valid status values — even though the TypeScript `ContractStatus` type may have been updated to remove them. A malicious or buggy client could pass these old statuses, and the route would pass the validation but fail at the transition logic (because the transition guards won't match any case). The result is a confusing silent failure — no error, no update.

**Why it happens:**
The `validStatuses` array is a secondary validation layer inside the route handler, separate from the TypeScript type. Type-only changes don't automatically update runtime arrays. The route also has `isPreActiveContractStatus` which checks against removed statuses — this function will always return `true` for removed statuses, causing expired-check logic to fire on contracts that shouldn't be in that path anymore.

**How to avoid:**
1. **Update `validStatuses`** in `updateStatus/route.ts` to only: `['NEWLY_CREATED', 'ACTIVE', 'CANCELED', 'EXPIRED']`.
2. **Update `isPreActiveContractStatus`** in `statusUtils.ts` — it currently returns `true` for `NEWLY_CREATED | CUSTOMER_REVIEW | CUSTOMER_CONFIRMED | CUSTOMER_PAID | PT_CONFIRMED`. After simplification, only `NEWLY_CREATED` is pre-active. Rename the function to `isPreActiveContractStatus` and simplify: `return status === 'NEWLY_CREATED'`. Update all call sites.
3. **Audit all `isPreActiveContractStatus` call sites** in the codebase — it's called in `getAll` for auto-expiry and in `updateStatus` for the date-expiry check. Both need updating.
4. **Update the expiry rules in PROGRAM.md §5**: Rule C1 currently says pre-ACTIVE statuses include all intermediate states. Simplify to only `NEWLY_CREATED`.

**Warning signs:**
- Route accepts `CUSTOMER_PAID` as a valid status value (passes `validStatuses.includes()` check)
- `isPreActiveContractStatus('CUSTOMER_PAID')` returns `true` — triggers incorrect auto-expiry logic
- TypeScript type updated but runtime array not — type/behavior mismatch

**Phase to address:**
**Phase 2 — API Route Logic**.

---

### Pitfall 6: TanStack Query Cache Returns Stale Status Badges After Navigation

**What goes wrong:**
Contracts are fetched via `useContracts()` and cached in TanStack Query. After a user navigates away and returns, the cached contract data may show the old status (e.g., `CUSTOMER_PAID`) even though the contract was migrated to `ACTIVE` in the database. The UI renders the old badge because the cache wasn't invalidated. This is particularly insidious because the data "looks right" on first load (it's cached) — it only shows the wrong status if you know to look.

**Why it happens:**
TanStack Query caches by query key. If the query key doesn't change between navigations, the stale cache is returned. The `RealtimeProvider` invalidates the `['contracts']` query key on `contract.changed` events, but if the cache was populated before the provider subscribed, or if the realtime event doesn't fire (e.g., migration is a direct DB write, not an API call), the cache stays stale.

**How to avoid:**
1. **After running the migration script**, call `queryClient.invalidateQueries({ queryKey: contractKeys.all() })` to clear the contract cache.
2. **Use `staleTime: 0`** on the contracts query to ensure fresh data on every mount (acceptable for contract lists — they're small and change infrequently).
3. **Add cache invalidation** in the realtime event handler to cover both `create` and `update` actions.
4. **Test the migration with a fresh browser session** (no cache) to confirm contracts show the correct status after migration.

**Warning signs:**
- Contract shows old status badge after migration, even after page refresh (but not hard refresh)
- Hard refresh (Ctrl+Shift+R) shows correct status — cache is the culprit
- `queryClient.getQueryData(contractKeys.all())` returns stale data

**Phase to address:**
**Phase 3 — UI Cache & Realtime** (after migration script runs).

---

### Pitfall 7: Expiry Rules Check Removed Statuses and Break Auto-Expiry

**What goes wrong:**
Rule C1 in PROGRAM.md §5 says: "A contract is in a pre-ACTIVE status (`NEWLY_CREATED`, `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED`) AND its `end_date` has passed → `EXPIRED`." After simplification, only `NEWLY_CREATED` is pre-ACTIVE. The expiry check in `getAll` (auto-expire in-memory) and in `updateStatus` (reject transition on expired contracts) both use `isPreActiveContractStatus`, which still returns `true` for removed statuses. Legacy contracts migrated to `ACTIVE` won't auto-expire correctly if they slip through with a removed status.

**Why it happens:**
The expiry logic is spread across two places: the `getAll` route (auto-expire on read) and the `updateStatus` route (reject transition if already expired). Both call `isPreActiveContractStatus`, which includes all removed statuses. After simplification, this causes two problems:
1. Contracts with removed statuses never get auto-expired (because the migration moved them to `ACTIVE` or `CANCELED`)
2. If a contract is accidentally left in `CUSTOMER_PAID` and its `end_date` passes, it won't auto-expire under the new `isPreActiveContractStatus` logic

**How to avoid:**
1. **Simplify `isPreActiveContractStatus`** as described in Pitfall 5.
2. **Update the expiry check in `getAll`** to use the simplified function.
3. **Write the migration script to set all removed-status contracts to `ACTIVE` or `CANCELED`** (see Pitfall 1) before the simplified expiry logic goes live.
4. **Add a monitoring alert**: After deployment, query for any contract with a removed status value. This should always return 0. If it returns > 0, the migration failed.

**Warning signs:**
- Database query returns contracts in `CUSTOMER_PAID` or `PT_CONFIRMED` status after migration
- `isPreActiveContractStatus('CUSTOMER_PAID')` returns `true` in runtime — expiry logic fires on wrong statuses
- Expiry check in `getAll` silently updates a contract's status to `EXPIRED` when it shouldn't

**Phase to address:**
**Phase 2 — API Route Logic** (simultaneous with Pitfall 5).

---

### Pitfall 8: Customer Visibility Filter Still Excludes `NEWLY_CREATED`

**What goes wrong:**
PROGRAM.md §4.2 currently states: "CUSTOMER: Contracts where `purchased_by` = their user ID; `NEWLY_CREATED` is always excluded." Under the new flow, `NEWLY_CREATED` is the customer-visible starting state — the customer must see the contract and click "Activate" on it. If the filter still excludes `NEWLY_CREATED`, customers will see an empty contract list after STAFF creates a contract for them. They won't know a contract exists.

**Why it happens:**
The exclusion of `NEWLY_CREATED` for CUSTOMER was intentional under the old flow (customer shouldn't see a contract until STAFF sends it to them). The new flow inverts this: customer should see `NEWLY_CREATED` immediately so they can activate it.

**How to avoid:**
1. **Update the `getAll` route filter for CUSTOMER role**: Remove the `status !== 'NEWLY_CREATED'` exclusion. Now CUSTOMER can see their own `NEWLY_CREATED` contracts.
2. **Update `canViewContract`** in `statusUtils.ts`: Change `if (role === 'CUSTOMER' && status === 'NEWLY_CREATED') return false` to `return true` for all CUSTOMER statuses.
3. **Update the RBAC table in PROGRAM.md §4.2**: "CUSTOMER: All contracts where `purchased_by` = their user ID (including `NEWLY_CREATED`)."
4. **Update the chatbot `get_contracts` tool description**: Remove "CUSTOMER role cannot request NEWLY_CREATED status" from the `statuses` parameter description.

**Warning signs:**
- CUSTOMER sees empty contract list after STAFF creates a contract for them
- Grep finds `NEWLY_CREATED` excluded in a filter for CUSTOMER role
- `canViewContract('CUSTOMER', 'NEWLY_CREATED')` returns `false`

**Phase to address:**
**Phase 3 — UI Component Update** (concurrent with Pitfall 3).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Only update TypeScript types, not runtime validation arrays | TypeScript compiles cleanly | Route accepts invalid statuses at runtime; subtle silent failures | Never — always update types AND runtime arrays in the same PR |
| Update `statusUtils.ts` but not `updateStatus/route.ts` | Status utilities consistent | API route has independent logic that contradicts utilities | Never — both must be updated together |
| Update UI but not AI chatbot | UI ships cleanly | Users interacting with chatbot still see old statuses and old behaviors | Never — AI chatbot must ship in the same deployment as UI |
| Skip the migration script, rely on manual fixes | Avoids writing migration code | Human error: some contracts miss the manual fix, users see broken contracts | Never |
| Keep removed status values in TypeScript type as deprecated | Avoids breaking changes | Developers import the type and use removed values; API rejects them at runtime | Never — remove from type entirely |
| Add `PT_CONFIRMED` → `ACTIVE` as a backward-compat transition in the API | Supports legacy contracts without migration | Any contract in `PT_CONFIRMED` never gets migrated; flow stays broken | Only as a temporary bridge in the migration script, then remove |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| InstantDB (runtime) → TypeScript types | Type updated but `validStatuses` array in route not updated; runtime rejects valid new statuses or accepts removed ones | Update TypeScript types AND runtime arrays AND `isPreActiveContractStatus` AND all switch statements in the same PR |
| TanStack Query cache → Realtime invalidation | Cache not invalidated after migration (direct DB write); stale status badge shown | Invalidate cache after migration; set `staleTime: 0` on contracts query |
| AI chatbot → API route | Tool definition enum still contains removed statuses; AI generates old status values | Update tool enum AND system prompt RBAC table AND lifecycle description in the same PR |
| UI components → API routes | `getContractActionButtons` still returns buttons for removed transitions; buttons call APIs that return 403 | Update button logic to only handle `NEWLY_CREATED → ACTIVE` and `NEWLY_CREATED → CANCELED` |
| PROGRAM.md → Codebase | Docs describe 6-state flow after code ships with 2-state flow | Update PROGRAM.md §4.2, §5, §6, §7 AND all RBAC tables AND expiry rules AND lifecycle diagrams in the same PR |
| `.cursor/rules` → Codebase | Cursor AI still gives guidance based on old 6-state flow | Update `gochul-fitness-rules.mdc` with new lifecycle, new RBAC, new expiry rules, removed statuses |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Migration script queries all contracts without pagination | Memory explosion on large InstantDB dataset; timeout or OOM | Use cursor-based pagination (batch of 100); add `limit` and `startAfter` to migration query | More than ~500 contracts in the database |
| `getAll` route auto-expires contracts on every read | Extra InstantDB write on every contract list load (once per user per navigation) | Auto-expire only on the `updateStatus` route; `getAll` should be read-only | High-traffic contract list page |
| `isPreActiveContractStatus` called in `getAll` for every contract | O(n) check over all statuses for each contract in the list | Remove the auto-expire from `getAll`; rely on migration script + `updateStatus` guard only | Large contract lists |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| ADMIN force-transition bypass still allows setting removed statuses | If `role === 'ADMIN'` skips all transition validation (as it currently does), ADMIN could set any contract to `CUSTOMER_PAID` — a removed status that breaks downstream logic | After simplification: ADMIN can still force-set to `ACTIVE`, `CANCELED`, `EXPIRED`; all other values should return 400 even for ADMIN |
| Removed statuses still accepted as valid input | Malicious client sends `status: 'PT_CONFIRMED'`; route passes `validStatuses` check; silently does nothing | Tighten `validStatuses` to only the 4 valid statuses; add explicit reject for removed values |
| CUSTOMER can still activate any `NEWLY_CREATED` contract (not just their own) | Information disclosure: customer can see contracts they don't own | The ownership check (`contract.purchased_by !== userInstantId`) must remain in place for `NEWLY_CREATED → ACTIVE` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Customer sees empty contract list after STAFF creates contract | Customer doesn't know a contract was made for them; no activation button visible | Remove `NEWLY_CREATED` exclusion for CUSTOMER (see Pitfall 8) |
| Cancel button on `NEWLY_CREATED` still says "Send to Customer" or shows wrong role's buttons | Wrong button label confuses users about what action to take | Simplify `getContractActionButtons` to only return "Activate" (CUSTOMER) and "Cancel" (ADMIN/STAFF) |
| Legacy contract shows old status badge after migration | Users see "Payment Completed" badge on a contract that was auto-migrated; doesn't match the actual simplified flow | Add runtime guard to show "Legacy Contract" badge for any removed status; clear cache after migration |
| AI chatbot says "Your contract is in CUSTOMER_REVIEW" | User confused — no such status exists in the new UI | Update AI system prompt and tool definitions before shipping (see Pitfall 2) |
| Error message still says "Invalid transition for CUSTOMER role" when user tries old flow | After simplification, this message might appear for transitions that were removed | Add specific error translation: if the requested transition no longer exists in the 2-state model, say "This contract status is no longer valid. Please contact support." |

---

## "Looks Done But Isn't" Checklist

- [ ] **Migration script:** Database query returns 0 contracts with removed statuses (`CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED`) — verify after running migration
- [ ] **TypeScript types:** `ContractStatus` type has only `NEWLY_CREATED`, `ACTIVE`, `CANCELED`, `EXPIRED` — grep the type file
- [ ] **`validStatuses` in route:** Only includes `NEWLY_CREATED`, `ACTIVE`, `CANCELED`, `EXPIRED` — grep the route file
- [ ] **`isPreActiveContractStatus`:** Only returns `true` for `NEWLY_CREATED` — verify all call sites
- [ ] **AI tool enum:** `update_contract_status` tool's `status` enum contains only `ACTIVE`, `CANCELED`, `EXPIRED`
- [ ] **AI system prompt:** RBAC section describes only `NEWLY_CREATED → ACTIVE` and `NEWLY_CREATED → CANCELED` for non-ADMIN roles
- [ ] **`getContractActionButtons`:** Returns only "Activate" (CUSTOMER on `NEWLY_CREATED`) and "Cancel" (ADMIN/STAFF on `NEWLY_CREATED`)
- [ ] **`canViewContract`:** CUSTOMER can see `NEWLY_CREATED` contracts — test with CUSTOMER login
- [ ] **Session creation:** `ACTIVE` is the only status that allows session creation; `PT_CONFIRMED` not in guard
- [ ] **Expiry rules:** Rule C1 applies only to `NEWLY_CREATED`, not removed statuses
- [ ] **TanStack Query cache:** Fresh browser load shows correct simplified statuses after migration
- [ ] **PROGRAM.md:** All RBAC tables, lifecycle diagrams, expiry rules, and API contracts reflect 2-state model
- [ ] **`.cursor/rules`:** Runtime behavior document updated with new lifecycle, removed statuses, new expiry rules
- [ ] **AI chatbot test:** "Where's my contract?" → no mention of removed statuses; "How do I activate?" → correct flow
- [ ] **ADMIN force-transition:** ADMIN can still force to `ACTIVE`, `CANCELED`, `EXPIRED` but not to removed statuses

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Legacy contracts still in removed statuses | MEDIUM | Re-run migration script with corrected logic; verify with database query |
| AI chatbot still generating removed status values | LOW | Deploy updated tool definitions and system prompt; no database changes needed |
| UI shows old status badges | LOW | Deploy updated `statusUtils.ts`; hard refresh browser to clear cache |
| CUSTOMER can't see `NEWLY_CREATED` contracts | MEDIUM | Update `canViewContract` and `getAll` filter; invalidate TanStack cache |
| Session creation fails for migrated contracts | MEDIUM | Verify contract is actually `ACTIVE`; if stuck in removed status, re-run migration |
| PROGRAM.md still describes 6-state flow | LOW | Update docs in same PR that ships code; no deployment needed |
| Cursor AI gives old guidance | LOW | Update `.cursor/rules/gochul-fitness-rules.mdc`; changes apply to future sessions |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| P1 — Legacy contracts stuck in removed states | Phase 1: Data Migration | Database query returns 0 contracts in removed statuses after migration |
| P2 — AI chatbot mentions removed statuses | Phase 4: AI Chatbot Update | AI conversation test: "Where's my contract?" → no removed status names in response |
| P3 — UI renders removed status badges | Phase 3: UI Component Update | Browser shows no removed status badges; `getContractActionButtons` only returns Activate + Cancel |
| P4 — Session creation guard blocks bookings | Phase 2: API Route Logic | Create session on migrated ACTIVE contract → succeeds |
| P5 — `validStatuses` includes removed statuses | Phase 2: API Route Logic | POST `updateStatus` with `CUSTOMER_PAID` → 400; POST with `ACTIVE` → 200 |
| P6 — TanStack Query cache stale after migration | Phase 3: UI Cache & Realtime | Fresh browser load shows correct statuses; hard refresh confirms |
| P7 — Expiry rules check removed statuses | Phase 2: API Route Logic | Contract in `CUSTOMER_PAID` with expired `end_date` → not auto-expired (migration should have resolved it) |
| P8 — CUSTOMER excluded from `NEWLY_CREATED` | Phase 3: UI Component Update | CUSTOMER login → sees newly created contract in list; can click Activate |

---

## Sources

- GoChul Fitness — `docs/PROGRAM.md` (contract lifecycle, RBAC tables, expiry rules, April 2026)
- GoChul Fitness — `docs/v1.1-enhance-contract-flow.md` (simplified flow requirement, April 2026)
- GoChul Fitness — `src/app/api/contract/updateStatus/route.ts` (runtime transition logic)
- GoChul Fitness — `src/utils/statusUtils.ts` (button logic, badge variants, expiry helpers)
- GoChul Fitness — `src/lib/ai/toolDefinitions.ts` (AI chatbot tool schemas)
- GoChul Fitness — `.planning/PROJECT.md` (v1.1 milestone scope, April 2026)
- GoChul Fitness — `.planning/research/PITFALLS.md` (prior AI chatbot pitfalls, April 2026)
- GoChul Fitness — `.planning/research/ARCHITECTURE.md` (system architecture)
- GoChul Fitness — `.planning/research/STACK.md` (tech stack)
- GoChul Fitness — `.claude/get-shit-done/templates/research-project/PITFALLS.md` (research template)

---

*Pitfalls research for: Contract Lifecycle Simplification (6-state → 2-state)*
*Researched: 2026-04-10*
