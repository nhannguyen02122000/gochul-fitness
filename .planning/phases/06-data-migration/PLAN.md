---
gsd_plan_version: 1.1
phase: 6-data-migration
status: planning
requirements:
  - MIGRATE-01
  - MIGRATE-02
  - MIGRATE-03
  - MIGRATE-04
wave: execution
depends_on: []
files_modified:
  - src/app/api/admin/migrateContractStatuses/route.ts (CREATE)
  - src/app/type/api/index.ts (APPEND)
autonomous: false
---

# Phase 6 Plan: Data Migration

## Goal

One-time backfill of all existing contracts in 4 deprecated intermediate states → `ACTIVE`, before Phase 7 removes those states from the TypeScript `ContractStatus` union. Preserves `start_date`, sets `updated_at = Date.now()` on each migrated contract.

**must_haves (goal-backward verification):**
- [ ] MIGRATE-01: `CUSTOMER_REVIEW` contracts migrated to `ACTIVE`
- [ ] MIGRATE-02: `CUSTOMER_CONFIRMED` contracts migrated to `ACTIVE`
- [ ] MIGRATE-03: `CUSTOMER_PAID` contracts migrated to `ACTIVE`
- [ ] MIGRATE-04: `PT_CONFIRMED` contracts migrated to `ACTIVE`
- [ ] All contracts have `status: 'ACTIVE'` in DB; deprecated statuses eliminated
- [ ] All migrated contracts have `updated_at` set to migration timestamp
- [ ] `start_date` is preserved (never reset to today)
- [ ] Only ADMIN can call the endpoint

---

## Wave 1 — Migration Endpoint (parallel)

### Task 1: Create `migrateContractStatuses/route.ts`

**Task ID:** phase-6-task-1
**File to create:** `src/app/api/admin/migrateContractStatuses/route.ts`

<read_first>
- `src/app/api/admin/backfillTimestamps/route.ts` — inline auth + role guard pattern, `chunkArray()` function, batch transact pattern
- `src/lib/dbServer.ts` — `instantServer` export
- `src/app/type/api/index.ts` — `Contract` interface (`status: ContractStatus`, `start_date?: number`, `updated_at: number`), `ApiErrorResponse` interface
</read_first>

<action>
Create the file with the following complete content:

```typescript
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BATCH_SIZE = 100

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize))
    }
    return chunks
}

export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
        }

        const userData = await instantServer.query({
            user_setting: { $: { where: { clerk_id: userId } }, users: {} }
        })
        const userSetting = userData.user_setting[0]

        if (!userSetting) {
            return NextResponse.json({ error: 'User settings not found' }, { status: 404 })
        }

        if (userSetting.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Only ADMIN can preview migration' }, { status: 403 })
        }

        const [reviewData, confirmedData, paidData, ptData] = await Promise.all([
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_REVIEW' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_CONFIRMED' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_PAID' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'PT_CONFIRMED' } } } })
        ])

        const reviewContracts = reviewData.contract || []
        const confirmedContracts = confirmedData.contract || []
        const paidContracts = paidData.contract || []
        const ptContracts = ptData.contract || []

        const contracts = [
            ...reviewContracts.map((c) => ({ ...c, current_status: 'CUSTOMER_REVIEW' as const })),
            ...confirmedContracts.map((c) => ({ ...c, current_status: 'CUSTOMER_CONFIRMED' as const })),
            ...paidContracts.map((c) => ({ ...c, current_status: 'CUSTOMER_PAID' as const })),
            ...ptContracts.map((c) => ({ ...c, current_status: 'PT_CONFIRMED' as const }))
        ]

        return NextResponse.json({
            counts: {
                CUSTOMER_REVIEW: reviewContracts.length,
                CUSTOMER_CONFIRMED: confirmedContracts.length,
                CUSTOMER_PAID: paidContracts.length,
                PT_CONFIRMED: ptContracts.length
            },
            total: contracts.length,
            contracts: contracts.map((c) => ({
                id: c.id,
                current_status: c.current_status,
                start_date: c.start_date ?? null,
                purchased_by: c.purchased_by,
                kind: c.kind
            }))
        }, { status: 200 })
    } catch (error) {
        console.error('Error previewing migration:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
        }

        const userData = await instantServer.query({
            user_setting: { $: { where: { clerk_id: userId } }, users: {} }
        })
        const userSetting = userData.user_setting[0]

        if (!userSetting) {
            return NextResponse.json({ error: 'User settings not found' }, { status: 404 })
        }

        if (userSetting.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Only ADMIN can run migration' }, { status: 403 })
        }

        const [reviewData, confirmedData, paidData, ptData] = await Promise.all([
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_REVIEW' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_CONFIRMED' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_PAID' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'PT_CONFIRMED' } } } })
        ])

        const allContracts = [
            ...(reviewData.contract || []),
            ...(confirmedData.contract || []),
            ...(paidData.contract || []),
            ...(ptData.contract || [])
        ]

        if (allContracts.length === 0) {
            return NextResponse.json({
                message: 'No contracts to migrate',
                migrated: 0,
                by_status: {
                    CUSTOMER_REVIEW: 0,
                    CUSTOMER_CONFIRMED: 0,
                    CUSTOMER_PAID: 0,
                    PT_CONFIRMED: 0
                }
            }, { status: 200 })
        }

        const now = Date.now()
        const transactions = allContracts.map((contract) =>
            instantServer.tx.contract[contract.id].update({
                status: 'ACTIVE',
                updated_at: now
            })
        )

        const chunks = chunkArray(transactions, BATCH_SIZE)
        for (const chunk of chunks) {
            await instantServer.transact(chunk)
        }

        const byStatus = {
            CUSTOMER_REVIEW: (reviewData.contract || []).length,
            CUSTOMER_CONFIRMED: (confirmedData.contract || []).length,
            CUSTOMER_PAID: (paidData.contract || []).length,
            PT_CONFIRMED: (ptData.contract || []).length
        }

        return NextResponse.json({
            message: 'Contract status migration completed',
            migrated: allContracts.length,
            by_status: byStatus
        }, { status: 200 })
    } catch (error) {
        console.error('Error migrating contract statuses:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
```
</action>

<acceptance_criteria>
- [ ] `src/app/api/admin/migrateContractStatuses/route.ts` exists and is syntactically valid TypeScript
- [ ] File exports both `GET` and `POST` functions (no default export)
- [ ] `export const dynamic = 'force-dynamic'` is present
- [ ] Auth pattern: `auth()` → `instantServer.query()` for `user_setting` → role check `userSetting.role !== 'ADMIN'` → `403`
- [ ] GET queries all 4 deprecated statuses with `Promise.all` + `instantServer.query({ contract: { $: { where: { status: '...' } } } })`
- [ ] GET response shape includes `counts.CUSTOMER_REVIEW`, `counts.CUSTOMER_CONFIRMED`, `counts.CUSTOMER_PAID`, `counts.PT_CONFIRMED`, `total`, and `contracts` array
- [ ] GET `contracts` array entries contain `id`, `current_status`, `start_date` (nullable), `purchased_by`, `kind` — no other fields
- [ ] POST queries all 4 deprecated statuses with `Promise.all` (same as GET)
- [ ] POST builds `instantServer.tx.contract[id].update({ status: 'ACTIVE', updated_at: now })` transactions for each contract
- [ ] `now = Date.now()` is captured once at start of migration loop (consistent timestamp for all records)
- [ ] Transactions are chunked via `chunkArray(transactions, 100)` and processed sequentially with `await instantServer.transact(chunk)`
- [ ] POST response shape: `{ message: string, migrated: number, by_status: { CUSTOMER_REVIEW: number, ... } }`
- [ ] POST returns early with `migrated: 0` if no contracts found
- [ ] No changes to `start_date` field anywhere in the code
- [ ] Error handling: `try/catch` on all DB operations, returns `{ error: '...' }` with `500` status
- [ ] Role check error messages are specific: `"Forbidden - Only ADMIN can preview migration"` and `"Forbidden - Only ADMIN can run migration"`
</acceptance_criteria>

---

## Wave 2 — TypeScript Types

### Task 2: Add migration types to `src/app/type/api/index.ts`

**Task ID:** phase-6-task-2
**File to modify:** `src/app/type/api/index.ts`

<read_first>
- `src/app/type/api/index.ts` — read the entire file (already done above; confirm `ApiErrorResponse` is at line 90-92; confirm file ends at line ~530)
</read_first>

<action>
Append the following types to the end of `src/app/type/api/index.ts`, after the `UserSearchResponse` type (line 530). The new section must be added at the very end of the file:

```typescript
// ============================================================================
// /api/admin/migrateContractStatuses
// ============================================================================

export type DeprecatedContractStatus = 'CUSTOMER_REVIEW' | 'CUSTOMER_CONFIRMED' | 'CUSTOMER_PAID' | 'PT_CONFIRMED'

export interface MigrateContractStatusesPreviewContract {
    id: string
    current_status: DeprecatedContractStatus
    start_date: number | null
    purchased_by: string
    kind: ContractKind
}

export interface MigrateContractStatusesPreview {
    counts: {
        CUSTOMER_REVIEW: number
        CUSTOMER_CONFIRMED: number
        CUSTOMER_PAID: number
        PT_CONFIRMED: number
    }
    total: number
    contracts: MigrateContractStatusesPreviewContract[]
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
</action>

<acceptance_criteria>
- [ ] `src/app/type/api/index.ts` ends with the new migration types section (no existing content deleted)
- [ ] `DeprecatedContractStatus` type alias lists exactly `'CUSTOMER_REVIEW' | 'CUSTOMER_CONFIRMED' | 'CUSTOMER_PAID' | 'PT_CONFIRMED'`
- [ ] `MigrateContractStatusesPreviewContract` has fields: `id: string`, `current_status: DeprecatedContractStatus`, `start_date: number | null`, `purchased_by: string`, `kind: ContractKind`
- [ ] `MigrateContractStatusesPreview` has `counts` (4 fields, all `number`), `total: number`, `contracts: MigrateContractStatusesPreviewContract[]`
- [ ] `MigrateContractStatusesSuccessResponse` has `message: string`, `migrated: number`, `by_status` (4 count fields)
- [ ] `MigrateContractStatusesResponse` is a union: `MigrateContractStatusesSuccessResponse | ApiErrorResponse`
- [ ] File has no TypeScript errors when running `npm run build` (or `npx tsc --noEmit`)
- [ ] `ContractKind` and `ApiErrorResponse` are already imported/referenced from earlier in the file (no new import needed)
</acceptance_criteria>

---

## Verification

After both waves complete, run the following to verify:

```bash
# 1. TypeScript compilation
npm run build 2>&1 | tail -20

# 2. GET preview (as ADMIN user via browser/curl)
# GET /api/admin/migrateContractStatuses
# Expected: { counts: {...}, total: N, contracts: [...] }

# 3. POST execution (as ADMIN user)
# POST /api/admin/migrateContractStatuses
# Expected: { message: "Contract status migration completed", migrated: N, by_status: {...} }

# 4. GET again — should return total: 0, all counts: 0
# GET /api/admin/migrateContractStatuses

# 5. Spot-check InstantDB: query contracts with status 'ACTIVE' to confirm migrated records
```

---

## Summary

| Task | File | Action |
|------|------|--------|
| 1 | `src/app/api/admin/migrateContractStatuses/route.ts` | CREATE — GET preview + POST execute |
| 2 | `src/app/type/api/index.ts` | APPEND — migration type definitions |

All 4 requirements (MIGRATE-01–04) are addressed by the single POST handler that migrates all 4 deprecated statuses in one atomic batched operation.