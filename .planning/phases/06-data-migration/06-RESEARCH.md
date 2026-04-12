# Phase 6: Data Migration — Research

**Phase:** 6-data-migration
**Output:** 06-RESEARCH.md (this file)
**Research date:** 2026-04-10
**Status:** Ready to plan

---

## 1. What This Phase Does

One-time backfill of existing contracts from 4 deprecated intermediate states → `ACTIVE`.

| Requirement | Deprecated status | Action |
|------------|-------------------|--------|
| MIGRATE-01 | `CUSTOMER_REVIEW` | → `ACTIVE`, preserve `start_date` |
| MIGRATE-02 | `CUSTOMER_CONFIRMED` | → `ACTIVE`, preserve `start_date` |
| MIGRATE-03 | `CUSTOMER_PAID` | → `ACTIVE`, preserve `start_date` |
| MIGRATE-04 | `PT_CONFIRMED` | → `ACTIVE`, preserve `start_date` |

**Out of scope for this phase:**
- TypeScript type changes (Phase 7)
- UI changes (Phase 8)
- Documentation updates (Phase 9)
- AI chatbot tool updates

---

## 2. Source of Truth: Existing Code Patterns

### Auth + role guard pattern

From `src/app/api/admin/backfillTimestamps/route.ts`:

```typescript
export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userData = await instantServer.query({
    user_setting: { $: { where: { clerk_id: userId } }, users: {} }
  })
  const userSetting = userData.user_setting[0]

  if (!userSetting) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (userSetting.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // ...
}
```

**This is the exact pattern to reuse.** No `requireRole()` helper exists — role check is inline.

### InstantDB server instance

From `src/lib/dbServer.ts`:

```typescript
export const instantServer = initServer({
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID,
  adminToken: process.env.INSTANTDB_ADMIN_TOKEN
})
```

Use `instantServer.query({ contract: { $: { where: { status: '...' } } } })` for reads.
Use `instantServer.tx.contract[id].update({ status: 'ACTIVE' })` for writes.

### Batch processing pattern

From `backfillTimestamps`:

```typescript
const BATCH_SIZE = 100

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

// Usage:
const chunks = chunkArray(allTransactions, BATCH_SIZE)
for (const chunk of chunks) {
  await instantServer.transact(chunk)
}
```

**Copy `chunkArray` directly** — it's already in the codebase, not extracted to a utility.

### Response format

From `backfillTimestamps`:

```typescript
return NextResponse.json({ message: '...', updated_X: N, total_updates: N }, { status: 200 })
```

---

## 3. Data Model — What We Read and Write

### Contract entity fields

From `src/app/type/api/index.ts` `Contract` interface:

```
id               string
created_at       number
updated_at       number
start_date?      number  ← MUST preserve (do not reset)
end_date?        number
kind             ContractKind
credits?         number
duration_per_session number
used_credits?    number
status           ContractStatus  ← we read this, write ACTIVE
money            number
sale_by?         string
purchased_by     string
users?           User[]
sale_by_user?    User[]
purchased_by_user? User[]
history?         History[]
```

### ContractStatus current values (TypeScript, phase-7 will trim)

```typescript
type ContractStatus =
  | 'NEWLY_CREATED'    // ← NOT migrated — already simplified
  | 'CUSTOMER_REVIEW'  // ← MIGRATE-01
  | 'CUSTOMER_CONFIRMED' // ← MIGRATE-02
  | 'CUSTOMER_PAID'    // ← MIGRATE-03
  | 'PT_CONFIRMED'     // ← MIGRATE-04
  | 'ACTIVE'           // ← destination
  | 'CANCELED'         // ← NOT migrated
  | 'EXPIRED'          // ← NOT migrated
```

### What to query

The migration reads contracts where `status` is in `{CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, PT_CONFIRMED}`.
Writes only the `status` field → `'ACTIVE'`.

**Note:** There is no `instantServer.query()` support for `IN` clause on status. Need to:
1. Query all contracts
2. Filter in JS
3. Build transactions

OR: Make 4 separate queries with `where: { status: 'CUSTOMER_REVIEW' }` etc. and merge.

**Decision:** 4 sequential queries is fine for a one-time admin operation — cleaner to read and count per-status.

### What about `start_date`?

Per D-05 in context: **preserve `start_date`**. Do not write to it. If null, leave null.

### What about `updated_at`?

`backfillTimestamps` pattern writes `updated_at` explicitly. For migration, should we touch `updated_at`? The requirement only says `status` → `ACTIVE` with `start_date` preserved. Best practice: update `updated_at` to `Date.now()` to reflect the migration event.

---

## 4. Endpoint Design

### File location

`src/app/api/admin/migrateContractStatuses/route.ts`

### GET — Preview

**Purpose:** Let admin see what will be migrated before running POST.

**Auth:** Clerk `auth()`, find `user_setting`, check `role === 'ADMIN'`.

**Query strategy:** 4 separate queries for each deprecated status.

```typescript
const [reviewData, confirmedData, paidData, ptData] = await Promise.all([
  instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_REVIEW' } } } }),
  instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_CONFIRMED' } } } }),
  instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_PAID' } } } }),
  instantServer.query({ contract: { $: { where: { status: 'PT_CONFIRMED' } } } }),
])
```

**Response shape:**

```typescript
// GET response
{
  counts: {
    CUSTOMER_REVIEW: number,
    CUSTOMER_CONFIRMED: number,
    CUSTOMER_PAID: number,
    PT_CONFIRMED: number
  },
  total: number,
  contracts: Array<{
    id: string
    current_status: ContractStatus
    start_date: number | null
    purchased_by: string
    kind: ContractKind
  }>
}
```

Per D-07 in context. Total should not exceed several thousand even in the worst case — no pagination needed for a one-time admin preview.

**Edge case:** 0 contracts in all 4 statuses → GET returns `{ counts: { all: 0 }, total: 0, contracts: [] }`. POST should be safe to call and return `{ migrated: 0, by_status: {...} }`.

### POST — Execute migration

**Auth:** Same as GET.

**Process:**
1. Query all 4 deprecated statuses (same as GET, or reuse in-memory if called sequentially — no, always re-query for correctness)
2. Build transactions: `instantServer.tx.contract[id].update({ status: 'ACTIVE', updated_at: Date.now() })` for each contract
3. Chunk into batches of 100
4. Execute chunks sequentially with `await instantServer.transact(chunk)`
5. Return summary

**Response shape:**

```typescript
// POST response
{
  message: string,
  migrated: number,
  by_status: {
    CUSTOMER_REVIEW: number,
    CUSTOMER_CONFIRMED: number,
    CUSTOMER_PAID: number,
    PT_CONFIRMED: number
  }
}
```

**Concurrency note:** If GET and POST are called simultaneously, the POST might migrate contracts shown in GET's preview. This is acceptable for a one-time manual operation. No idempotency flag needed (per D-11: no dry-run mode).

---

## 5. Error Handling

- **401:** No Clerk session → `NextResponse.json({ error: '...' }, { status: 401 })`
- **403:** Not ADMIN → `NextResponse.json({ error: '...' }, { status: 403 })`
- **500:** Catch block around all DB/transact calls → `NextResponse.json({ error: 'Internal server error' }, { status: 500 })`

**Transactional integrity:** If one batch fails mid-way, earlier batches are already committed (InstantDB transactions auto-commit on `transact()` success). The response will show partial results. This is acceptable — manual re-run or inspection will handle it.

**No partial rollback needed** for a one-time migration.

---

## 6. TypeScript Types to Add

In `src/app/type/api/index.ts` — new section for migration types:

```typescript
// ============================================================================
// /api/admin/migrateContractStatuses
// ============================================================================

export type DeprecatedContractStatus = 'CUSTOMER_REVIEW' | 'CUSTOMER_CONFIRMED' | 'CUSTOMER_PAID' | 'PT_CONFIRMED'

export interface MigrateContractStatusesPreview {
  counts: {
    CUSTOMER_REVIEW: number
    CUSTOMER_CONFIRMED: number
    CUSTOMER_PAID: number
    PT_CONFIRMED: number
  }
  total: number
  contracts: Array<{
    id: string
    current_status: ContractStatus
    start_date: number | null
    purchased_by: string
    kind: ContractKind
  }>
}

export interface MigrateContractStatusesSuccessResponse {
  message: string
  migrated: number
  by_status: {
    CUSTOMER_REVIEW: number
    CUSTOMER_CONFIRMED: number
    CUSTOMER_PAID: number
    PT_CONFIRMED: number
  }
}

export type MigrateContractStatusesResponse = MigrateContractStatusesSuccessResponse | ApiErrorResponse
```

**Note on `DeprecatedContractStatus`:** This is a type alias used only in this migration context. Phase 7 will remove the 4 statuses from `ContractStatus`, at which point this alias becomes unnecessary — but it will compile fine during the migration phase since those values still exist in `ContractStatus` at that point (Phase 7 removes them). No circular dependency risk.

---

## 7. Execution Order with Phase 7

Phase 7 removes the 4 deprecated statuses from `ContractStatus` TypeScript union. That change breaks any code that references those string literals — **including the migration endpoint if it hasn't been run yet**.

**Correct order:**
1. Phase 6: Create and run `migrateContractStatuses` endpoint → all contracts in DB are `ACTIVE`
2. Phase 7: Remove deprecated values from `ContractStatus` union → safe because DB has no such values

If Phase 7 runs before Phase 6, the migration endpoint would have TypeScript errors on the string literals `'CUSTOMER_REVIEW'`, etc. — so plan must enforce Phase 6 → 7 sequential order. Confirmed in STATE.md decisions.

---

## 8. Verification Checklist

After POST runs successfully, admin should manually verify:

- [ ] Run GET again — all counts should be 0
- [ ] Run GET on `contract` entity filtered by `status: 'ACTIVE'` — migrated contracts appear
- [ ] Spot-check a few contracts: `status` is `ACTIVE`, `start_date` unchanged
- [ ] No contracts with deprecated statuses remain (unless intentionally left — there should be 0)

---

## 9. Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Should `start_date` be set to today if missing? | **No** — D-06: leave as-is if null |
| Should `updated_at` be updated? | **Yes** — set to `Date.now()` to reflect migration event |
| Should we support idempotent POST (re-run safe)? | **Yes** — no-op on already-migrated contracts; counts reflect current state |
| Is 4-query vs 1-query better for GET? | 4 queries is fine and gives clean per-status counts without in-JS filtering |
| Any performance concern with large datasets? | Batch size 100 is sufficient; InstantDB admin API handles thousands |
| What if Phase 7 type changes ship before migration runs? | Migration endpoint would TS-error on string literals — must enforce phase order in plan |

---

## 10. Summary: What Needs to Be Built

| File | Action |
|------|--------|
| `src/app/api/admin/migrateContractStatuses/route.ts` | **CREATE** — GET preview + POST execute |
| `src/app/type/api/index.ts` | **ADD** — migration response types |

No other files touched in Phase 6. No hooks, no components, no utils.

**Plan tasks:**
1. Add TypeScript types for migration endpoint
2. Create `migrateContractStatuses/route.ts` with GET + POST
3. Verify endpoint with GET before running POST
4. Execute POST
5. Verify POST results
6. Mark MIGRATE-01–04 complete in REQUIREMENTS.md