# External Integrations

## Authentication & Identity

### Clerk (`@clerk/nextjs`)
> **Purpose**: User authentication, session management, and identity provider
>
> **Version**: 6.37.1

- **Localization**: Vietnamese (`viVN`) via `@clerk/localizations`
- **Middleware**: `clerkMiddleware` protects all routes except `/sign-in(.*)` and `/sign-up(.*)`
  - Redirects unauthenticated users to `/sign-in`
  - Runs on all API routes (`/(api|trpc)(.*)`)
- **Client Hooks Used**: `useAuth()`, `useUser()`
- **Token**: `getToken()` is called to obtain a Clerk JWT, which is then exchanged with InstantDB to sign in
- **Sync with InstantDB**: `InstantDBAuthSync` component (`src/components/InstantAuthDB.tsx`) signs users into InstantDB using the Clerk ID token via `instantClient.auth.signInWithIdToken()`
- **Sign-in Page**: `/sign-in/[[...sign-in]]/page.tsx` (Clerk hosted or embedded)
- **User Info Available**: `id`, `emailAddresses`, `firstName`, `lastName`, `imageUrl`, `username`

**Environment Variables:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_CLIENT_NAME=clerk
```

---

## Database

### InstantDB (`@instantdb/react`, `@instantdb/admin`)
> **Purpose**: Reactive, serverless database for storing all application data
>
> **App ID**: `d8829bcb-dd1f-41ab-add7-c150c7cb2b7c`
> **Client Version**: 0.22.119 | **Admin Version**: 0.22.119

#### Schema Entities

| Entity | Description |
|---|---|
| `$users` | InstantDB built-in user entity (email indexed) |
| `contract` | Service contracts (PT, REHAB, PT_MONTHLY) with credits, money, dates |
| `history` | Training/rehab sessions — date, time slots, status, notes, check-in times |
| `user_setting` | Extended user profile — role (ADMIN/STAFF/CUSTOMER), clerk_id, essential_information |

#### Entity Relationships (Links)

| Link | Direction | Description |
|---|---|---|
| `historyContract` | 1 contract ↔ many history | Sessions belong to a contract |
| `historyUser` | many history ↔ 1 user | Sessions booked by a user |
| `userSettings` | 1 user_setting ↔ 1 user | Profile extension per user |
| `contractUser` | many contracts ↔ 1 user | Contracts belong to a user |
| `contractSaleBy` | many contracts ↔ 1 user | Trainer assigned to contract |
| `contractPurchasedBy` | many contracts ↔ 1 user | Customer who purchased contract |

#### Client Usage (`@instantdb/react`)
- Initialized in `src/lib/db.ts` as `instantClient`
- Used in components via InstantDB React hooks for reactive queries
- Devtools disabled in production (`devtool: false`)

#### Server Usage (`@instantdb/admin`)
- Initialized in `src/lib/dbServer.ts` as `instantServer` with `INSTANTDB_ADMIN_TOKEN`
- Used exclusively in Next.js API Route Handlers for:
  - Querying data
  - Running transactions (`instantServer.transact()`)
  - Creating entities with `id()` from `@instantdb/admin`
- Every API route uses `auth()` from Clerk to get `userId`, then queries `user_setting` where `clerk_id = userId` to determine the user's role and InstantDB identity

#### Permissions (`instant.perms.ts`)
All entities (`contract`, `history`, `user_setting`) have `view: true` for everyone, but `create`, `update`, and `delete` are restricted server-side in route handlers via role checks.

**Environment Variables:**
```
NEXT_PUBLIC_INSTANTDB_APP_ID=d8829bcb-dd1f-41ab-add7-c150c7cb2b7c
INSTANTDB_ADMIN_TOKEN=7b7f3120-925c-4496-bb7a-e7a21cbdb8cb
```

---

## Realtime Messaging

### Ably (`ably`)
> **Purpose**: Realtime pub/sub for live updates when contracts or sessions change
>
> **Version**: 2.13.0

#### Architecture

- **Server-side publish**: API route handlers call `publishRealtimeEventSafely()` after mutations to publish events to relevant users' channels
- **Client-side subscribe**: `RealtimeProvider` (`src/providers/RealtimeProvider.tsx`) subscribes to the user's personal channel
- **Scoped Tokens**: Client authenticates via `GET /api/realtime/token` which returns a scoped Ably token request (subscribe-only on `user:{instantUserId}` channel)
- **Production Only**: `isRealtimeEnabled()` returns `true` only when `NODE_ENV === 'production'`; disabled in development

#### Channel Naming
```
user:{instantUserId}   // e.g., user:abc123
```

#### Event Types

| Event | Payload | Triggered By |
|---|---|---|
| `contract.changed` | `{ entity_id, action, triggered_by, timestamp }` | Contract create/update/delete |
| `history.changed` | `{ entity_id, action, triggered_by, timestamp }` | Session create/update/delete/status change |

#### Client Behavior
When `contract.changed` or `history.changed` is received, the `RealtimeProvider` calls `queryClient.invalidateQueries()` for both `contractKeys.lists()` and `historyKeys.lists()`, causing React Query to refetch and React to re-render with fresh data.

**Environment Variables:**
```
ABLY_API_KEY=3TXctQ.01r_uQ:z_doC4uhko-CEVbHwULc4tO5eXow7eYlqQZmhDDEX5Y
```

---

## AI / LLM Integration

### Anthropic Claude (via custom proxy router)
> **Purpose**: AI-powered features (inferred from env vars; concrete usage not yet visible in current codebase scope)

**Environment Variables:**
```
CLAUDE_API_KEY=sk-...redacted...
CLAUDE_BASE_URL=http://pro-x.io.vn
MODEL_NAME=claude-opus-4-6
MAX_HISTORY_MESSAGES=40
```

- Uses a custom proxy router (`pro-x.io.vn`) rather than calling Anthropic's API directly
- Model: `claude-opus-4-6` (Claude Opus 4.6)
- Max conversation history: 40 messages

---

## MCP (Model Context Protocol) Servers

Configured in `.mcp.json` for AI tooling integration:

| Server | URL | Purpose |
|---|---|---|
| `instant` | `https://mcp.instantdb.com/mcp` | Direct InstantDB access for AI assistants |
| `clerk` | `https://mcp.clerk.com/mcp` | Direct Clerk access for AI assistants |

---

## UI Component Libraries

| Library | Purpose |
|---|---|
| **shadcn/ui** (`@base-ui/react`, `cmdk`, `react-day-picker`, `input-otp`) | Headless, accessible UI components |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications (positioned top-center, rich colors, close button) |

---

## PWA & Mobile

| Integration | Detail |
|---|---|
| **Web Manifest** | Served from `/manifest.json` |
| **Apple Web App** | Configured for "GoChul Fitness" standalone mode |
| **Offline Page** | Custom `/offline` fallback page |
| **Viewport Lock** | `userScalable: false`, `maximumScale: 1` |
| **Image Optimization** | Next.js Image with `remotePatterns: [{ protocol: 'https', hostname: '**' }]` |

---

## API Route Summary

All API routes are Next.js Route Handlers under `src/app/api/`. Every route:
1. Calls `auth()` from Clerk to get the authenticated `userId`
2. Queries InstantDB via `instantServer` to get the user's `role` and `instantUserId`
3. Performs role-based authorization before allowing mutations

| Group | Routes | Auth Level |
|---|---|---|
| **Contract** | `create`, `delete`, `update`, `updateStatus`, `getAll` | STAFF/ADMIN for mutations |
| **History** | `create`, `delete`, `update`, `updateNote`, `updateStatus`, `getAll`, `getByContract`, `getOccupiedTimeSlots` | CUSTOMER limited to own contracts; STAFF/ADMIN unrestricted |
| **User** | `getAll`, `getByRole`, `getUserInformation`, `updateBasicInfo`, `updateEssentialInformation`, `updateRole`, `checkUserSetting`, `createUserSetting` | Role-specific |
| **Realtime** | `GET /api/realtime/token` | Authenticated users get scoped Ably token |
| **Admin** | `POST /api/admin/backfillTimestamps` | Admin only |
