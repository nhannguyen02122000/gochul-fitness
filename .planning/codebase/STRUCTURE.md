# GoChul Fitness — Directory Structure

## Root Configuration

```
gochul-fitness/
├── .env.local                 # Environment variables (Clerk, InstantDB, Ably)
├── .gitignore
├── .editorconfig
├── .prettierrc               # Prettier config
├── .prettierignore
├── eslint.config.mjs          # ESLint flat config
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json            # shadcn/ui component registry
├── instant.schema.ts          # InstantDB schema definition
├── instant.perms.ts           # InstantDB permissions
├── package.json
├── package-lock.json
└── skills-lock.json
```

---

## `src/` — Source Code

### `src/app/` — Next.js App Router

```
src/app/
├── layout.tsx                 # Root layout: ClerkProvider + all providers
├── globals.css                # Tailwind directives + CSS custom properties
├── favicon.ico
│
├── (main)/                   # Route group: authenticated shell
│   ├── layout.tsx             # MainLayout wrapper (TopBar + BottomNav)
│   ├── loading.tsx            # Loading skeleton for (main) routes
│   ├── page.tsx               # Dashboard (/)
│   ├── contracts/
│   │   └── page.tsx           # Contract list (/contracts)
│   ├── history/
│   │   └── page.tsx           # Session list (/history)
│   ├── profile/
│   │   ├── page.tsx           # Profile (/profile)
│   │   └── essential-information/
│   │       └── page.tsx       # Onboarding form (/profile/essential-information)
│   └── user-management/
│       ├── page.tsx           # User list (/user-management)
│       └── [uid]/
│           └── page.tsx       # User edit (/user-management/:uid)
│
├── sign-in/                  # Clerk-hosted sign-in
│   └── [[...sign-in]]/
│       └── page.tsx
│
├── offline/                  # PWA offline fallback
│   └── page.tsx
│
├── api/                      # API route handlers
│   ├── contract/
│   │   ├── create/route.ts
│   │   ├── update/route.ts
│   │   ├── delete/route.ts
│   │   ├── updateStatus/route.ts
│   │   └── getAll/route.ts
│   ├── history/
│   │   ├── create/route.ts
│   │   ├── update/route.ts
│   │   ├── delete/route.ts
│   │   ├── updateStatus/route.ts
│   │   ├── updateNote/route.ts
│   │   ├── getAll/route.ts
│   │   ├── getByContract/route.ts
│   │   └── getOccupiedTimeSlots/route.ts
│   ├── user/
│   │   ├── getUserInformation/route.ts
│   │   ├── getAll/route.ts
│   │   ├── getByRole/route.ts
│   │   ├── updateBasicInfo/route.ts
│   │   ├── updateEssentialInformation/route.ts
│   │   ├── updateRole/route.ts
│   │   ├── checkUserSetting/route.ts
│   │   └── createUserSetting/route.ts
│   ├── realtime/
│   │   └── token/route.ts     # Ably TokenRequest endpoint
│   └── admin/
│       └── backfillTimestamps/route.ts
│
└── type/
    └── api/
        └── index.ts           # Shared TypeScript types for all API req/res
```

#### Naming Conventions — API Routes
- **Directory** = plural entity name (e.g., `contract/`, `history/`, `user/`)
- **File** = action verb (e.g., `create/route.ts`, `getAll/route.ts`, `updateStatus/route.ts`)
- **HTTP method** = `GET` for queries, `POST` for mutations

---

### `src/components/`

```
src/components/
├── InstantAuthDB.tsx          # Clerk → InstantDB auth bridge (signInWithIdToken)
├── PWAInstaller.tsx           # PWA install prompt component
├── PullToRefresh.tsx          # Touch-pull refresh with visual indicator
│
├── ui/                        # shadcn/ui base components
│   ├── alert-dialog.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── calendar.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── input-group.tsx
│   ├── input-otp.tsx
│   ├── label.tsx
│   ├── popover.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   ├── sonner.tsx             # Toast notifications
│   ├── tabs.tsx
│   ├── textarea.tsx
│   └── tooltip.tsx
│
├── layout/                    # Shell components
│   ├── MainLayout.tsx          # Full page shell (TopBar + main + BottomNav + PullToRefresh)
│   ├── TopBar.tsx              # Header: avatar, role badge, refresh button
│   └── BottomNavigation.tsx     # Bottom tab bar (4 tabs)
│
├── cards/                     # List item cards
│   ├── ContractCard.tsx        # Contract display in list
│   └── SessionCard.tsx         # Session display in list
│
├── modals/                    # Modal dialogs
│   ├── CreateContractModal.tsx
│   ├── CreateSessionModal.tsx
│   ├── SessionHistoryModal.tsx
│   └── OnboardingModal.tsx     # First-time user setup modal
│
└── common/                    # Shared UI primitives
    ├── TimeSlotPicker.tsx     # Visual time-slot grid (occupied slots)
    ├── UserSearchSelect.tsx   # Searchable user dropdown for forms
    └── StatusBadge.tsx         # Status pill component
```

#### Naming Conventions — Components
- **Page components**: PascalCase, descriptive (e.g., `SessionCard.tsx`, `CreateContractModal.tsx`)
- **UI primitives**: match shadcn naming (`button.tsx`, `dialog.tsx`)
- **Layout components**: PascalCase with `Layout` suffix (`MainLayout.tsx`, `BottomNavigation.tsx`)

---

### `src/hooks/` — TanStack Query Hooks

```
src/hooks/
├── useContracts.ts             # useContracts, useInfiniteContracts, useCreateContract,
│                               # useUpdateContract, useDeleteContract, useUpdateContractStatus
├── useHistory.ts              # useInfiniteHistory, useCreateHistory, useUpdateHistory,
│                               # useDeleteHistory, useUpdateHistoryStatus, useUpdateHistoryNote,
│                               # useTrainerSchedule, useContractHistory
├── useUser.ts                 # useUpdateUserBasicInfo, useUpdateEssentialInformation
├── useUsers.ts                # useUsers (all users, with pagination/filtering)
└── useUserOnboarding.ts       # useCheckUserSetting, useCreateUserSetting
```

#### Naming Conventions — Hooks
- **File**: entity plural noun (`useContracts.ts`, `useHistory.ts`)
- **Exports**: `use` + EntityAction (noun/verb) — `useInfiniteContracts`, `useCreateHistory`
- **Query key factory**: `entityKeys` object — `contractKeys`, `historyKeys`, `userKeys`

---

### `src/lib/` — Server-Side Utilities

```
src/lib/
├── db.ts                      # instantClient (browser/client InstantDB)
├── dbServer.ts                # instantServer (server-only InstantDB admin)
├── utils.ts                   # cn() utility (clsx + tailwind-merge)
├── roleCheck.ts               # isAdmin(), isStaffOrAdmin() helpers
├── essentialInformation.ts    # Onboarding form schema/constants
├── proxy.ts                   # (not examined)
│
└── realtime/
    ├── ablyServer.ts          # publishRealtimeEvent(), createScopedTokenRequest()
    └── channel.ts             # getUserRealtimeChannel() — "realtime:[userId]"
```

#### Naming Conventions — lib
- `db.ts` / `dbServer.ts` — database client singletons
- `*Utils.ts` — pure utility functions (`utils.ts`, `statusUtils.ts`, `timeUtils.ts`, `currencyUtils.ts`)
- `*Server.ts` — server-only code (`dbServer.ts`, `ablyServer.ts`)
- `*Channel.ts` — Ably channel helpers

---

### `src/utils/` — Pure Utility Functions

```
src/utils/
├── statusUtils.ts             # Contract & history status helpers, badge variants,
│                               # action button logic, permission checks
├── timeUtils.ts                # Date/time formatting and conversions
├── currencyUtils.ts            # Money formatting (VND)
└── clearCache.ts               # (service worker cache invalidation)
```

---

### `src/providers/` — React Context Providers

```
src/providers/
├── QueryClientProvider.tsx     # TanStack QueryClient setup with devtools
└── RealtimeProvider.tsx        # Ably client setup + channel subscription
                                 # → invalidates contractKeys + historyKeys on events
```

---

### `src/theme/` — Design System

```
src/theme/
└── colors.ts                  # Padlet color palette (primary, secondary, accent, warning)
                                # with 50–900 shade scales
```

---

### `src/app/type/api/`

```
src/app/type/api/
└── index.ts                   # All TypeScript types for API requests/responses,
                                # entity types (Contract, History, User, UserSetting),
                                # filter types, pagination metadata, status enums
```

---

## `public/` — Static Assets

```
public/
├── sw.js                      # Service worker (PWA offline + caching)
├── manifest.json              # Web App Manifest
├── icons/                    # PWA icons (multiple sizes)
│   ├── icon-192x192.png
│   └── ...
└── (other static assets)
```

---

## Key Files at a Glance

| Concern | File(s) |
|---------|---------|
| **Entry / Root** | `src/app/layout.tsx` |
| **Auth** | `src/components/InstantAuthDB.tsx` |
| **Database** | `src/lib/db.ts`, `src/lib/dbServer.ts`, `instant.schema.ts` |
| **API routes** | `src/app/api/*/route.ts` |
| **Query hooks** | `src/hooks/useContracts.ts`, `src/hooks/useHistory.ts` |
| **Realtime** | `src/lib/realtime/ablyServer.ts`, `src/providers/RealtimeProvider.tsx` |
| **UI components** | `src/components/ui/*` |
| **Domain components** | `src/components/modals/*`, `src/components/cards/*` |
| **Layout shell** | `src/components/layout/MainLayout.tsx`, `TopBar.tsx`, `BottomNavigation.tsx` |
| **Status/permissions** | `src/utils/statusUtils.ts`, `src/lib/roleCheck.ts` |
| **Design tokens** | `src/theme/colors.ts` |
| **PWA** | `public/sw.js`, `public/manifest.json` |
| **Types** | `src/app/type/api/index.ts` |
| **API types** | `src/app/type/api/index.ts` |

---

## Naming Conventions Summary

| Category | Convention | Example |
|----------|-----------|---------|
| **API route files** | `action/route.ts` | `create/route.ts`, `getAll/route.ts` |
| **Query hooks** | `useVerb[Noun]?` + query key factory | `useCreateContract`, `contractKeys` |
| **Component files** | PascalCase | `SessionCard.tsx`, `CreateContractModal.tsx` |
| **UI primitives** | shadcn naming | `button.tsx`, `dialog.tsx` |
| **Utility files** | `*Utils.ts` | `statusUtils.ts`, `timeUtils.ts` |
| **Server-only lib** | `*Server.ts` | `dbServer.ts`, `ablyServer.ts` |
| **Type file** | `type/api/index.ts` | all API types in one place |
| **Query key factory** | `entityKeys` | `contractKeys`, `historyKeys`, `userKeys` |
| **Color tokens** | `--color-*` CSS vars | `--color-cta`, `--color-success` |
