# Technology Stack

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

```
src/
├── app/                          # Next.js App Router
│   ├── (main)/                   # Main authenticated pages
│   │   ├── contracts/             # Contracts management
│   │   ├── history/              # Session history
│   │   ├── profile/              # User profile + essential info
│   │   ├── user-management/      # Admin user management
│   │   └── page.tsx              # Dashboard / home
│   ├── api/                      # API Route Handlers
│   │   ├── admin/backfillTimestamps/
│   │   ├── contract/create|delete|update|getAll|updateStatus/
│   │   ├── history/create|delete|update|getAll|getByContract|getOccupiedTimeSlots|updateNote|updateStatus/
│   │   ├── realtime/token/       # Ably scoped token endpoint
│   │   └── user/checkUserSetting|createUserSetting|getAll|getByRole|getUserInformation|updateBasicInfo|updateEssentialInformation|updateRole/
│   ├── sign-in/                  # Clerk sign-in page
│   ├── offline/                  # PWA offline page
│   └── type/api/                 # Shared TypeScript API types
├── components/
│   ├── cards/                    # ContractCard, SessionCard
│   ├── common/                   # StatusBadge, TimeSlotPicker, UserSearchSelect
│   ├── layout/                   # BottomNavigation, MainLayout, TopBar
│   ├── modals/                   # CreateContractModal, CreateSessionModal, OnboardingModal, SessionHistoryModal
│   └── ui/                       # shadcn/ui components (20+ components)
├── hooks/                        # React Query hooks (useContracts, useHistory, useUser, useUsers, useUserOnboarding)
├── lib/
│   ├── db.ts                     # InstantDB client init
│   ├── dbServer.ts               # InstantDB server/admin init
│   ├── realtime/
│   │   ├── ablyServer.ts         # Ably server-side publish utilities
│   │   └── channel.ts            # Channel naming (user:{id})
│   ├── roleCheck.ts              # isAdmin, isStaffOrAdmin helpers
│   └── utils.ts                  # cn() utility
├── providers/
│   ├── QueryClientProvider.tsx   # React Query provider
│   └── RealtimeProvider.tsx      # Ably client-side subscription
├── theme/colors.ts               # Custom theme colors
└── utils/                        # timeUtils, currencyUtils, statusUtils, clearCache
```
