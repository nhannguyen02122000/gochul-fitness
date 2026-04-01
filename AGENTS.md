# AGENTS.md — AI Agent Guidelines for GoChul Fitness

> **Last updated:** 2026-04-01
> **Purpose:** Provide AI agents with a structured map of the codebase, operational rules, and design guidelines.

---

## Rule 0 — Documentation Rule

> **Update `@docs/PROGRAM.md` first, then write any code.**

Before implementing a new feature, modifying existing functionality, or changing any business rule, the agent **MUST** update `docs/PROGRAM.md` to reflect the change. `PROGRAM.md` is the single source of truth for the application's business logic, database schema, API contracts, and RBAC rules.

**What to document in PROGRAM.md when changing code:**
- New or modified API routes → add entry to §3 (API Structure)
- New or modified database entities/fields → update §2 (Database Structure)
- New or modified roles or permissions → update §4 (RBAC)
- New or modified business rules (expiry, lifecycle, workflow) → update §5, §6, §7
- New frontend pages or components → update §10 (Frontend Pages)
- New TypeScript types → update Appendix (TypeScript Types)
- New environment variables → update Appendix (Environment Variables)

---

## Rule 1 — Always Follow `ui-ux-pro-max`

> **Use the `ui-ux-pro-max` skill for all UI/UX design and implementation decisions.**

When working on any frontend feature — layouts, components, interactions, animations, color, typography, spacing, or responsive behavior — invoke and follow the `ui-ux-pro-max` skill guidance. Do not improvise design choices that contradict the skill's recommendations.

**When to invoke `ui-ux-pro-max`:**
- Building or modifying any page in `src/app/`
- Building or modifying any component in `src/components/`
- Choosing colors, fonts, spacing, or animation
- Designing new modals, cards, forms, or navigation
- Performing a visual audit or review of existing UI

---

## 1. Where to Find Files

### 1.1 API Routes — `src/app/api/`

All backend logic lives here. Every route authenticates via Clerk (`auth()`) and enforces RBAC in code (not in InstantDB permissions).

#### Contract APIs (`src/app/api/contract/`)

| File | Route | Method | Purpose |
|------|-------|--------|---------|
| `create/route.ts` | `/api/contract/create` | POST | Creates a contract (ADMIN/STAFF). Initial status: `NEWLY_CREATED`. Publishes `contract.changed`. |
| `delete/route.ts` | `/api/contract/delete` | POST | Soft-deletes → `CANCELED`. ADMIN only. Publishes `contract.changed`. |
| `getAll/route.ts` | `/api/contract/getAll` | GET | Paginated contract list with role-based scoping, filters, auto-expiry of stale contracts. |
| `update/route.ts` | `/api/contract/update` | POST | Updates contract fields. ADMIN only. Publishes `contract.changed`. |
| `updateStatus/route.ts` | `/api/contract/updateStatus` | POST | Status lifecycle transitions. Role-gated. Auto-expiry checks. Date adjustment on `PT_CONFIRMED → ACTIVE`. Publishes `contract.changed`. |

#### History/Session APIs (`src/app/api/history/`)

| File | Route | Method | Purpose |
|------|-------|--------|---------|
| `create/route.ts` | `/api/history/create` | POST | Books a session. Validates contract `ACTIVE`, credits, time conflicts. Publishes `history.changed`. |
| `delete/route.ts` | `/api/history/delete` | POST | Soft-deletes → `CANCELED`. Role-based. Publishes `history.changed`. |
| `getAll/route.ts` | `/api/history/getAll` | GET | Paginated session list with role-based scoping, filters, auto-expiry of `NEWLY_CREATED` sessions past end time. |
| `getByContract/route.ts` | `/api/history/getByContract` | GET | Fetches all sessions for one contract. Auto-expires stale sessions. |
| `getOccupiedTimeSlots/route.ts` | `/api/history/getOccupiedTimeSlots` | GET | Returns a trainer's occupied slots for a given date (used by scheduling UI). |
| `update/route.ts` | `/api/history/update` | POST | Updates session date/time. Validates contract still `ACTIVE` and no time conflicts. Role-based. Publishes `history.changed`. |
| `updateNote/route.ts` | `/api/history/updateNote` | POST | Updates `staff_note` (STAFF/ADMIN) or `customer_note` (CUSTOMER). Publishes `history.changed`. |
| `updateStatus/route.ts` | `/api/history/updateStatus` | POST | Dual check-in flow + cancellation. Publishes `history.changed`. |

#### User APIs (`src/app/api/user/`)

| File | Route | Method | Purpose |
|------|-------|--------|---------|
| `checkUserSetting/route.ts` | `/api/user/checkUserSetting` | GET | Checks if current user has a `user_setting` record. |
| `createUserSetting/route.ts` | `/api/user/createUserSetting` | POST | Creates `user_setting` linked to Clerk user. Defaults role to `CUSTOMER`. |
| `getAll/route.ts` | `/api/user/getAll` | GET | Paginated user list. ADMIN only. Enriches with Clerk avatar URLs. |
| `getByRole/route.ts` | `/api/user/getByRole` | GET | Fetches users filtered by role. ADMIN/STAFF only. Used by user selectors. |
| `getUserInformation/route.ts` | `/api/user/getUserInformation` | GET | Merges Clerk user data + InstantDB `user_setting`. Used by TopBar, RealtimeProvider. |
| `updateBasicInfo/route.ts` | `/api/user/updateBasicInfo` | POST | Updates `first_name` / `last_name`. Self-only. |
| `updateEssentialInformation/route.ts` | `/api/user/updateEssentialInformation` | POST | Saves onboarding questionnaire answers. Marks `essential_ready: true` on final submission. |
| `updateRole/route.ts` | `/api/user/updateRole` | POST | ADMIN changes any user's role. Prevents self-modification. |

#### Admin APIs (`src/app/api/admin/`)

| File | Route | Method | Purpose |
|------|-------|--------|---------|
| `backfillTimestamps/route.ts` | `/api/admin/backfillTimestamps` | POST | ADMIN-only utility. Backfills missing `created_at`/`updated_at` on `contract` and `history`. |

#### Realtime API (`src/app/api/realtime/`)

| File | Route | Method | Purpose |
|------|-------|--------|---------|
| `token/route.ts` | `/api/realtime/token` | GET | Generates Ably scoped token for authenticated user. Production only. |

---

### 1.2 Database — Root Level

| File | Purpose |
|------|---------|
| `instant.schema.ts` | InstantDB schema: 4 entities (`contract`, `history`, `user_setting`, `$users`) and 7 links. |
| `instant.perms.ts` | InstantDB permissions: `view: true` for all authenticated users, `create/update/delete: false`. All mutations are enforced in API routes. |

---

### 1.3 Frontend Pages — `src/app/(main)/` and `src/app/`

| Route | File | Access | Purpose |
|-------|------|--------|---------|
| `/` | `src/app/(main)/page.tsx` | All | Dashboard / Home |
| `/contracts` | `src/app/(main)/contracts/page.tsx` | All (filtered) | Contract list |
| `/history` | `src/app/(main)/history/page.tsx` | All (filtered) | Session history |
| `/profile` | `src/app/(main)/profile/page.tsx` | Own | User profile |
| `/profile/essential-information` | `src/app/(main)/profile/essential-information/page.tsx` | CUSTOMER | Full onboarding questionnaire |
| `/user-management` | `src/app/(main)/user-management/page.tsx` | ADMIN | User management list |
| `/user-management/[uid]` | `src/app/(main)/user-management/[uid]/page.tsx` | ADMIN | User detail/edit |
| `/sign-in` | `src/app/sign-in/[[...sign-in]]/page.tsx` | Public | Clerk sign-in |
| `/offline` | `src/app/offline/page.tsx` | All | PWA offline fallback |

---

### 1.4 Components — `src/components/`

#### Layout (`src/components/layout/`)

| File | Component | Purpose |
|------|-----------|---------|
| `MainLayout.tsx` | `MainLayout` | App shell: TopBar + main content + BottomNavigation + PWAInstaller + OnboardingModal. |
| `TopBar.tsx` | `TopBar` | Sticky header: avatar, name, role badge, page title, manual refresh button. |
| `BottomNavigation.tsx` | `BottomNavigation` | Fixed bottom tab bar: Contracts, Home, Sessions, Profile. |

#### Cards (`src/components/cards/`)

| File | Component | Purpose |
|------|-----------|---------|
| `ContractCard.tsx` | `ContractCard` | Contract display card with kind/status badge, price, credit counter, action buttons. Integrates `CreateSessionModal` and `SessionHistoryModal`. |
| `SessionCard.tsx` | `SessionCard` | Session display card with date/time, check-in status, notes. Bottom sheet for notes editing. |

#### Common (`src/components/common/`)

| File | Component | Purpose |
|------|-----------|---------|
| `StatusBadge.tsx` | `StatusBadge` | Colored badge for contract/session status using Padlet palette tokens. |
| `TimeSlotPicker.tsx` | `TimeSlotPicker` | Grid of time slot buttons (available, selected, occupied, past). |
| `UserSearchSelect.tsx` | `UserSearchSelect` | Combobox for searching and selecting customers by name/email. |

#### Modals (`src/components/modals/`)

| File | Component | Purpose |
|------|-----------|---------|
| `CreateContractModal.tsx` | `CreateContractModal` | Multi-step form to create a contract. ADMIN/STAFF only. |
| `CreateSessionModal.tsx` | `CreateSessionModal` | Session booking modal: select contract, date, time slot. |
| `OnboardingModal.tsx` | `OnboardingModal` | First-time profile setup (first/last name). Blocks until completed. |
| `SessionHistoryModal.tsx` | `SessionHistoryModal` | Bottom sheet: stats bar + scrollable session list for a contract. Auto-refreshes every 60s. |

#### Root Components (`src/components/`)

| File | Component | Purpose |
|------|-----------|---------|
| `InstantAuthDB.tsx` | `InstantDBAuthSync` | Syncs Clerk auth → InstantDB auth via `getToken()` / `signInWithIdToken()`. |
| `PWAInstaller.tsx` | `PWAInstaller` | Native "Install App" banner for non-localhost. Registers service worker. |
| `PullToRefresh.tsx` | `PullToRefresh` | Pull-down-to-refresh wrapper. Invalidates all React Query caches. |

#### UI Primitives (`src/components/ui/`) — shadcn/ui

`alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `command`, `dialog`, `input-group`, `input-otp`, `input`, `label`, `popover`, `select`, `separator`, `skeleton`, `sonner`, `tabs`, `textarea`, `tooltip`

---

### 1.5 Hooks — `src/hooks/`

| File | Hooks | Purpose |
|------|-------|---------|
| `useContracts.ts` | `useContracts`, `useInfiniteContracts`, `useCreateContract`, `useUpdateContract`, `useDeleteContract`, `useUpdateContractStatus` | All contract CRUD + `contractKeys` factory. |
| `useHistory.ts` | `useInfiniteHistory`, `useCreateHistory`, `useUpdateHistory`, `useDeleteHistory`, `useUpdateHistoryStatus`, `useUpdateHistoryNote`, `useTrainerSchedule`, `useContractHistory` | All session CRUD + schedule helpers. `useTrainerSchedule` (30s staleTime), `useContractHistory` (1min staleTime). |
| `useUser.ts` | `useUpdateUserBasicInfo`, `useUpdateEssentialInformation` | Profile and onboarding mutations. |
| `useUserOnboarding.ts` | `useCheckUserSetting`, `useCreateUserSetting` | Onboarding flow + `userOnboardingKeys` factory. |
| `useUsers.ts` | `useCustomers`, `useStaff`, `useAdmins`, `useInfiniteUsers`, `useUpdateUserRole` | Role-based user fetching + `userKeys` factory. |

---

### 1.6 Utilities — `src/utils/` and `src/lib/`

#### `src/utils/`

| File | Key Functions | Purpose |
|------|--------------|---------|
| `statusUtils.ts` | `getContractActionButtons`, `getHistoryActionButtons`, `isPreActiveContractStatus`, `canViewContract`, `canCancelContract`, `canCancelHistory`, `getContractStatusText/Variant/Color`, `getHistoryStatusText/Variant/Color`, `shouldShowContractActionButtons`, `shouldShowHistoryActionButtons` | Status lifecycle, role-based button visibility, badge styling. |
| `timeUtils.ts` | `minutesToTime`, `timeToMinutes`, `formatDate`, `formatDateTime`, `isExpired`, `isContractExpired`, `getTimeSlots`, `formatTimeRange`, `getRelativeTime`, `getTimeSlotsByDuration`, `checkSlotOverlap`, `isSlotInPast` | Time/date conversions, expiration checks, slot generation/overlap. |
| `currencyUtils.ts` | `formatVND`, `formatVNDNumber`, `parseVND` | Vietnamese Dong formatting. |
| `clearCache.ts` | `clearAllCaches`, `resetPWA`, `updateServiceWorker` | PWA cache management. |

#### `src/lib/`

| File | Purpose |
|------|---------|
| `db.ts` | Client-side InstantDB client (`instantClient`). |
| `dbServer.ts` | Server-side InstantDB admin client (`instantServer`). Used by all API routes. |
| `essentialInformation.ts` | 34-question onboarding questionnaire form definition, render helpers, validators. |
| `roleCheck.ts` | `isAdmin(role)`, `isStaffOrAdmin(role)` helpers. |
| `utils.ts` | `cn()` — Tailwind class merger. |
| `realtime/ablyServer.ts` | Server Ably client. `publishRealtimeEvent`, `publishRealtimeEventSafely`, `createScopedTokenRequest`. |
| `realtime/channel.ts` | `getUserRealtimeChannel(userId)` → `user:{userId}`. |

---

### 1.7 Providers — `src/providers/`

| File | Component | Purpose |
|------|-----------|---------|
| `QueryClientProvider.tsx` | `ReactQueryProvider` | React Query setup: 60s default staleTime, `refetchOnWindowFocus: true`, includes devtools. |
| `RealtimeProvider.tsx` | `RealtimeProvider` | Ably Realtime client. Subscribes to `contract.changed` and `history.changed` for current user. Invalidates React Query caches on events. Production only. |

---

### 1.8 Theme — `src/theme/`

| File | Purpose |
|------|---------|
| `colors.ts` | Named Padlet color palette exports (`colors.primary`, `.secondary`, `.accent`, `.warning`) with shade variants (50–900). |

---

### 1.9 Types — `src/app/type/api/`

| File | Purpose |
|------|---------|
| `index.ts` | Single source of truth for all TypeScript types: `Role`, `ContractKind`, `ContractStatus`, `HistoryStatus`, `User`, `UserSetting`, `Contract`, `History`, plus all API request/response types and filter types. |

---

## 2. Architecture Overview

```
Clerk (auth)
    │
    ▼
Next.js API Routes (src/app/api/)
├── auth() → Clerk JWT
├── roleCheck → user_setting lookup
├── InstantDB transactions/queries (dbServer)
└── Ably event publishing (production)
           │
           ▼
InstantDB (database) + Ably (realtime)
           │
           ▼
Client Components
├── React Query hooks (src/hooks/)
├── RealtimeProvider (Ably → cache invalidation)
└── UI Components (src/components/)
```

**Key constraints:**
- All mutations go through API routes — never call InstantDB directly from client components.
- InstantDB permissions (`instant.perms.ts`) are `view: true` for all — RBAC is enforced in API routes.
- Realtime is production-only (`NODE_ENV === 'production'`).

---

## 3. Key Business Rules (Quick Reference)

| Rule | Location | Summary |
|------|----------|---------|
| Contract auto-expiry (pre-ACTIVE) | `getAll/route.ts` | Contract with `end_date < now` in pre-ACTIVE status → `EXPIRED` |
| Contract auto-expiry (ACTIVE, credits) | `getAll/route.ts` | `ACTIVE` contract + `end_date < now` + credits exhausted → `EXPIRED` |
| Session auto-expiry | `getAll/route.ts`, `getByContract/route.ts` | `NEWLY_CREATED` session past end time → `EXPIRED` |
| Date adjustment on activation | `updateStatus/route.ts` | `PT_CONFIRMED → ACTIVE`: if `now` differs from `start_date`, reset dates proportionally |
| Dual check-in | `updateStatus/route.ts` | Both `user_check_in_time` + `staff_check_in_time` set → `CHECKED_IN` |
| Credits consumed | `PROGRAM.md §5` | Only `NEWLY_CREATED` and `CHECKED_IN` sessions consume credits |
| No sessions on expired contracts | `create/route.ts`, `update/route.ts` | Returns 400 if contract `end_date < now` |
| Realtime channels | `channel.ts` | Channel name: `user:{instantUserId}` — users only subscribe to their own channel |
