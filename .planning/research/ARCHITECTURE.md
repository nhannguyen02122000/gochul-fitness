# Architecture Research — Contract Flow Simplification

**Domain:** State Machine Reduction (GoChul Fitness contract lifecycle)
**Researched:** 2026-04-10
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Client / UI Layer                                │
├──────────────────────┬──────────────────────┬───────────────────────┤
│  ContractCard.tsx   │  CreateContractModal  │  AIChatbotModal.tsx   │
│  (action buttons)   │  (create + start_dt)  │  (tool layer)         │
├──────────────────────┴──────────────────────┴───────────────────────┤
│                    TanStack Query Hooks                              │
│              useContracts.ts (CRUD + status mutations)               │
├─────────────────────────────────────────────────────────────────────┤
│                   Next.js API Routes (RBAC gate)                     │
│  contract/create │ contract/getAll │ contract/updateStatus          │
├───────────────────────────┬─────────────────────────────────────────┤
│   Clerk Auth (auth())    │  InstantDB (instantServer transact)       │
│   Role lookup            │  Ably publish (realtime events)           │
├─────────────────────────────────────────────────────────────────────┤
│                        InstantDB (data store)                        │
│           contract.status ∈ {NEWLY_CREATED, ACTIVE, …}               │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|-----------------|------------------------|
| `src/app/type/api/index.ts` | TypeScript types + union types (`ContractStatus`) | Single source of truth for all types |
| `src/app/api/contract/updateStatus/route.ts` | Validates role + status transition + writes to InstantDB | Server-side route handler |
| `src/utils/statusUtils.ts` | Derives action buttons, badge variants, visibility rules | Pure functions; no React imports |
| `src/components/cards/ContractCard.tsx` | Renders buttons, confirmation dialogs, opens modals | Client Component; uses `useUpdateContractStatus` |
| `src/lib/ai/toolDefinitions.ts` | Anthropic tool schemas; controls what the AI can do | Server-only |
| `src/lib/ai/systemPrompt.ts` | Role constraints narrative for AI | Server-only |
| `src/app/api/contract/getAll/route.ts` | Auto-expires pre-ACTIVE contracts; filters by role | Server-side query |
| `src/lib/dbServer.ts` | InstantDB server-side client (`instantServer`) | Singleton |
| `docs/PROGRAM.md` | Business logic, RBAC tables, lifecycle diagrams | Human-readable source of truth |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── api/contract/
│   │   ├── create/route.ts          # MODIFY — no changes needed (creates NEWLY_CREATED)
│   │   ├── getAll/route.ts          # MODIFY — remove pre-ACTIVE auto-expire checks,
│   │   │                              #        collapse CUSTOMER role contract visibility
│   │   └── updateStatus/route.ts    # MODIFY — collapse transition matrix from 8→2 states
│   ├── type/api/
│   │   └── index.ts                 # MODIFY — shrink ContractStatus union
├── components/
│   └── cards/
│       └── ContractCard.tsx         # MODIFY — simplify action buttons, remove obsolete dialogs
├── hooks/
│   └── useContracts.ts              # READ-ONLY (TanStack Query wrappers; no logic changes)
├── lib/
│   └── ai/
│       ├── toolDefinitions.ts       # MODIFY — update enum values in tool schemas
│       └── systemPrompt.ts          # MODIFY — simplify RBAC section
└── utils/
    └── statusUtils.ts               # MODIFY — collapse getContractActionButtons() logic
docs/
├── PROGRAM.md                       # MODIFY — rewrite lifecycle + RBAC tables
└── v1.1-enhance-contract-flow.md   # MODIFY — reflect completed change
.cursor/rules/
└── gochul-fitness-rules.mdc        # MODIFY — update maintenance rulebook
```

### Structure Rationale

- **`src/app/api/` — API routes:** Structural change is localized here. The state machine is encoded entirely in `updateStatus/route.ts`. No new routes are needed.
- **`src/utils/statusUtils.ts`:** Single transformation layer between the raw `ContractStatus` type and every UI rendering decision (buttons, badges, visibility). Changing it updates all consuming components simultaneously.
- **`src/lib/ai/`:** The AI chatbot is an alternative interface to the same API. Tool schemas and system prompts must stay in sync with the API's actual behavior — otherwise the AI will attempt invalid transitions and receive HTTP 403s.
- **`docs/` + `.cursor/rules/`:** Maintenance rulebook requires updating any time a status, role, or data field changes. Failure to update these is the highest-risk documentation gap.

---

## Architectural Patterns

### Pattern 1: Status Union Type as Single Source of Truth

**What:** `ContractStatus` is a TypeScript union type in `src/app/type/api/index.ts` that enumerates every valid status value. Every layer — API routes, UI utils, AI tool schemas — derives behavior from this type.

**When to use:** When status values drive conditional logic across multiple layers. Eliminates "stale status" bugs where one layer supports a status another layer doesn't know about.

**Trade-offs:**
- Pros: TypeScript enforces exhaustive matching; adding a new status produces compile errors in every switch statement.
- Cons: Changing a status value requires updating many files simultaneously (mitigated by the maintenance rulebook).

**Example — current vs. new:**
```typescript
// CURRENT: 8 statuses in the union
type ContractStatus =
  | 'NEWLY_CREATED'
  | 'CUSTOMER_REVIEW'      // ← REMOVE
  | 'CUSTOMER_CONFIRMED'   // ← REMOVE
  | 'CUSTOMER_PAID'        // ← REMOVE
  | 'PT_CONFIRMED'         // ← REMOVE
  | 'ACTIVE'
  | 'CANCELED'
  | 'EXPIRED'

// NEW: 4 statuses (2 lifecycle + 2 terminal)
type ContractStatus =
  | 'NEWLY_CREATED'
  | 'ACTIVE'
  | 'CANCELED'
  | 'EXPIRED'
```

### Pattern 2: Role-Gated Transition Matrix in API Route

**What:** `updateStatus/route.ts` encodes all valid transitions as a role-conditional if/else chain. The API is the authoritative enforcement gate — the UI only surfaces transitions the API will accept.

**When to use:** When transitions must be enforced consistently regardless of which interface (web UI, AI chatbot, mobile) initiates the request.

**Trade-offs:**
- Pros: Single enforcement point; AI chatbot and web UI are equally constrained.
- Cons: Route handler grows in complexity with each added role/transition; the if/else chain needs to be kept in sync with the type.

**Example — current vs. new:**
```typescript
// CURRENT: 3 role branches with 8-state logic
if (role === 'ADMIN') {
  // can force any status
} else if (newStatus === 'CANCELED') {
  // pre-ACTIVE cancel logic
} else if (role === 'STAFF') {
  // NEWLY_CREATED→CUSTOMER_REVIEW, CUSTOMER_PAID→PT_CONFIRMED
} else if (role === 'CUSTOMER') {
  // CUSTOMER_REVIEW→CONFIRMED→PAID→PT_CONFIRMED→ACTIVE
}

// NEW: 3 role branches, 2-state lifecycle
if (role === 'ADMIN') {
  // can force any status
} else if (newStatus === 'CANCELED') {
  // NEWLY_CREATED→CANCELED (pre-ACTIVE only)
} else if (role === 'STAFF') {
  // NEWLY_CREATED→CANCELED (cancel); NO forward transitions
  // NEWLY_CREATED→ACTIVE (activate) — add this per spec
} else if (role === 'CUSTOMER') {
  // NEWLY_CREATED→ACTIVE (activate); NEWLY_CREATED→CANCELED
}
```

### Pattern 3: UI Derives from Pure Utility Functions

**What:** `getContractActionButtons()`, `canViewContract()`, `getContractStatusVariant()` are pure functions in `statusUtils.ts`. `ContractCard` calls these and renders the result without any inline status logic.

**When to use:** When the same status-driven UI logic must be applied consistently across multiple components.

**Trade-offs:**
- Pros: Changing button logic in `statusUtils.ts` propagates to all components automatically. `ContractCard` remains thin.
- Cons: Utility functions must be kept in sync with the type and the API route. No compile-time link between the utility and the route's actual behavior.

---

## Data Flow

### Request Flow

```
[CUSTOMER clicks "Activate" on ContractCard]
    ↓
ContractCard.handleStatusChange('ACTIVE')
    ↓
useUpdateContractStatus({ contract_id, status: 'ACTIVE' })
    ↓
TanStack Query mutation → POST /api/contract/updateStatus
    ↓
auth() + user_setting lookup → role
    ↓
Role guard: isCustomer → can only ACTIVATE own NEWLY_CREATED contract
    ↓
InstantDB transact: contract[id].update({ status: 'ACTIVE', updated_at })
    ↓
Ably publish: contract.changed event
    ↓
RealtimeProvider invalidates TanStack Query cache
    ↓
ContractCard re-fetches contract → re-renders with ACTIVE badge + Create Session button
```

### State Management

```
InstantDB (server)           TanStack Query (client)         React UI
     │                               │                           │
     │ ← query contract             │                           │
     │                               │ ← useQuery contract       │
     │                               │                           │
     │ ← transact status update      │ ← mutation success         │
     │                               │                           │
     │                               │ ← invalidate queries      │
     │                               │                           │
     │ ← updated contract            │ ← re-fetch triggered      │
     │                               │                           │
     │                               │ ← query data updated      │
     │                               │                           │
     │                               │ ← component re-renders    │
```

### Key Data Flows

1. **Contract creation:** `CreateContractModal` → `useCreateContract` → `POST /api/contract/create` → InstantDB writes `status: 'NEWLY_CREATED'` → TanStack Query cache invalidated → `ContractCard` appears on list page.

2. **Contract activation:** `ContractCard` → `handleStatusChange('ACTIVE')` → `POST /api/contract/updateStatus` → API validates role + `currentStatus === 'NEWLY_CREATED'` → InstantDB update → Realtime event → UI transitions to ACTIVE.

3. **Contract cancellation:** `ContractCard` → `handleStatusChange('CANCELED')` with red `AlertDialog` confirmation → API validates role + `currentStatus !== 'ACTIVE'` → InstantDB update → UI removes card from active list.

4. **AI chatbot path:** User → AIChatbotModal → `POST /api/ai-chatbot` → `update_contract_status` tool → same `updateStatus` API route → same data flow.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Monolithic Next.js is fine. InstantDB handles 1:N contract/history queries well at this scale. |
| 1k–100k users | InstantDB query performance may degrade on `/api/contract/getAll` with large result sets. Add `limit`/`page` pagination (already present). Consider indexing `status`, `purchased_by`, `sale_by` fields in InstantDB schema. |
| 100k+ users | InstantDB may become a bottleneck for complex aggregation queries. Evaluate Postgres + Prisma migration. The API layer (role guards, transitions) would remain unchanged; only the data layer would swap. |

### Scaling Priorities

1. **First bottleneck:** Auto-expire logic in `getAll/route.ts` writes back to InstantDB on every request for pre-ACTIVE contracts past `end_date`. At scale, this write-on-read pattern will throttle. Fix: migrate expiry logic to a cron job or serverless function triggered on a schedule, not on every `getAll` call.
2. **Second bottleneck:** `history` queries for contracts with many sessions (PT contracts with 50+ credits). Fix: cursor-based pagination on the `history` entity, not page-based.

---

## Anti-Patterns

### Anti-Pattern 1: UI-Layer Transition Enforcement

**What people do:** Encode role/transition logic only in the UI (`getContractActionButtons` conditionally hides buttons), assuming the API will never receive invalid requests.

**Why it's wrong:** The AI chatbot bypasses the UI entirely. A tool definition that lists `CUSTOMER_REVIEW` as a valid next status will cause the AI to attempt that transition, hitting a 403 from the API and producing a confusing error message to the user.

**Do this instead:** Always enforce transitions server-side in the API route. Use the UI utilities only to improve UX (hiding impossible actions), never as the security boundary.

### Anti-Pattern 2: Stale Status Enums in Tool Schemas

**What people do:** Update the `ContractStatus` type but forget to update the `enum` arrays in `toolDefinitions.ts` and the hardcoded `validStatuses` array in `updateStatus/route.ts`.

**Why it's wrong:** TypeScript's union type only covers the TypeScript compile step. At runtime, the API still accepts the old enum values because they are string literals in the route, not derived from the type. This causes the AI (which uses tool schemas, not types) to propose transitions that are valid per the schema but invalid per the route's logic.

**Do this instead:** After changing `ContractStatus`, grep the entire codebase for the old status string literals (`'CUSTOMER_REVIEW'`, `'CUSTOMER_CONFIRMED'`, `'CUSTOMER_PAID'`, `'PT_CONFIRMED'`) and remove or update each occurrence. Add a compile-time check in the route:
```typescript
const validStatuses: ContractStatus[] = ['NEWLY_CREATED', 'ACTIVE', 'CANCELED', 'EXPIRED']
if (!validStatuses.includes(newStatus)) { ... }
```

### Anti-Pattern 3: Inconsistent Documentation Updates

**What people do:** Update the API route and UI but forget to update `PROGRAM.md` and `.cursor/rules/gochul-fitness-rules.mdc`.

**Why it's wrong:** Future developers (or AI agents) use `PROGRAM.md` as the source of truth for the lifecycle. A discrepancy means someone will implement new features against incorrect lifecycle documentation, producing bugs that are hard to detect until runtime.

**Do this instead:** Treat the maintenance rulebook as part of the same PR. Every status change requires updating all six items in the Maintenance Rulebook simultaneously.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| InstantDB | Server-side admin client (`instantServer`) in API routes; client-side `useQuery`/`useMutation` via TanStack Query | Status changes are InstantDB transactions. No schema migration needed — old `CUSTOMER_REVIEW` etc. values simply stop being written. |
| Clerk | `auth()` in every API route; session token forwarded to AI chatbot | Role lookup is always from InstantDB `user_setting`, not from Clerk claims. |
| Ably | `publishRealtimeEventSafely()` after every contract mutation | Event payload `{ entity_id, action: 'update_status', ... }` is generic. No changes needed — same `contract.changed` event fires regardless of which status value. |
| Anthropic Claude | Tool-use pattern via `toolDefinitions.ts` + `systemPrompt.ts` | AI must know the simplified lifecycle. Tool enum values must match actual API behavior. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI → API | TanStack Query mutations + `sonner` toast on success/error | No changes needed. TanStack Query hooks are thin wrappers. |
| AI Chatbot → API | `POST /api/ai-chatbot` → dispatches to internal API as user | AI tool schemas must be updated to reflect simplified transition matrix. |
| Realtime events → UI | Ably `contract.changed` → `RealtimeProvider` invalidates cache | No changes needed. Cache key (`['contracts', ...]`) is unaffected by status value changes. |
| `statusUtils.ts` → `ContractCard` | Function calls (`getContractActionButtons`, `getContractStatusVariant`) | Primary UI update point. Button logic collapses from 8-state switch to 2-state switch. |

---

## Sources

- `src/app/api/contract/updateStatus/route.ts` — current transition enforcement logic
- `src/app/type/api/index.ts` — current `ContractStatus` union type
- `src/utils/statusUtils.ts` — current action button derivation and badge logic
- `src/components/cards/ContractCard.tsx` — current button rendering and confirmation dialogs
- `src/lib/ai/toolDefinitions.ts` — current Anthropic tool schemas
- `src/lib/ai/systemPrompt.ts` — current AI role constraints narrative
- `docs/PROGRAM.md` — business logic and RBAC tables
- `docs/v1.1-enhance-contract-flow.md` — feature specification for this change

---

## Integration Points Summary

| Layer | File(s) | Change Type | Risk |
|-------|---------|-------------|------|
| Type definitions | `src/app/type/api/index.ts` | REMOVE 4 statuses from `ContractStatus` union | Medium — TypeScript compile errors will force all consumers to update |
| API — transition enforcement | `src/app/api/contract/updateStatus/route.ts` | Collapse STAFF/CUSTOMER branches; simplify ADMIN | High — this is the authoritative enforcement gate |
| API — auto-expiry | `src/app/api/contract/getAll/route.ts` | Remove pre-ACTIVE expiry by date (Rule C1) | Medium — old pre-ACTIVE statuses will stop being auto-expired |
| API — validity list | `src/app/api/contract/updateStatus/route.ts` | Remove old statuses from `validStatuses` array | High — runtime accepts stale values without this |
| UI — button logic | `src/utils/statusUtils.ts` | Collapse `getContractActionButtons()`; update `isPreActiveContractStatus()` | High — all cards rely on this |
| UI — badge + text | `src/utils/statusUtils.ts` | Remove old status variants, icons, text maps | Low — purely presentational |
| UI — card component | `src/components/cards/ContractCard.tsx` | Minor: remove any `CUSTOMER_REVIEW`/`PT_CONFIRMED` specific button handling (already correct since buttons come from `getContractActionButtons`); keep date-adjustment dialog for ACTIVE | Low — component is already correct for ACTIVE flow |
| AI — tool schemas | `src/lib/ai/toolDefinitions.ts` | Remove old statuses from `update_contract_status` enum; update descriptions | High — AI will propose invalid transitions otherwise |
| AI — system prompt | `src/lib/ai/systemPrompt.ts` | Update STAFF/CUSTOMER role permissions to reflect new 2-state lifecycle | Medium — affects AI conversation quality |
| Docs | `docs/PROGRAM.md`, `docs/v1.1-enhance-contract-flow.md` | Rewrite lifecycle section and RBAC tables | High — future developers rely on this |
| Cursor rules | `.cursor/rules/gochul-fitness-rules.mdc` | Update Maintenance Rulebook section | Medium — C3 and C4 expiry rules change |

---

## New vs. Modified Components

### New (none required)

This change is entirely a reduction — removing states, not adding new entities, routes, or components.

### Modified

| File | Modification |
|------|-------------|
| `src/app/type/api/index.ts` | Remove `'CUSTOMER_REVIEW'`, `'CUSTOMER_CONFIRMED'`, `'CUSTOMER_PAID'`, `'PT_CONFIRMED'` from `ContractStatus` |
| `src/app/api/contract/updateStatus/route.ts` | Replace 8-state role guard logic with 2-state logic; remove old `validStatuses` array entries |
| `src/app/api/contract/getAll/route.ts` | Update `CONTRACT_STATUS_VALUES` array; remove `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` |
| `src/utils/statusUtils.ts` | Simplify `getContractActionButtons()`; update `isPreActiveContractStatus()`; remove dead `variant`/`text`/`icon` entries for removed statuses; update `canViewContract()` — customers can now see `NEWLY_CREATED` |
| `src/components/cards/ContractCard.tsx` | Minor: remove any `CUSTOMER_REVIEW`/`PT_CONFIRMED` specific button handling (already correct since buttons come from `getContractActionButtons`); keep date-adjustment AlertDialog |
| `src/lib/ai/toolDefinitions.ts` | Remove old statuses from `update_contract_status` tool enum; update tool descriptions to reflect new RBAC |
| `src/lib/ai/systemPrompt.ts` | Update STAFF/CUSTOMER role permissions to reflect new 2-state lifecycle |
| `docs/PROGRAM.md` | Rewrite §6 (Contract Workflow Lifecycle), §4.2 (Contract Permissions), §5 (Expiry Rules C1, C3, C4) |
| `docs/v1.1-enhance-contract-flow.md` | Mark as complete / update to reflect implementation |
| `.cursor/rules/gochul-fitness-rules.mdc` | Update Maintenance Rulebook section |

---

## Suggested Build Order

1. **`src/app/type/api/index.ts`** — Change the `ContractStatus` union first. TypeScript compile errors in every other file will force sequential, safe updates.

2. **`src/app/api/contract/updateStatus/route.ts`** — Collapse the role guard logic. Verify with a test that STAFF can no longer send `NEWLY_CREATED→CUSTOMER_REVIEW` and that CUSTOMER can now activate directly from `NEWLY_CREATED`.

3. **`src/app/api/contract/getAll/route.ts`** — Remove old statuses from `CONTRACT_STATUS_VALUES`. Test that `CUSTOMER` role can now see `NEWLY_CREATED` contracts.

4. **`src/utils/statusUtils.ts`** — Update all utility functions. Verify with a unit test that `getContractActionButtons('NEWLY_CREATED', 'CUSTOMER')` returns only `Activate` and `Cancel`, and that `getContractActionButtons('NEWLY_CREATED', 'STAFF')` returns `Cancel` (no `Send to Customer`).

5. **`src/components/cards/ContractCard.tsx`** — The component should work correctly after step 4; verify the ACTIVE date-adjustment dialog still fires correctly.

6. **`src/lib/ai/toolDefinitions.ts`** + **`src/lib/ai/systemPrompt.ts`** — Update AI layer. Test via the chatbot that attempting a removed transition produces a clean error (not a 403 with a confusing message).

7. **`docs/PROGRAM.md`** + **`docs/v1.1-enhance-contract-flow.md`** + **`.cursor/rules/gochul-fitness-rules.mdc`** — Update documentation as the final step before marking the feature complete.

---

*Architecture research for: Contract Flow Simplification (v1.1)*
*Researched: 2026-04-10*
