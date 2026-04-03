# Code Conventions

> **Source of truth:** This document reflects the conventions actively practiced in the codebase.
> All new contributions should follow these patterns. Deviations require a PR discussion.

---

## Table of Contents

1. [Language & Tooling](#1-language--tooling)
2. [Project Structure](#2-project-structure)
3. [TypeScript](#3-typescript)
4. [Naming Conventions](#4-naming-conventions)
5. [React Components](#5-react-components)
6. [Server-Side API Routes](#6-server-side-api-routes)
7. [Hooks (React Query)](#7-hooks-react-query)
8. [State Management](#8-state-management)
9. [Error Handling](#9-error-handling)
10. [Styling & UI](#10-styling--ui)
11. [Utility Functions](#11-utility-functions)
12. [Real-time & Database](#12-real-time--database)
13. [Authentication](#13-authentication)
14. [Accessibility](#14-accessibility)
15. [Formatting & Linting](#15-formatting--linting)

---

## 1. Language & Tooling

| Concern | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Framework | Next.js (App Router) |
| Rendering | Client Components by default; Server Components only where needed |
| Styling | Tailwind CSS + CSS custom properties (Padlet palette) |
| State / Server sync | TanStack Query (React Query) v5 |
| Auth | Clerk (`@clerk/nextjs`) |
| Database | InstantDB (server client via `@instantdb/admin`) |
| Realtime | Ably (`ably`) |
| Toast notifications | `sonner` |
| Icons | `lucide-react` |
| UI component primitives | shadcn/ui (localised in `src/components/ui/`) |

---

## 2. Project Structure

```
src/
├── app/                      # Next.js App Router pages + API routes
│   ├── (main)/               # Authenticated layout group
│   │   ├── contracts/
│   │   ├── history/
│   │   ├── profile/
│   │   └── user-management/
│   ├── api/                  # Route handlers (one file per endpoint)
│   │   ├── contract/
│   │   ├── history/
│   │   ├── realtime/
│   │   └── user/
│   └── type/api/index.ts     # All shared API request/response types
├── components/
│   ├── ui/                   # shadcn/ui primitives (do not modify)
│   ├── layout/               # TopBar, BottomNavigation, MainLayout
│   ├── cards/                # ContractCard, SessionCard
│   ├── modals/               # CreateSessionModal, SessionHistoryModal, etc.
│   └── common/               # Reusable non-primitive components
├── hooks/                    # React Query wrappers (useXxx naming)
├── lib/                      # Server-side utilities
│   ├── dbServer.ts           # InstantDB server client (singleton)
│   ├── realtime/             # Ably server utilities
│   ├── roleCheck.ts          # Role-based access helpers
│   └── utils.ts              # cn() helper (clsx + tailwind-merge)
├── providers/                # Context providers (RealtimeProvider, QueryClientProvider)
├── theme/colors.ts           # Design system colour tokens
└── utils/                    # Pure utility functions (time, currency, status)
```

### Directory rules

- **`src/app/api/`** — one file per HTTP verb per logical resource (e.g. `route.ts` inside `create/`, `getAll/`)
- **`src/hooks/`** — every hook is a React Query hook; no `useState`/`useReducer` wrappers here
- **`src/utils/`** — pure, side-effect-free functions; no React dependencies
- **`src/lib/`** — server-side only utilities; never imported in Client Components

---

## 3. TypeScript

- **`strict: true`** is always on (from `tsconfig.json`)
- All API request/response types live in **`src/app/type/api/index.ts`**
- Discriminated union types are used for success/error responses:

  ```typescript
  // Success or error — caller checks 'error' in response
  export type CreateHistoryResponse = CreateHistorySuccessResponse | ApiErrorResponse

  export interface ApiErrorResponse {
    error: string
  }
  ```

- Prefer **`type`** over **`interface`** for API shapes
- Prefer **`unknown`** for unchecked external data, narrowing before use
- Helper guard functions for status enums:

  ```typescript
  function isCreditUsedHistoryStatus(status: unknown): boolean {
    return status === 'NEWLY_CREATED' || status === 'CHECKED_IN'
  }
  ```

---

## 4. Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Files (React/TSX) | `PascalCase.tsx` | `ContractCard.tsx` |
| Files (plain TS) | `camelCase.ts` | `timeUtils.ts`, `roleCheck.ts` |
| Type / Interface | `PascalCase` | `CreateHistoryRequest` |
| Hooks | `camelCase` prefixed `use` | `useCreateHistory`, `useInfiniteContracts` |
| Query key factory | `camelCase` with `Keys` suffix | `historyKeys`, `contractKeys` |
| Query key methods | `all`, `lists()`, `list()`, `details()`, `detail()` | `historyKeys.lists()` |
| Functions (utilities) | `camelCase` | `minutesToTime`, `checkSlotOverlap` |
| React Component exports | `PascalCase` default export | `export default function ContractCard` |
| CSS custom properties | `kebab-case` | `--color-cta`, `--color-success-bg` |
| Enum-like string literals | `SCREAMING_SNAKE_CASE` (UPPER_SNAKE) | `'NEWLY_CREATED'`, `'ADMIN'` |
| Local state variables | `camelCase` | `contractId`, `isLoadingSchedule` |
| Event handlers | `handleXxx` | `handleSubmit`, `handleSlotSelect` |
| File-scoped constants | `UPPER_SNAKE_CASE` | `LEGACY_DEFAULT_DURATION` |

### File header comment

Every route file should start with a commented path reference:

```typescript
// src/app/api/history/create/route.ts
import { auth } from '@clerk/nextjs/server'
// ...
```

---

## 5. React Components

### Client Components

All interactive UI components must be marked `'use client'`:

```typescript
'use client'

import { useState } from 'react'
```

### Component patterns

**Props interface — inline (no separate file):**

```typescript
interface CreateSessionModalProps {
  open: boolean
  onClose: () => void
  preselectedContractId?: string
}
```

**State co-location:** keep state as close as possible to where it's used; lift only when needed.

**Derived values — `useMemo`:**

```typescript
const activeContracts = useMemo(() => {
  if (!contractsData) return []
  return contractsData.pages.flatMap(page => 'contracts' in page ? page.contracts : [])
}, [contractsData])
```

**Error state as a plain object:**

```typescript
const [errors, setErrors] = useState<Record<string, string>>({})

const validate = () => {
  const e: Record<string, string> = {}
  if (!effectiveContractId) e.contractId = 'Please select a contract'
  // ...
  setErrors(e)
  return Object.keys(e).length === 0
}
```

**Form submission pattern:**

```typescript
const handleSubmit = async () => {
  if (!validate()) return
  try {
    await createHistory.mutateAsync({ contract_id, date, from, to })
    toast.success('Session created successfully')
    resetForm()
    onClose()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to create session')
  }
}
```

### Modal components

- Accept `open: boolean` and `onClose: () => void` props
- Use `onOpenChange={(v) => !v && handleCancel()}` on the Dialog wrapper
- Always implement a `resetForm` helper
- Always have a `handleCancel` that resets + closes

---

## 6. Server-Side API Routes

### Required route scaffolding

Every route handler **must** include:

```typescript
// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

### Authorization pattern

```typescript
const { userId } = await auth()
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Input validation — explicit type + existence checks

```typescript
// Required fields
if (!contract_id || date === undefined || from === undefined || to === undefined) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
}

// Field types
if (typeof contract_id !== 'string') {
  return NextResponse.json({ error: 'Invalid field: contract_id must be a string' }, { status: 400 })
}
```

### Error response pattern

```typescript
} catch (error) {
  console.error('Error creating history:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Success response pattern

```typescript
return NextResponse.json({ history: createdHistory }, { status: 201 })
```

### Realtime event pattern (fire-and-forget)

```typescript
await publishRealtimeEventSafely({
  eventName: 'history.changed',
  userIds: [userInstantId, contract.purchased_by, teachBy],
  payload: { entity_id, action: 'create', triggered_by: userInstantId, timestamp: Date.now() }
})
```

Use `publishRealtimeEventSafely` (never `publishRealtimeEvent` directly) in route handlers — it swallows errors so they don't affect the HTTP response.

---

## 7. Hooks (React Query)

### File structure (`src/hooks/useXxx.ts`)

```typescript
// 1. Query Keys
export const historyKeys = {
    all: ['history'] as const,
    lists: () => [...historyKeys.all, 'list'] as const,
    list: (filters?: HistoryFilters) => [...historyKeys.lists(), filters] as const,
    details: () => [...historyKeys.all, 'detail'] as const,
    detail: (id: string) => [...historyKeys.details(), id] as const
}

// 2. API functions (async, outside the hook)
async function fetchHistory(...) { ... }
async function createHistory(...) { ... }

// 3. Query hooks
export function useInfiniteHistory(limit = 10, filters?: HistoryFilters) {
    return useInfiniteQuery({
        queryKey: [...historyKeys.lists(), 'infinite', { limit, filters }],
        queryFn: ({ pageParam = 1 }) => fetchHistory(pageParam, limit, filters),
        getNextPageParam: (lastPage) => {
            if ('pagination' in lastPage && lastPage.pagination.hasMore) {
                return lastPage.pagination.page + 1
            }
            return undefined
        },
        initialPageParam: 1
    })
}

// 4. Mutation hooks
export function useCreateHistory() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createHistory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
        }
    })
}
```

### Query invalidation patterns

- After **create**: invalidate list queries
- After **status update**: invalidate list + contracts (with 2 s delay for server propagation)
- After **delete**: invalidate list queries

### Error handling in mutations

```typescript
mutate(data, {
  onSuccess: () => { ... },
  onError: (error) => {
    toast.error(error.message || 'Failed to update contract status')
  }
})
```

### Fetch wrapper pattern

```typescript
const response = await fetch('/api/history/getAll')
if (!response.ok) {
    throw new Error('Failed to fetch history')
}
return response.json()
```

---

## 8. State Management

| Concern | Solution |
|---|---|
| Server state / async data | TanStack Query (`useQuery`, `useInfiniteQuery`, `useMutation`) |
| Local UI state (open/close, form fields) | `useState` co-located in component |
| Derived/computed values | `useMemo` |
| Cross-component shared UI state | React Context (see `src/providers/`) |
| URL / navigation state | Next.js Router |

**No Redux, Zustand, or Jotai** in this codebase.

---

## 9. Error Handling

### Client-side

```typescript
// Prefer error instanceof Error
toast.error(error instanceof Error ? error.message : 'Fallback message')
```

### Server-side (route handlers)

```typescript
} catch (error) {
  console.error('[route] Error creating history:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Realtime

```typescript
// Always use the safe wrapper in route handlers
await publishRealtimeEventSafely({ ... })
```

### Input validation

- Check existence first (`!value`)
- Then check type (`typeof value !== 'string'`)
- Then check semantics / business rules (time range, credit availability, etc.)
- Return progressively more specific error messages from outermost to innermost check

---

## 10. Styling & UI

### Design system tokens

All colours reference **CSS custom properties** defined in the global stylesheet. Never use raw Tailwind palette values in component classes.

| Token prefix | Purpose |
|---|---|
| `--color-cta` | Primary action / brand coral |
| `--color-cta-hover` | CTA hover state |
| `--color-success` / `--color-success-bg` | Success / completed |
| `--color-warning` / `--color-warning-bg` | Pending / in-progress |
| `--color-pt` / `--color-pt-bg` | Personal Training kind |
| `--color-rehab` / `--color-rehab-bg` | Rehabilitation kind |
| `--color-pt-monthly` / `--color-pt-monthly-bg` | PT Monthly kind |
| `--color-info-bg` | Info background |

### Color mapping for status badges

| Status category | Token |
|---|---|
| Active / Completed | `--color-success` (teal green) |
| Pending / Review / Paid / Confirmed | `--color-warning` (warm orange) |
| Canceled | Semantic red (`bg-red-50 text-red-700`) |

> **Migration note:** Status badge colours must use CSS custom property tokens.
> Do **not** use raw Tailwind classes like `bg-blue-50`, `bg-zinc-100`.

### Class composition

Use `cn()` (from `src/lib/utils.ts`) for all conditional class merging:

```typescript
import { cn } from '@/lib/utils'

<Button className={cn(
  'h-12 text-sm font-semibold',
  isPrimary && 'bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]'
)} />
```

### Responsive design

- Mobile-first Tailwind classes
- Use `sm:`, `md:`, `lg:` breakpoints
- `max-w-screen-xl mx-auto` for content width constraint

---

## 11. Utility Functions

### Location

- Pure time/date logic → `src/utils/timeUtils.ts`
- Currency formatting → `src/utils/currencyUtils.ts`
- Status display logic → `src/utils/statusUtils.ts`
- Shared class merging → `src/lib/utils.ts` (`cn()`)

### Characteristics

- **No React imports** in `src/utils/` files
- **No side effects** (no network calls, no localStorage, no Date.now())
- Always have JSDoc comments with `@example` for non-trivial functions

### Pattern: JSDoc with `@param` and `@returns`

```typescript
/**
 * Convert minutes from midnight to HH:mm format
 * @param minutes - Number of minutes from midnight (0-1440)
 * @returns Time string in HH:mm format
 * @example minutesToTime(480) => "08:00"
 */
export function minutesToTime(minutes: number): string { ... }
```

---

## 12. Real-time & Database

### InstantDB server client

Single shared instance in `src/lib/dbServer.ts`. Initialised with `initServer()` from `@instantdb/admin`.

```typescript
export const instantServer = initServer({
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID,
  adminToken: process.env.INSTANTDB_ADMIN_TOKEN
})
```

### Transaction pattern

```typescript
await instantServer.transact([
  instantServer.tx.history[historyId].update({ ... }),
  instantServer.tx.history[historyId].link({ contract: contract_id }),
  instantServer.tx.history[historyId].link({ users: userInstantId })
])
```

### Query pattern

```typescript
const data = await instantServer.query({
  history: {
    $: { where: { teach_by: teachBy, date: date } }
  }
})
const history = data.history || []
```

### Realtime channel naming

```typescript
// src/lib/realtime/channel.ts
export function getUserRealtimeChannel(userId: string): string {
  return `user:${userId}`
}
```

---

## 13. Authentication

- All auth via **Clerk** (`@clerk/nextjs`)
- Server-side auth: `import { auth } from '@clerk/nextjs/server'`
- Client-side auth: `import { useAuth } from '@clerk/nextjs'`
- User ID: `const { userId } = await auth()`
- Always guard API routes; return `401` if `!userId`

---

## 14. Accessibility

- All interactive elements have accessible labels
- Error messages linked to inputs via `aria-describedby` (implicit via `errors.fieldName` rendering)
- Screen-reader error summaries: `<div aria-live="polite" className="sr-only">`
- Status badges use `role="status"` and `aria-label`
- Icon-only buttons always wrapped in `Tooltip` with descriptive content
- Focus management on modal open/close
- Colour is never the only differentiator — icons + text always accompany status colours

---

## 15. Formatting & Linting

| Tool | Config location | Notes |
|---|---|---|
| ESLint | `.eslintrc.mjs` (flat config) | Extends `next/core-web-vitals` |
| Prettier | `.prettierrc` | Configured alongside ESLint |
| EditorConfig | `.editorconfig` | 2-space indent, LF line endings |

### EditorConfig (`.editorconfig`)

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### Prettier (`.prettierrc`)

Single export format; 2-space indent; single quotes; printWidth 80.

### Import ordering (manual convention)

1. Node built-ins (`import { NextResponse } from 'next/server'`)
2. External packages (`import { auth } from '@clerk/nextjs/server'`)
3. Internal absolute imports (`@/lib/dbServer`)
4. Relative imports (`./utils`, `../components`)
5. Type imports last

> **Note:** The codebase does not currently enforce a strict import sort with a plugin. Manual grouping is the existing convention.

### Comments

- **File header** comment on every route file (path reference)
- **JSDoc** on all exported utility functions
- **`// Disable caching for this route`** before `export const dynamic`
- Inline `// sub-section` banners in large files (see `statusUtils.ts`)

---

## Summary

| Rule | Enforcement |
|---|---|
| `'use client'` on all interactive components | Manual |
| `dynamic = 'force-dynamic'` on all API routes | Manual |
| `cn()` for all class composition | Manual |
| CSS custom properties for colours | Manual |
| `publishRealtimeEventSafely` in route handlers | Manual |
| Query keys factory object per resource | Manual |
| `onSuccess` + `onError` on all mutations | Manual |
| JSDoc on exported utilities | Manual |
| TypeScript strict | ESLint / `tsconfig.json` |
| Prettier formatting | Editor / CI |
