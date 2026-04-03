<!-- GSD:project-start source:PROJECT.md -->
## Project

**GoChul Fitness AI Chatbot**

An AI chatbot integrated into the GoChul Fitness web app via a floating action button + modal overlay. Users (CUSTOMER, STAFF, ADMIN) chat with the bot in **English or Vietnamese** to manage their gym contracts and training sessions — creating, updating, listing, and canceling contracts and sessions — without touching the app's UI. The bot calls the same GoChul Fitness API endpoints the frontend uses, respecting the user's role permissions.

**Core Value:** Users can manage their gym contracts and training sessions through natural conversation in English or Vietnamese, with zero manual UI navigation.

### Constraints

- **Tech stack**: Next.js 16 App Router, TypeScript, `@anthropic-ai/sdk`, existing InstantDB/Clerk/Ably stack
- **Auth**: Chatbot must use the current Clerk session token (server-side) — role permissions enforced by API layer
- **API limits**: Must not exceed rate limits; API calls are synchronous per message (no streaming required)
- **Language**: Must support both English and Vietnamese prompts
- **Privacy**: Bot only operates within the authenticated user's permission scope
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages & Runtime
| | |
|---|---|
| **TypeScript** | Primary language throughout the codebase |
| **JavaScript** | Used for some generated/compiled outputs |
## Frontend Framework
| | |
|---|---|
| **Next.js 16.1.0** | React framework with App Router, React 19.2.3, `trailingSlash: true`, `reactStrictMode: true` |
| **React 19.2.3** | UI library |
## Styling & UI
| Package | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | 4.1.18 | Utility-first CSS framework |
| **@base-ui/react** | 1.2.0 | Headless UI component primitives |
| **shadcn** | 4.0.2 | Component library |
| **class-variance-authority** | 0.7.1 | Component variant management |
| **tailwind-merge** | 3.5.0 | Tailwind class merging utility |
| **tw-animate-css** | 1.4.0 | Tailwind animation utilities |
| **lucide-react** | 0.577.0 | Icon library |
## State & Data Fetching
| Package | Version | Purpose |
|---|---|---|
| **@tanstack/react-query** | 5.90.20 | Server state management, pagination, mutations |
| **@tanstack/react-query-devtools** | 5.91.3 | React Query debugging tools |
| **@instantdb/react** | 0.22.119 | Reactive database client (client-side) |
| **@instantdb/admin** | 0.22.119 | InstantDB admin SDK (server-side) |
## Authentication
| Package | Version | Purpose |
|---|---|---|
| **@clerk/nextjs** | 6.37.1 | Authentication & user management |
| **@clerk/localizations** | 3.35.3 | Vietnamese (`viVN`) localization |
## Realtime & Push
| Package | Version | Purpose |
|---|---|---|
| **ably** | 2.13.0 | Realtime pub/sub for live contract & session updates |
| **sonner** | 2.0.7 | Toast notifications |
## Forms & Input
| Package | Version | Purpose |
|---|---|---|
| **cmdk** | 1.1.1 | Command palette / combobox |
| **react-day-picker** | 9.14.0 | Date picker component |
| **input-otp** | 1.4.2 | OTP input component |
## Build & Tooling
| Package | Version | Purpose |
|---|---|---|
| **PostCSS** | 8.5.6 | CSS processing pipeline |
| **@tailwindcss/postcss** | 4.1.18 | Tailwind v4 PostCSS integration |
| **TypeScript** | 5 | Type safety |
| **ESLint** | 9 | Linting with `eslint-config-next` |
| **eslint-import-resolver-typescript** | 4.4.4 | TypeScript-aware import resolution |
| **eslint-plugin-import** | 2.32.0 | Import order linting |
| **Prettier** | 3.8.1 | Code formatting |
## Fonts
| | |
|---|---|
| **Inter** (Google Fonts) | Loaded via `next/font/google` with CSS variable `--font-sans` |
## PWA
- **Web App Manifest**: `/manifest.json` with `appleWebApp` support
- **Icons**: `/icons/icon-192x192.png`
- **Viewport**: locked to `device-width`, `initialScale: 1`, `maximumScale: 1`, `userScalable: false`
- **`/offline` page**: Custom offline fallback page
## Key Configuration Files
| File | Purpose |
|---|---|
| `next.config.ts` | Next.js config — trailing slash, image remote patterns, on-demand entries for dev |
| `tailwind.config.ts` | Tailwind content paths + empty theme extension |
| `eslint.config.mjs` | ESLint flat config — `import/no-unresolved` with TypeScript + node resolver |
| `.prettierrc` | Prettier — single quotes, no semicolons, 2-space tabs |
| `tsconfig.json` | Target ES2017, bundler module resolution, path alias `@/*` → `./src/*` |
| `postcss.config.mjs` | PostCSS pipeline configuration |
## Environment Variables
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_INSTANTDB_APP_ID` | InstantDB app ID |
| `NEXT_PUBLIC_CLERK_CLIENT_NAME` | Clerk client name for InstantDB sync (`clerk`) |
| `INSTANTDB_ADMIN_TOKEN` | InstantDB admin token |
| `ABLY_API_KEY` | Ably realtime API key |
| `CLAUDE_API_KEY` | Anthropic Claude API key (AI features) |
| `CLAUDE_BASE_URL` | Custom AI router base URL (`http://pro-x.io.vn`) |
| `MODEL_NAME` | AI model name (`claude-opus-4-6`) |
| `MAX_HISTORY_MESSAGES` | Max history messages for AI (`40`) |
## Directory Structure
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Table of Contents
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
## 2. Project Structure
### Directory rules
- **`src/app/api/`** — one file per HTTP verb per logical resource (e.g. `route.ts` inside `create/`, `getAll/`)
- **`src/hooks/`** — every hook is a React Query hook; no `useState`/`useReducer` wrappers here
- **`src/utils/`** — pure, side-effect-free functions; no React dependencies
- **`src/lib/`** — server-side only utilities; never imported in Client Components
## 3. TypeScript
- **`strict: true`** is always on (from `tsconfig.json`)
- All API request/response types live in **`src/app/type/api/index.ts`**
- Discriminated union types are used for success/error responses:
- Prefer **`type`** over **`interface`** for API shapes
- Prefer **`unknown`** for unchecked external data, narrowing before use
- Helper guard functions for status enums:
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
## 5. React Components
### Client Components
### Component patterns
### Modal components
- Accept `open: boolean` and `onClose: () => void` props
- Use `onOpenChange={(v) => !v && handleCancel()}` on the Dialog wrapper
- Always implement a `resetForm` helper
- Always have a `handleCancel` that resets + closes
## 6. Server-Side API Routes
### Required route scaffolding
### Authorization pattern
### Input validation — explicit type + existence checks
### Error response pattern
### Success response pattern
### Realtime event pattern (fire-and-forget)
## 7. Hooks (React Query)
### File structure (`src/hooks/useXxx.ts`)
### Query invalidation patterns
- After **create**: invalidate list queries
- After **status update**: invalidate list + contracts (with 2 s delay for server propagation)
- After **delete**: invalidate list queries
### Error handling in mutations
### Fetch wrapper pattern
## 8. State Management
| Concern | Solution |
|---|---|
| Server state / async data | TanStack Query (`useQuery`, `useInfiniteQuery`, `useMutation`) |
| Local UI state (open/close, form fields) | `useState` co-located in component |
| Derived/computed values | `useMemo` |
| Cross-component shared UI state | React Context (see `src/providers/`) |
| URL / navigation state | Next.js Router |
## 9. Error Handling
### Client-side
### Server-side (route handlers)
### Realtime
### Input validation
- Check existence first (`!value`)
- Then check type (`typeof value !== 'string'`)
- Then check semantics / business rules (time range, credit availability, etc.)
- Return progressively more specific error messages from outermost to innermost check
## 10. Styling & UI
### Design system tokens
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
### Class composition
### Responsive design
- Mobile-first Tailwind classes
- Use `sm:`, `md:`, `lg:` breakpoints
- `max-w-screen-xl mx-auto` for content width constraint
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
## 12. Real-time & Database
### InstantDB server client
### Transaction pattern
### Query pattern
### Realtime channel naming
## 13. Authentication
- All auth via **Clerk** (`@clerk/nextjs`)
- Server-side auth: `import { auth } from '@clerk/nextjs/server'`
- Client-side auth: `import { useAuth } from '@clerk/nextjs'`
- User ID: `const { userId } = await auth()`
- Always guard API routes; return `401` if `!userId`
## 14. Accessibility
- All interactive elements have accessible labels
- Error messages linked to inputs via `aria-describedby` (implicit via `errors.fieldName` rendering)
- Screen-reader error summaries: `<div aria-live="polite" className="sr-only">`
- Status badges use `role="status"` and `aria-label`
- Icon-only buttons always wrapped in `Tooltip` with descriptive content
- Focus management on modal open/close
- Colour is never the only differentiator — icons + text always accompany status colours
## 15. Formatting & Linting
| Tool | Config location | Notes |
|---|---|---|
| ESLint | `.eslintrc.mjs` (flat config) | Extends `next/core-web-vitals` |
| Prettier | `.prettierrc` | Configured alongside ESLint |
| EditorConfig | `.editorconfig` | 2-space indent, LF line endings |
### EditorConfig (`.editorconfig`)
### Prettier (`.prettierrc`)
### Import ordering (manual convention)
### Comments
- **File header** comment on every route file (path reference)
- **JSDoc** on all exported utility functions
- **`// Disable caching for this route`** before `export const dynamic`
- Inline `// sub-section` banners in large files (see `statusUtils.ts`)
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
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## 1. Pattern: Monolithic Full-Stack Next.js App
## 2. Request / Response Lifecycle
```
```
## 3. Data Model
```
```
### Relationships
- **$users ↔ user_setting**: one-to-one via `userSettings` link
- **$users ↔ contract**: one-to-many via `contractUser` (purchased_by), `contractSaleBy` (sale_by)
- **contract ↔ history**: one-to-many via `historyContract`
- **$users ↔ history**: one-to-many via `historyUser` (teach_by)
### Status Machines
```
```
```
```
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
```
### 4.3 Auth Sync Abstraction
- On Clerk sign-in → `instantClient.auth.signInWithIdToken({ idToken })`
- On Clerk sign-out → `instantClient.auth.signOut()`
- InstantDB user is looked up by email in the JWT token
### 4.4 Role-Based Access
```
```
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
## 6. Caching Strategy
- **`dynamic = 'force-dynamic'`** set globally on all layouts and API routes — no Next.js ISR/caching
- **TanStack Query** `staleTime: 60_000` (1 minute) as default; `staleTime: 30_000` for trainer schedule
- **Pull-to-refresh**: `PullToRefresh` component invalidates all query keys and refetches active queries
- **Desktop refresh**: TopBar `handleRefresh` button calls `queryClient.refetchQueries({ type: 'active' })`
- **Realtime invalidation**: On `contract.changed` or `history.changed` events, invalidates relevant keys
- **Next.js onDemandEntries**: `maxInactiveAge: 0, pagesBufferLength: 0` — disables dev server caching
## 7. Design Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--color-cta` | `#F26076` (coral) | Primary CTA buttons |
| `--color-cta-hover` | `#D94E63` | Hover state for CTA |
| `--color-warning` | `#FF9760` (orange) | Pending states, warm accents |
| `--color-success` | `#458B73` (teal) | Active/completed states |
| `--color-success-bg` | `#E8F5EF` | Success background tint |
| `--color-warning-bg` | `#FFF4EC` | Warning background tint |
| `--color-pt-bg` | `#FDE8EB` | PT/secondary background tint |
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
