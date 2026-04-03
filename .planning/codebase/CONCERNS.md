# Codebase Concerns

## Overview

This document catalogs technical debt, known issues, security concerns, performance problems, and fragile architectural areas identified during a thorough review of the codebase (April 2026).

---

## 🔴 Critical Issues

### C1 — Secrets Exposed in `.env.local` (Committed to Git)

**File:** `.env.local`

The `.env.local` file is **tracked in git** (not in `.gitignore`) and contains live secret keys:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cmFwaWQta2l0LTczLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_...redacted...
INSTANTDB_ADMIN_TOKEN=7b7f3120-925c-4496-bb7a-e7a21cbdb8cb
ABLY_API_KEY=3TXctQ.01r_uQ:z_doC4uhko-CEVbHwULc4tO5eXow7eYlqQZmhDDEX5Y
CLAUDE_API_KEY=sk-...redacted...
```

**Risk:** Anyone with repo access can retrieve these keys. `CLERK_SECRET_KEY` and `INSTANTDB_ADMIN_TOKEN` are server-side only but still exposed. `ABLY_API_KEY` is a full server-key. The `CLAUDE_API_KEY` is a real Anthropic API key.

**Action:** Remove `.env.local` from git, add it to `.gitignore`, rotate all keys immediately.

---

### C2 — `InstantDB_ADMIN_TOKEN` Used Server-Side Without Access Control

**Files:** `src/lib/dbServer.ts`, all server-side API routes

`INSTANTDB_ADMIN_TOKEN` grants admin-level access to InstantDB. It is used directly by all API routes for any database operation. There is no per-request scope limiting — every authenticated route call operates with full admin privileges.

**Risk:** If any API route has an access-control bug (and several exist — see C3–C5), the damage is maximized because the caller has full DB write access.

**Action:** Implement row-level security or scoped permission tokens. Avoid using the admin token for day-to-day API operations.

---

### C3 — No Rate Limiting on Any API Route

**Files:** All routes in `src/app/api/`

Every API route is unprotected against abuse. An attacker or malicious user could:

- Spam session creation to exhaust a PT's schedule
- Rapidly query `/api/user/getAll` to enumerate all users
- Abuse `/api/history/create` to create ghost sessions

**Action:** Add rate limiting middleware (e.g., `@upstash/ratelimit`, Vercel Edge Config) on all API routes, especially write operations.

---

### C4 — Unbounded Data Fetching in `getAll` Routes (N+1 O(n) Memory)

**Files:**
- `src/app/api/history/getAll/route.ts` (lines 242–259)
- `src/app/api/contract/getAll/route.ts` (lines 361–375)
- `src/app/api/user/getAll/route.ts` (lines 78–86)

All three `getAll` routes fetch **all matching records** from the database, then filter and paginate **in-memory**.

```ts
// getAll — fetches ALL history records, then paginates in JS
const allHistoryData = await instantServer.query({ history: { ... } })
pagedHistory = allHistoryData.history || []   // potentially thousands of rows
// ... in-memory filtering ...
const pagedResult = pagedHistory.slice(offset, offset + limit)
```

For a customer with 500 sessions, every page load fetches all 500 records into memory, sorts them, then discards 490. For an admin with 10,000 sessions across all customers, this is a serious problem.

**Impact:** Memory exhaustion, slow responses, increased DB I/O.

**Action:** Push filtering and pagination to the database layer. Use InstantDB's `$limit`, `$offset`, and indexed `where` clauses instead of in-memory operations.

---

## 🟠 High-Priority Concerns

### C5 — Race Conditions in Concurrent Session Booking

**Files:**
- `src/app/api/history/create/route.ts`
- `src/app/api/history/update/route.ts`

The flow for creating a session is:
1. Query existing sessions for the trainer on that date
2. Check for time overlaps in JS
3. If no overlap → insert new session

Steps 1–3 are **not atomic**. Two concurrent requests from different customers booking the same trainer slot will both pass the overlap check and both create sessions, resulting in a **double-booking**.

**Example:**
- Trainer A has slot 10:00–11:00 free
- Request 1: passes overlap check, creates session
- Request 2: also passes overlap check (before Request 1's session is visible or committed), creates session
- Result: **double-booked trainer at 10:00–11:00**

The same issue exists in `update/route.ts` for rescheduling.

**Action:** Use a database-level locking mechanism or optimistic concurrency control. InstantDB transactions should be used to atomically check-and-insert rather than read-then-write.

---

### C6 — Credit Counting Race Condition

**Files:**
- `src/app/api/history/create/route.ts` (lines 199–209)
- `src/app/api/contract/getAll/route.ts` (lines 383–406)

Credit availability is checked by counting existing history records with `NEWLY_CREATED` or `CHECKED_IN` status:

```ts
const usedCredits = contract.history?.filter(
  (h) => isCreditUsedHistoryStatus(h.status)
).length || 0

if (usedCredits >= contract.credits) {
  return NextResponse.json({ error: 'No credits available' }, { status: 400 })
}
```

This is a **read-then-validate** pattern with no locking. Two concurrent booking requests for the last available credit will both see credit available and both create sessions, over-committing credits.

**Action:** Use atomic credit decrement or optimistic locking on the contract entity. Consider a transactional outbox pattern.

---

### C7 — STAFF Role Has No Route Protection (`roleCheck.ts` is Unused)

**File:** `src/lib/roleCheck.ts`

The `roleCheck.ts` file defines `isAdmin()` and `isStaffOrAdmin()` utility functions, but **they are never imported or used anywhere**. Role checks are instead inlined in each API route with inconsistent patterns:

- Some routes check `role === 'STAFF' || role === 'ADMIN'`
- Some check only `role === 'ADMIN'`
- Some check only `role !== 'ADMIN'`

The inconsistency makes it hard to audit who can do what. The helper functions exist but are dead code.

**Action:** Either use `roleCheck.ts` utilities consistently across all routes, or remove it entirely.

---

### C8 — `updateContract` Allows ADMIN to Change `purchased_by` Without Consent Check

**File:** `src/app/api/contract/update/route.ts` (lines 208–226)

The `updateContract` route allows ADMIN to reassign `purchased_by` (the customer on a contract) to any user without validation. An ADMIN could accidentally or maliciously reassign a customer's active contract to another user, transferring ownership.

**Action:** Add a confirmation step or restrict reassignment on contracts with `status === 'ACTIVE'`.

---

### C9 — Check-in Status Always Resets to `NEWLY_CREATED` on Partial Check-in

**File:** `src/app/api/history/updateStatus/route.ts` (lines 186–226)

When a STAFF checks in a customer (or vice versa), the code has a bug where `updateData.status` is always initialized to `'NEWLY_CREATED'`:

```ts
const updateData: { ... } = {
  status: 'NEWLY_CREATED',   // ← always set, then possibly overwritten below
  updated_at: now
}
// ...
if (nextUserCheckInTime && nextStaffCheckInTime) {
  updateData.status = 'CHECKED_IN'  // only set when BOTH times exist
}
```

If only one party checks in (e.g., customer but not staff yet), the status remains `NEWLY_CREATED`. This is technically the intended behavior, but the initialization to `'NEWLY_CREATED'` is confusing and could mask logic errors.

**Action:** Initialize `status` to `currentStatus` and only change it when the dual-check-in condition is met.

---

### C10 — `useUpdateHistoryStatus` 2-Second Stale Cache Delay

**File:** `src/hooks/useHistory.ts` (lines 279–281)

```ts
setTimeout(() => {
  queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
}, 2000)
```

After a check-in action, the contract list (which shows `used_credits`) is **not invalidated for 2 seconds**. Users see stale credit counts during this window. There is no explanation for this delay.

**Action:** Invalidate immediately. The 2-second delay was likely intended to let a server-side operation complete, but `invalidateQueries` only triggers a re-fetch and does not need to wait for anything.

---

### C11 — Inconsistent Soft-Delete Patterns

**Files:**
- `src/app/api/history/delete/route.ts` — soft-deletes (`status: 'CANCELED'`)
- `src/app/api/contract/delete/route.ts` — soft-deletes (`status: 'CANCELED'`)

Hard deletes are not implemented anywhere, which is good for audit trails. However, history records that are soft-deleted (CANCELED) still **consume credits** — the credit check in `create/route.ts` counts `NEWLY_CREATED` and `CHECKED_IN` but does NOT count `CANCELED`. A canceled session still effectively uses a credit.

**Impact:** If a customer cancels a session, that credit is not returned to the pool. The contract's `credits` field becomes permanently depleted by canceled sessions.

**Action:** Implement credit restoration on session cancellation, or clarify the business rule.

---

### C12 — Next.js 16.1.0 + React 19.2.3 — Pre-Release / Experimental Stack

**File:** `package.json`

Next.js 16.1.0 and React 19.2.3 are **future/beta versions** relative to April 2026 context. Next.js 16 was not released as of early 2026, and React 19 was still in beta. These versions may have:

- Undocumented breaking changes
- Incompatibility with third-party libraries (e.g., `@tanstack/react-query`, `@clerk/nextjs`)
- Missing production hardening

**Action:** Pin to stable, well-tested versions. Do not ship production traffic on pre-release framework versions.

---

## 🟡 Medium-Priority Concerns

### C13 — `getAll` Routes Return Full Nested Objects, Not Just IDs

**Files:**
- `src/app/api/history/getAll/route.ts`
- `src/app/api/contract/getAll/route.ts`
- `src/app/api/user/getAll/route.ts`

Every route returns fully nested objects including linked entities (`sale_by_user`, `purchased_by_user`, `contract`, `users`, etc.). For list views that only need IDs and labels, this wastes bandwidth and increases JSON serialization time.

**Example:** `getOccupiedTimeSlots` only needs `{ from, to }` but the query fetches full history records with all linked data.

**Action:** Create lean response types for list views that omit nested full objects.

---

### C14 — No Input Length Limits on Text Fields

**Files:** All API routes that accept `staff_note`, `customer_note`, and `essential_information`

- `src/app/api/history/updateNote/route.ts` — `note` field has no max length validation
- `src/app/api/user/updateEssentialInformation/route.ts` — `essential_information` JSON has no size limit

**Impact:** A user could submit arbitrarily large notes or onboarding data, bloating the database.

**Action:** Add `maxLength` validation (e.g., 10,000 chars for notes, 100 KB for JSON fields).

---

### C15 — Query Results Cast with `as never` and `Record<string, unknown>`

**Files:** `src/app/api/history/getAll/route.ts` (line 245), `src/app/api/contract/getAll/route.ts` (line 364)

```ts
where: contractWhere as never
```

Using `as never` bypasses TypeScript's type checking. The `contractWhere` object is built dynamically with string/number values but cast to `never` to suppress errors. This hides potential type mismatches at runtime.

**Action:** Define typed query builder utilities with proper InstantDB query type support.

---

### C16 — `useInfiniteHistory` Stale Closure Risk

**File:** `src/hooks/useHistory.ts` (lines 183–196)

```ts
export function useInfiniteHistory(limit: number = 10, filters?: HistoryFilters) {
    return useInfiniteQuery({
        queryFn: ({ pageParam = 1 }) => fetchHistory(pageParam, limit, filters),
        // ...
    })
}
```

`filters` object is captured in the closure. If `filters` is a new object reference on every render (e.g., `const filters = { statuses: [...] }` defined in a component), React Query's reference equality check may not detect filter changes correctly, leading to stale data.

**Action:** Memoize filters with `useMemo` and ensure stable references, or explicitly include filter values in the query key.

---

### C17 — `Ably API Key` is a Server Key, Not a Restricted Key

**File:** `src/lib/realtime/ablyServer.ts`

The `ABLY_API_KEY` environment variable contains the full server API key. It is used server-side to publish messages. However, this key is also present in `.env.local` and should ideally be scoped.

**Action:** Use Ably's namespaced/targeted token requests instead of the full server key for publishing.

---

### C18 — Duplicate Code Across API Routes

Every API route independently implements the same pattern for:
- Auth check (`const { userId } = await auth()`)
- UserSetting lookup (`instantServer.query({ user_setting: { $: { where: { clerk_id: userId } }, users: {} } })`)
- Role extraction (`const role = userSetting.role`)
- Error response construction

This is ~30 lines of boilerplate repeated 17 times. Bugs in one route's auth logic may not be caught because other routes have their own slightly different implementations.

**Action:** Extract common auth/authorization middleware or shared utility functions.

---

### C19 — `essential_information` Stored as Raw JSON String

**File:** `instant.schema.ts`

```ts
essential_information: i.string().optional() // JSON string of onboarding answers
```

Onboarding data is stored as a JSON string in a plain text field. There is no schema validation at the database level — any arbitrary string can be stored. It is parsed/validated only in `updateEssentialInformation/route.ts`.

**Action:** Consider using InstantDB's typed map/object fields if supported, or validate JSON schema on write.

---

### C20 — No `created_by` Tracking on `history` Entity

**File:** `instant.schema.ts`

The `history` entity links to the user who created the record via `users` link (the "creator"), but there is no explicit `created_by` field. Permissions are checked by examining `existingHistory.users?.[0]?.id` to verify the creator matches `userInstantId`. However:

- The `users` link on history is set at creation time but never verified against a `created_by` field
- If the link relationship is ever broken, permission checks could silently pass or fail unexpectedly

**Action:** Add an explicit `created_by: i.string()` field and populate it on creation.

---

## 🔵 Low-Priority Concerns

### C21 — Hardcoded Magic Numbers Without Constants

**Files:** Multiple API routes

- `LEGACY_DEFAULT_DURATION = 90` — hardcoded in `create` and `update` routes
- `MIN_SESSION_DURATION = 15`, `MAX_SESSION_DURATION = 180`, `SESSION_DURATION_STEP = 15` — duplicated in `create` and `update`
- `1440` (minutes in a day) — used as default upper bound in `getAll`

**Action:** Extract to shared constants in `src/utils/` or `src/lib/constants.ts`.

---

### C22 — No Pagination on `useContractHistory` or `useTrainerSchedule`

**Files:**
- `src/hooks/useHistory.ts` (lines 329–336)
- `src/hooks/useHistory.ts` (lines 363–369)

Both hooks fetch all data for a contract or trainer with no pagination. For a contract with 100 sessions, all 100 are fetched and rendered.

**Action:** Add pagination support or virtual scrolling for long lists.

---

### C23 — `.eslintrc` Uses `flat` Config But Decorators Not Configured

**File:** `eslint.config.mjs`

ESLint flat config is used, but there is no `@typescript-eslint/parser` parser configuration, and no explicit rules for common React/Next.js issues. The codebase may be missing lint coverage.

**Action:** Audit and extend ESLint config to cover Next.js 16, React 19, and TypeScript 5 best practices.

---

### C24 — No Test Coverage Indicated

No `*.test.*` or `*.spec.*` files were found in the `src/` directory. The absence of automated tests means:

- Refactoring is high-risk
- Bugs can only be caught in production
- The race conditions (C5, C6) are especially dangerous without tests

**Action:** Add unit tests for business logic (credit counting, time overlap, status transitions) and integration tests for API routes.

---

### C25 — `tsconfig.tsbuildinfo` Tracked in Git

**File:** `tsconfig.tsbuildinfo` (shown in file listing)

TypeScript incremental build info files should not be committed to version control.

**Action:** Add `*.tsbuildinfo` to `.gitignore`.

---

### C26 — Schema Version Not Explicitly Tracked

**File:** `instant.schema.ts`

InstantDB schema changes are applied directly to the live schema. There is no migration strategy or schema version tracking. As the schema evolves, existing data must be manually migrated or risk incompatibility.

**Action:** Document the current schema version and establish a migration process before making further schema changes.

---

## Summary Table

| ID | Category | Severity | Area | Description |
|----|----------|----------|------|-------------|
| C1 | Security | 🔴 Critical | Infra | Secrets committed to git in `.env.local` |
| C2 | Security | 🔴 Critical | Backend | Admin token used for all operations, no scoping |
| C3 | Security | 🔴 Critical | API | No rate limiting on any endpoint |
| C4 | Performance | 🔴 Critical | API | Unbounded in-memory pagination (N+1) |
| C5 | Correctness | 🟠 High | API | Race condition: concurrent session double-booking |
| C6 | Correctness | 🟠 High | API | Race condition: concurrent credit over-commit |
| C7 | Maintainability | 🟠 High | API | Unused `roleCheck.ts` helpers, inconsistent role checks |
| C8 | Security | 🟠 High | API | ADMIN can reassign contract ownership without guard |
| C9 | Maintainability | 🟠 High | Frontend | Confusing check-in status initialization |
| C10 | UX | 🟠 High | Frontend | 2-second stale cache delay after check-in |
| C11 | Correctness | 🟠 High | API | Canceled sessions don't restore credits |
| C12 | Stability | 🟠 High | Stack | Pre-release Next.js 16.1 + React 19.2.3 |
| C13 | Performance | 🟡 Medium | API | Over-fetching nested objects in list responses |
| C14 | Security | 🟡 Medium | API | No input length limits on text fields |
| C15 | Maintainability | 🟡 Medium | API | `as never` casts hiding type errors |
| C16 | Correctness | 🟡 Medium | Frontend | Stale closure risk in `useInfiniteHistory` |
| C17 | Security | 🟡 Medium | Realtime | Full Ably server key used instead of scoped token |
| C18 | Maintainability | 🟡 Medium | API | ~30 lines of duplicated auth boilerplate per route |
| C19 | Data Integrity | 🟡 Medium | Schema | `essential_information` stored as untyped JSON string |
| C20 | Correctness | 🟡 Medium | Schema | No explicit `created_by` field, link-only tracking |
| C21 | Maintainability | 🔵 Low | API | Magic numbers not extracted to constants |
| C22 | Performance | 🔵 Low | Frontend | No pagination on contract/trainer history hooks |
| C23 | Quality | 🔵 Low | Tooling | ESLint config may be incomplete |
| C24 | Quality | 🔵 Low | Testing | No test coverage |
| C25 | Quality | 🔵 Low | Tooling | `tsconfig.tsbuildinfo` tracked in git |
| C26 | Maintainability | 🔵 Low | Schema | No schema version tracking |
