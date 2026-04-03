# GoChul Fitness — Architecture

## 1. Pattern: Monolithic Full-Stack Next.js App

GoChul Fitness is a **Progressive Web App (PWA)** built with **Next.js 16 (App Router)**, using a **layered monolithic architecture** within a single codebase. The frontend and API layer are co-located in the same Next.js application, with third-party managed services providing authentication, database, and real-time capabilities.

---

## 2. Request / Response Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser / PWA Client                                               │
│                                                                     │
│  1. Clerk Auth Token (Clerk) ──► Middleware validates session      │
│  2. HTTP Request (with Clerk token)                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js Middleware (middleware.ts)                                  │
│  • Redirects unauthenticated users to /sign-in                       │
│  • Preserves session across requests                                 │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js App Router Layer                                           │
│                                                                      │
│  2a. Route Groups:                                                   │
│      • (main)/   → Protected routes (require auth)                  │
│      • sign-in/  → Clerk-hosted sign-in page                        │
│      • api/      → API route handlers                               │
│                                                                      │
│  2b. Server Components (layout.tsx) render the shell:               │
│      ClerkProvider → InstantAuthDB → ReactQueryProvider             │
│                      → RealtimeProvider → TooltipProvider           │
│                      → children (page content)                       │
│                                                                      │
│  2c. Client Components (page.tsx files) fetch data from API routes  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  API Routes (src/app/api/*/route.ts)                                │
│                                                                      │
│  Each route:                                                         │
│  1. auth()          → Verify Clerk session, get userId              │
│  2. instantServer.query() → Query InstantDB (server-side)           │
│  3. Business logic   → Filter, sort, paginate, expire records       │
│  4. instantServer.transact() → Write to InstantDB (mutations)      │
│  5. publishRealtimeEventSafely() → Push event via Ably              │
│  6. NextResponse.json()  → Return typed response                   │
│                                                                      │
│  Routes:                                                             │
│  api/contract/{create,update,delete,updateStatus,getAll}             │
│  api/history/{create,update,delete,updateStatus,updateNote,         │
│                getAll,getByContract,getOccupiedTimeSlots}            │
│  api/user/{getUserInformation,getAll,getByRole,updateBasicInfo,     │
│            updateEssentialInformation,updateRole,checkUserSetting,   │
│            createUserSetting}                                        │
│  api/realtime/token                                                  │
│  api/admin/backfillTimestamps                                        │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  External Managed Services                                           │
│                                                                      │
│  Clerk (auth)                                                        │
│  • Issue/validate JWT tokens                                        │
│  • User identity, avatar, email                                      │
│  • Middleware integration                                           │
│                                                                      │
│  InstantDB (database)                                               │
│  • Primary data store for all entities                              │
│  • Schema: $users, contract, history, user_setting                   │
│  • Instant Auth sync via idToken sign-in                             │
│                                                                      │
│  Ably (real-time)                                                   │
│  • Channel-per-user real-time pub/sub                               │
│  • TokenRequest API for scoped client tokens                         │
│  • Contract & history change events                                  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Data Returns to Client                                              │
│                                                                      │
│  • API returns JSON (typed in src/app/type/api/index.ts)             │
│  • TanStack Query caches response                                    │
│  • Mutations invalidate relevant query keys                          │
│  • RealtimeProvider subscribes and calls queryClient.invalidateQueries│
│  • UI re-renders with fresh data                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

All entities live in **InstantDB** (schema: `instant.schema.ts`).

```
┌──────────────────┐
│      $users      │  (InstantDB built-in — synced from Clerk)
│  email (indexed) │
└────────┬─────────┘
         │
         │ 1:1  (user_setting link)
         ▼
┌──────────────────┐       1:N         ┌──────────────────┐
│   user_setting   │◄─────────────────►│     contract     │
│  role            │                    │  kind            │
│  clerk_id        │                    │  credits         │
│  first_name      │                    │  status          │
│  last_name       │                    │  money           │
│  essential_info  │                    │  sale_by ────────┼──► $users
└──────────────────┘                    │  purchased_by ───┼──► $users
                                       └────────┬─────────┘
                                                │ 1:N (history link)
                                                ▼
                                       ┌──────────────────┐
                                       │     history      │
                                       │  date            │
                                       │  status          │
                                       │  from / to (min) │
                                       │  teach_by ────────┼──► $users
                                       │  staff_note      │
                                       │  customer_note   │
                                       │  check_in times  │
                                       └──────────────────┘
```

### Relationships
- **$users ↔ user_setting**: one-to-one via `userSettings` link
- **$users ↔ contract**: one-to-many via `contractUser` (purchased_by), `contractSaleBy` (sale_by)
- **contract ↔ history**: one-to-many via `historyContract`
- **$users ↔ history**: one-to-many via `historyUser` (teach_by)

### Status Machines

**Contract lifecycle:**
```
NEWLY_CREATED → CUSTOMER_REVIEW → CUSTOMER_CONFIRMED → CUSTOMER_PAID
                                                             ↓
CANCELED ◄────────────────────── PT_CONFIRMED ←──────────────┘
                                                             ↓
                                                          ACTIVE
                                                             │
                              CANCELED / EXPIRED ◄────────────┘
```

**Session (history) lifecycle:**
```
NEWLY_CREATED → CHECKED_IN
       │
       ▼
  CANCELED / EXPIRED
```

---

## 4. Key Abstractions

### 4.1 Query Layer (TanStack Query Hooks)

| Hook | Purpose | Query Keys |
|------|---------|-----------|
| `useContracts` | Paginated contract list | `contractKeys.lists()` |
| `useInfiniteContracts` | Infinite-scroll contract list | `contractKeys.lists()` + infinite |
| `useCreateContract` | Create contract | Invalidates `contractKeys.lists()` |
| `useUpdateContract` | Update contract | Invalidates `contractKeys.lists()` |
| `useDeleteContract` | Delete contract | Invalidates `contractKeys.lists()` |
| `useUpdateContractStatus` | Workflow transitions | Invalidates `contractKeys.lists()` |
| `useInfiniteHistory` | Paginated session list | `historyKeys.lists()` |
| `useCreateHistory` | Create session | Invalidates `historyKeys.lists()`, `contractKeys.lists()` |
| `useUpdateHistory` | Update session | Invalidates `historyKeys.lists()` |
| `useDeleteHistory` | Cancel session | Invalidates `historyKeys.lists()` |
| `useUpdateHistoryStatus` | Check-in | Invalidates `historyKeys.lists()`, delayed `contractKeys.lists()` |
| `useUpdateHistoryNote` | Add note | Invalidates `historyKeys.lists()` |
| `useTrainerSchedule` | Occupied slots for a date | `['history', 'trainer-schedule', userId, date]` |
| `useContractHistory` | Sessions for a contract | `['history', 'by-contract', contractId]` |
| `useCheckUserSetting` | Onboarding eligibility | `userOnboardingKeys.check()` |
| `useCreateUserSetting` | First-time setup | Invalidates onboarding + userInfo keys |
| `useUpdateUserBasicInfo` | Profile edit | Invalidates `userKeys.settings()` |
| `useUpdateEssentialInformation` | Onboarding form | Invalidates `userKeys.settings()`, `['userInfo']` |

### 4.2 Real-Time Layer

```
API Mutation (e.g., createContract)
        │
        ▼
instantServer.transact()   ──►  InstantDB persistence
        │
        ▼
publishRealtimeEventSafely(eventName, userIds, payload)
        │
        ▼
Ably channel.publish(eventName, payload)   ──► per-user channel
                                               "realtime:[userId]"
        │
        ▼
RealtimeProvider (client) subscribes to own channel
        │
        ▼
queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
        │
        ▼
TanStack Query re-fetches affected queries
        │
        ▼
UI automatically re-renders with fresh data
```

Ably token auth: client → `/api/realtime/token` → server creates scoped `TokenRequest` → client connects with token.

### 4.3 Auth Sync Abstraction

`InstantDBAuthDB.tsx` bridges Clerk and InstantDB:
- On Clerk sign-in → `instantClient.auth.signInWithIdToken({ idToken })`
- On Clerk sign-out → `instantClient.auth.signOut()`
- InstantDB user is looked up by email in the JWT token

### 4.4 Role-Based Access

```
isAdmin(role)       → role === 'ADMIN'
isStaffOrAdmin(role) → role === 'STAFF' || role === 'ADMIN'
```
Used in API routes to scope queries (STAFF sees own contracts/sessions, CUSTOMER sees only own data).

---

## 5. Entry Points

| Entry | File | Role |
|-------|------|------|
| Root layout | `src/app/layout.tsx` | Wraps all pages; sets up providers, Clerk, PWA meta |
| Main layout | `src/app/(main)/layout.tsx` | Wraps authenticated pages; renders `MainLayout` shell |
| Page: Dashboard | `src/app/(main)/page.tsx` | Home dashboard with stats, upcoming sessions |
| Page: Contracts | `src/app/(main)/contracts/page.tsx` | Contract list with filters, create button |
| Page: Sessions | `src/app/(main)/history/page.tsx` | Session list with filters, create button |
| Page: Profile | `src/app/(main)/profile/page.tsx` | User profile, stats, role-specific sections |
| Page: Essential Info | `src/app/(main)/profile/essential-information/page.tsx` | Onboarding form |
| Page: User Management | `src/app/(main)/user-management/page.tsx` | Admin user listing |
| Page: User Detail | `src/app/(main)/user-management/[uid]/page.tsx` | Admin user edit |
| Page: Sign In | `src/app/sign-in/[[...sign-in]]/page.tsx` | Clerk-hosted sign-in |
| Page: Offline | `src/app/offline/page.tsx` | PWA offline fallback |
| API: All routes | `src/app/api/*/route.ts` | Backend logic for each entity |

---

## 6. Caching Strategy

- **`dynamic = 'force-dynamic'`** set globally on all layouts and API routes — no Next.js ISR/caching
- **TanStack Query** `staleTime: 60_000` (1 minute) as default; `staleTime: 30_000` for trainer schedule
- **Pull-to-refresh**: `PullToRefresh` component invalidates all query keys and refetches active queries
- **Desktop refresh**: TopBar `handleRefresh` button calls `queryClient.refetchQueries({ type: 'active' })`
- **Realtime invalidation**: On `contract.changed` or `history.changed` events, invalidates relevant keys
- **Next.js onDemandEntries**: `maxInactiveAge: 0, pagesBufferLength: 0` — disables dev server caching

---

## 7. Design Tokens

Color system defined in `src/theme/colors.ts` using the Padlet palette:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-cta` | `#F26076` (coral) | Primary CTA buttons |
| `--color-cta-hover` | `#D94E63` | Hover state for CTA |
| `--color-warning` | `#FF9760` (orange) | Pending states, warm accents |
| `--color-success` | `#458B73` (teal) | Active/completed states |
| `--color-success-bg` | `#E8F5EF` | Success background tint |
| `--color-warning-bg` | `#FFF4EC` | Warning background tint |
| `--color-pt-bg` | `#FDE8EB` | PT/secondary background tint |

Status badge color mappings in `src/utils/statusUtils.ts` use these tokens to ensure dark-mode consistency.
