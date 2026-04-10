# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**GoChul Fitness** — A gym/fitness studio management web application with two interfaces:

1. **Traditional web UI** (primary): Contract and session management for gym staff and customers.
2. **AI chatbot** (alternative interface): Conversational access to the same contract/session management via a floating action button + modal.

**Core Value:** Gym staff and customers manage contracts and training sessions with minimal friction — either through the web UI or natural conversation in English or Vietnamese.

**Roles:** ADMIN, STAFF, CUSTOMER — enforced at the API layer.

---

## Development

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier format
npm run format:check # Check formatting
```

**Requirements:** Node.js. Environment variables needed (see `.env.local`): Clerk keys, InstantDB app ID + admin token, Ably API key, Claude API key + base URL.

---

## What This App Does

### Booking & Contract Management (web UI)
- **Contracts**: STAFF/ADMIN create contracts (PT, REHAB, PT_MONTHLY) with session credits and duration. Customers review, confirm, pay, and activate them.
- **Sessions (History)**: Book training sessions against active contracts. Dual check-in — both customer and trainer must confirm attendance. Sessions track staff/customer notes.
- **User onboarding**: 34-question essential information questionnaire for new customers.
- **User management**: ADMIN-only user listing with role editing.

### AI Chatbot (conversational interface)
Floating action button opens a chat modal. Users chat in English or Vietnamese to create/view/cancel contracts and sessions — calling the same backend APIs as the web UI. Powered by Anthropic Claude via `@anthropic-ai/sdk` with tool-use pattern.

---

## Architecture

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router, React 19 |
| Styling | Tailwind CSS v4, shadcn/ui, `@base-ui/react` |
| Server state | TanStack Query v5 |
| UI state | Zustand |
| Auth | Clerk (`@clerk/nextjs`, `viVN` localization) |
| Database | InstantDB (server: `@instantdb/admin`, client: `@instantdb/react`) |
| Realtime | Ably pub/sub (contract/history mutations) |
| AI | `@anthropic-ai/sdk` via custom router (`CLAUDE_BASE_URL`) |
| Notifications | `sonner` toasts + Ably events |
| PWA | Service worker + manifest + `/offline` fallback |

### Data Model (InstantDB)

| Entity | Key fields |
|--------|-----------|
| `$users` | `email` |
| `user_setting` | `role` (CUSTOMER/STAFF/ADMIN), `clerk_id`, `first_name`, `last_name`, `essential_information` (JSON), `essential_ready` |
| `contract` | `kind` (PT/REHAB/PT_MONTHLY), `credits`, `duration_per_session` (min 15, max 180, divisible by 15), `status`, `money`, `sale_by`, `purchased_by`, `start_date`, `end_date` |
| `history` | `date`, `from`, `to` (minute offsets from midnight), `status`, `teach_by`, `staff_note`, `customer_note`, dual check-in timestamps |

**Time model:** `from`/`to` are integer minute offsets (e.g. 480 = 08:00). Session duration must equal `contract.duration_per_session`. Legacy contracts without `duration_per_session` default to 90 minutes.

**Links:** `$users ↔ user_setting` (1:1), `$users ↔ contract` via `purchased_by`/`sale_by`, `contract ↔ history` (1:N), `history ↔ $users` (teach_by).

### State Machines

**Contract lifecycle:** `NEWLY_CREATED → CUSTOMER_REVIEW → CUSTOMER_CONFIRMED → CUSTOMER_PAID → PT_CONFIRMED → ACTIVE → EXPIRED`. Side branches to `CANCELED`. All transitions are role-gated (ADMIN can force any transition; STAFF and CUSTOMER have limited permissions).

**Session lifecycle:** `NEWLY_CREATED → CHECKED_IN`. Side branches to `CANCELED`/`EXPIRED`. Dual check-in: customer sets `user_check_in_time`, trainer sets `staff_check_in_time` — status becomes `CHECKED_IN` only when both are present. Each side can check in only once (idempotent).

### Request Flow

```
Clerk (signed-in)
  → API route (src/app/api/**)
    → auth() → Clerk JWT
    → user_setting lookup → role
    → RBAC check
    → InstantDB transaction/query (instantServer)
    → Ably publish (production only)
  → React Query (client)
  → RealtimeProvider invalidates cache on event
  → UI updates
```

### AI Chatbot Flow

```
Client → AIChatbotModal (Zustand store)
  → POST /api/ai-chatbot/route.ts
    → auth() + role
    → client.messages.create() with system prompt + tools + history
    → Tool call? → call internal API as the user → format result → append to conversation
    → Return text to client
  → Conversation history in Zustand store
```

Tools are defined as JSON schema (`toolDefinitions.ts`) and passed to the Anthropic API. The AI decides which tool to call. No streaming.

---

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── contract/           create, getAll, update, updateStatus, delete
│   │   ├── history/            create, getAll, update, updateStatus,
│   │   │                      delete, updateNote, getByContract,
│   │   │                      getOccupiedTimeSlots
│   │   ├── user/               getUserInformation, checkUserSetting,
│   │   │                      createUserSetting, getByRole, getAll,
│   │   │                      updateBasicInfo, updateEssentialInformation,
│   │   │                      updateRole
│   │   ├── ai-chatbot/         Message handler (POST) + user search (GET)
│   │   ├── admin/              backfillTimestamps
│   │   └── realtime/token/     Ably token
│   ├── (main)/                 Authenticated shell
│   │   ├── page.tsx            Dashboard
│   │   ├── contracts/          Contract list + create modal
│   │   ├── history/            Session list + create modal
│   │   ├── profile/            Profile + essential-info form
│   │   └── user-management/   Admin user listing
│   ├── sign-in/               Clerk hosted
│   ├── offline/               PWA fallback
│   ├── layout.tsx             Root layout (providers, PWA meta)
│   └── type/api/              All TypeScript types
├── components/
│   ├── layout/                MainLayout, TopBar, BottomNavigation
│   ├── cards/                 ContractCard, SessionCard
│   ├── common/                StatusBadge, TimeSlotPicker, UserSearchSelect
│   ├── modals/                CreateContractModal, CreateSessionModal,
│   │                          SessionHistoryModal, OnboardingModal
│   ├── chatbot/               AIChatbotModal, MessageBubble, MessageList,
│   │                          MessageInput, LoadingIndicator, SelectionBubble
│   └── ui/                    shadcn/ui primitives
├── hooks/                     All TanStack Query hooks (useContracts,
│                               useHistory, useUser, useUserOnboarding,
│                               useUsers)
├── utils/                     Pure functions: timeUtils, currencyUtils,
│                               statusUtils, clearCache
├── lib/                       Server-only: db, dbServer, roleCheck,
│                               ratelimit, essentialInformation, utils,
│                               ai/, realtime/
├── providers/                 QueryClientProvider, RealtimeProvider
├── store/                     useAIChatbotStore (Zustand)
└── theme/                     colors.ts (canonical design tokens)
```

---

## Key Conventions

- **API routes**: one file per HTTP verb per resource — `route.ts` inside verb subfolder. All `export const dynamic = 'force-dynamic'`.
- **Hooks**: every hook is a TanStack Query hook. No `useState`/`useReducer` wrappers. Query key factory per resource (`contractKeys`, `historyKeys`, `userKeys`, `userOnboardingKeys`).
- **Utils**: pure functions, no React imports, no side effects. Time logic → `timeUtils.ts`, currency → `currencyUtils.ts`, status/buttons → `statusUtils.ts`.
- **Lib**: server-side only. Never imported in Client Components.
- **Realtime**: production-only (`NODE_ENV === 'production'`). Ably channels are `user:{instantUserId}`.
- **Auth**: Clerk auth in all routes via `auth()`. Always return `401` if `!userId`.

---

## Design System

Canonical color source: `src/theme/colors.ts`. Do not use ad-hoc hex values.

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #F26076 | CTA, brand |
| secondary | #FF9760 | Warm accents |
| accent | #458B73 | Success, active |
| warning | #FFD150 | Pending states |

CSS custom properties (`--color-cta`, `--color-success`, etc.) used throughout the UI. Never hardcode hex values in components.

---

## Maintenance Rulebook

The **source of truth** for runtime behavior is `.cursor/rules/gochul-fitness-rules.mdc`. This file is auto-applied to all `src/**` operations via the Cursor rules glob (`alwaysApply: true`).

When changing any page, API, status, role, data field, or design token, update ALL of the following **in the same PR**:

1. `.cursor/rules/gochul-fitness-rules.mdc` — runtime behavior
2. `src/app/type/api/index.ts` — TypeScript types
3. Affected route handlers in `src/app/api/**`
4. Affected hooks in `src/hooks/**`
5. Affected UI in `src/app/(main)/**` and `src/components/**`
6. `src/theme/colors.ts` — design tokens

**Additional docs to keep in sync:**
- `docs/PROGRAM.md` — business logic, API contracts, RBAC tables, lifecycle diagrams
- `AGENTS.md` — codebase map, agent operational rules, component inventory

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_INSTANTDB_APP_ID` | InstantDB app ID |
| `INSTANTDB_ADMIN_TOKEN` | InstantDB admin token (server-only) |
| `ABLY_API_KEY` | Ably realtime (production) |
| `CLAUDE_API_KEY` | Anthropic API key |
| `CLAUDE_BASE_URL` | Custom AI router base URL |
| `MODEL_NAME` | AI model name |
| `MAX_HISTORY_MESSAGES` | Chat history limit (default: 40) |

---

## GSD Workflow

This project uses the Get Shit Done (GSD) workflow for planning and execution. Use GSD commands for new features, bug fixes, and significant changes so planning artifacts and git history stay in sync.

```bash
/gsd:quick    # Small fixes, doc updates, ad-hoc tasks
/gsd:debug    # Investigation and bug fixing
/gsd:execute-phase  # Planned phase work
/gsd:plan-phase [N] # Create detailed phase plan
```
