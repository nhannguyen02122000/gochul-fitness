# Testing Conventions

> **Source of truth:** This document describes the testing landscape, strategy, and gaps.
> The codebase currently has **no application-level test suite** — everything under
> `src/` is test-free. All testing is convention and intent until a test suite is added.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Recommended Test Strategy](#2-recommended-test-strategy)
3. [Framework & Tooling](#3-framework--tooling)
4. [Test File Structure](#4-test-file-structure)
5. [Coverage Targets](#5-coverage-targets)
6. [Unit Testing Patterns](#6-unit-testing-patterns)
7. [API Route Testing](#7-api-route-testing)
8. [Component Testing](#8-component-testing)
9. [Hook Testing](#9-hook-testing)
10. [Mocking](#10-mocking)
11. [Code Coverage](#11-code-coverage)
12. [CI / Pre-commit](#12-ci--pre-commit)
13. [Test Utilities & Fixtures](#13-test-utilities--fixtures)
14. [Accessibility Testing](#14-accessibility-testing)

---

## 1. Current State

### What exists today

| Area | Status | Location |
|---|---|---|
| Unit / utility tests | **None** | — |
| Integration tests | **None** | — |
| E2E tests | **None** | — |
| API route tests | **None** | — |
| Component tests | **None** | — |
| Hook tests | **None** | — |
| Type checking | ✅ `tsc --noEmit` (strict) | `tsconfig.json` |

### What this means

The codebase relies entirely on:
- **TypeScript strict mode** for type safety
- **Manual code review** for logic correctness
- **Clerk's auth middleware** for route protection
- **React Query devtools / browser console** for query state inspection
- **sonner toasts** for runtime error surfacing

### What must be added

A complete testing pyramid should be introduced incrementally, starting with the highest-value areas listed in [Recommended Test Strategy](#2-recommended-test-strategy).

---

## 2. Recommended Test Strategy

Adopt a **testing pyramid** in this order of priority:

```
Priority 1 ────────────────────────────────────────── Priority 5
┌─────────────────────┐
│  API Route Tests    │  ← Most critical: all business logic lives here
│  (Integration)      │
├─────────────────────┤
│  Utility Functions  │  ← Pure functions, easy to test, high confidence
├─────────────────────┤
│  Hooks (React Query)│  ← Mock API layer, verify cache interactions
├─────────────────────┤
│  React Components   │  ← Test rendering + user interactions (RTL)
├─────────────────────┤
│  E2E (Playwright)   │  ← Critical user journeys (sign-in, create session)
└─────────────────────┘
```

### Priority 1: API Route Integration Tests

The route handlers in `src/app/api/` contain all the business logic:
- Authorization checks
- Input validation
- Role-based access control
- Credit deduction
- Time-slot conflict detection
- Realtime event publishing

These are the **most important** tests to write first because they cover the entire stack without needing a browser.

### Priority 2: Utility Function Unit Tests

Pure functions in `src/utils/` and `src/lib/` are trivial to unit test:

- `minutesToTime` / `timeToMinutes`
- `checkSlotOverlap`
- `isSlotInPast`
- `isExpired` / `isContractExpired`
- `formatDate` / `formatDateTime` / `formatTimeRange`
- `getRelativeTime`
- Role check helpers (`isAdmin`, `isStaffOrAdmin`)

### Priority 3: React Query Hook Tests

Mock the `fetch` layer and test:

- Query key construction
- `enabled` flag behaviour (conditional queries)
- Cache invalidation on mutation success
- Error propagation from API to hook

### Priority 4: Component Tests

Test user-facing components for correct rendering and interaction:

- `StatusBadge` — correct variant + text per status
- `ContractCard` — action buttons shown/hidden per role
- `CreateSessionModal` — validation, error display, success flow
- `TimeSlotPicker` — occupied slots, past slots, selection state

### Priority 5: E2E with Playwright

Critical user journeys:

1. Sign in → see contracts page
2. Create a session → appears in history
3. Update contract status → badge changes
4. Cancel a session → disappears from available slots

---

## 3. Framework & Tooling

### Recommended stack

| Concern | Recommended | Rationale |
|---|---|---|
| Test runner | **Vitest** | Drop-in Jest replacement, faster, native ESM, great Next.js support |
| React testing | **React Testing Library (RTL)** | Tests behaviour, not implementation |
| API mocking | **MSW (Mock Service Worker)** | Intercepts `fetch` at network level — no code changes needed |
| Component assertions | **@testing-library/jest-dom** | Extended DOM matchers (`toBeInTheDocument`, etc.) |
| E2E | **Playwright** | Best Next.js App Router support |
| Coverage | **@vitest/coverage-v8** | Native Vitest coverage |

### Installation plan

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw @mswjs/msw
npm install -D playwright @playwright/test
```

### Vitest config (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## 4. Test File Structure

### Location convention

```
src/
├── utils/
│   ├── timeUtils.ts
│   └── timeUtils.test.ts       ← co-located unit tests
├── hooks/
│   ├── useHistory.ts
│   └── useHistory.test.ts      ← hook tests
├── components/
│   ├── common/
│   │   ├── StatusBadge.tsx
│   │   └── StatusBadge.test.tsx
│   ├── modals/
│   │   ├── CreateSessionModal.tsx
│   │   └── CreateSessionModal.test.tsx
│   └── cards/
│       ├── ContractCard.tsx
│       └── ContractCard.test.tsx
├── app/api/
│   ├── history/
│   │   └── create/
│   │       └── route.ts
│   │       └── route.test.ts   ← API integration tests
│   └── contract/
│       ├── create/
│       │   └── route.test.ts
│       └── update/
│           └── route.test.ts
└── test/
    ├── setup.ts                ← test environment setup
    ├── mocks/                  ← shared mock definitions
    │   ├── msw-handlers.ts
    │   └── queryClient.ts
    └── fixtures/               ← shared test data
        ├── contracts.ts
        ├── history.ts
        └── users.ts
```

> **Principle:** Tests live **next to** the code they test (co-located).
> Do **not** use a separate `__tests__` directory.

### Naming convention

| File type | Suffix | Example |
|---|---|---|
| Unit / integration tests | `.test.ts` | `timeUtils.test.ts` |
| Component tests | `.test.tsx` | `StatusBadge.test.tsx` |
| Spec-style (alternative) | `.spec.ts` | `timeUtils.spec.ts` |

---

## 5. Coverage Targets

Start with these thresholds and raise over time:

| Layer | Initial target | Long-term |
|---|---|---|
| `src/utils/` | 90% | 95% |
| `src/lib/` | 80% | 90% |
| API routes (`src/app/api/`) | 70% | 85% |
| React Query hooks | 70% | 80% |
| Components | 50% | 70% |

**Note:** Coverage is a metric, not a goal. Prioritise testing **critical paths** (auth, credits, time conflicts) over chasing percentage.

---

## 6. Unit Testing Patterns

### Pure utility functions

```typescript
// src/utils/timeUtils.test.ts
import { describe, it, expect } from 'vitest'
import { minutesToTime, timeToMinutes, checkSlotOverlap, isSlotInPast } from './timeUtils'

describe('minutesToTime', () => {
  it('converts midnight to 00:00', () => {
    expect(minutesToTime(0)).toBe('00:00')
  })

  it('converts 8:30 AM to 08:30', () => {
    expect(minutesToTime(510)).toBe('08:30')
  })

  it('pads single-digit hours and minutes', () => {
    expect(minutesToTime(65)).toBe('01:05')
  })
})

describe('checkSlotOverlap', () => {
  it('returns true when slots overlap', () => {
    const occupied = [{ from: 480, to: 570 }] // 08:00 - 09:30
    expect(checkSlotOverlap(500, 560, occupied)).toBe(true) // 08:20 - 09:20
  })

  it('returns false for adjacent slots', () => {
    const occupied = [{ from: 480, to: 570 }]
    expect(checkSlotOverlap(570, 660, occupied)).toBe(false) // 09:30 - 11:00
  })

  it('returns false when no occupied slots', () => {
    expect(checkSlotOverlap(480, 570, [])).toBe(false)
  })
})
```

### Role check helpers

```typescript
// src/lib/roleCheck.test.ts
import { describe, it, expect } from 'vitest'
import { isAdmin, isStaffOrAdmin } from './roleCheck'

describe('isAdmin', () => {
  it('returns true for ADMIN', () => {
    expect(isAdmin('ADMIN')).toBe(true)
  })
  it('returns false for STAFF', () => {
    expect(isAdmin('STAFF')).toBe(false)
  })
  it('returns false for CUSTOMER', () => {
    expect(isAdmin('CUSTOMER')).toBe(false)
  })
})
```

### Status utility functions

```typescript
// src/utils/statusUtils.test.ts
import { describe, it, expect } from 'vitest'
import {
  isCompletedHistoryStatus,
  isPreActiveContractStatus,
  canViewContract,
  canCancelContract,
  canCancelHistory,
} from './statusUtils'

describe('isPreActiveContractStatus', () => {
  it('returns true for NEWLY_CREATED', () => {
    expect(isPreActiveContractStatus('NEWLY_CREATED')).toBe(true)
  })
  it('returns true for CUSTOMER_REVIEW', () => {
    expect(isPreActiveContractStatus('CUSTOMER_REVIEW')).toBe(true)
  })
  it('returns false for ACTIVE', () => {
    expect(isPreActiveContractStatus('ACTIVE')).toBe(false)
  })
  it('returns false for CANCELED', () => {
    expect(isPreActiveContractStatus('CANCELED')).toBe(false)
  })
})

describe('canCancelContract', () => {
  it('allows canceling NEWLY_CREATED', () => {
    expect(canCancelContract('NEWLY_CREATED')).toBe(true)
  })
  it('prevents canceling ACTIVE', () => {
    expect(canCancelContract('ACTIVE')).toBe(false)
  })
  it('prevents canceling CANCELED', () => {
    expect(canCancelContract('CANCELED')).toBe(false)
  })
})
```

---

## 7. API Route Testing

### Pattern: Integration tests with MSW + supertest-style fetch

Mock the `instantServer` and Clerk auth at the handler level using dependency injection.

**The recommended approach:** extract route handler logic into a pure function that takes dependencies as arguments, then test the pure function directly.

```typescript
// Pattern for testable route handlers
// src/app/api/history/create/route.ts

export async function POST(request: Request) {
  return handleCreateHistory(request, instantServer, auth)
}

// Separate the pure logic for testability
export async function handleCreateHistory(
  request: Request,
  db: typeof instantServer,   // injectable for tests
  authFn: typeof auth         // injectable for tests
) {
  // ... all existing logic unchanged
}
```

**Simpler alternative (MSW handlers):**

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const historyHandlers = [
  http.post('/api/history/create', async ({ request }) => {
    const body = await request.json()
    // validate and return mock response
    return HttpResponse.json({ history: { id: 'test-id', ...body } }, { status: 201 })
  }),
]
```

### Route test example

```typescript
// src/app/api/history/create/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Clerk auth — must be set up before importing route
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'user_123' })),
}))

// Mock InstantDB
vi.mock('@/lib/dbServer', () => ({
  instantServer: {
    query: vi.fn(),
    transact: vi.fn(),
    tx: {
      history: {
        historyId: {
          update: vi.fn().mockReturnThis(),
          link: vi.fn().mockReturnThis(),
        },
      },
    },
  },
}))

describe('POST /api/history/create', () => {
  // ... tests
})
```

---

## 8. Component Testing

### RTL pattern

```typescript
// src/components/common/StatusBadge.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('renders contract ACTIVE status with correct text', () => {
    render(<StatusBadge status="ACTIVE" type="contract" />)
    expect(screen.getByRole('status')).toHaveTextContent('Active')
  })

  it('renders history NEWLY_CREATED status', () => {
    render(<StatusBadge status="NEWLY_CREATED" type="history" />)
    expect(screen.getByRole('status')).toHaveTextContent('Pending check in')
  })

  it('renders CANCELED with destructive variant', () => {
    render(<StatusBadge status="CANCELED" type="history" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass(/destructive/)
  })
})
```

### Testing user interactions

```typescript
// src/components/modals/CreateSessionModal.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import CreateSessionModal from './CreateSessionModal'

const mockOnClose = vi.fn()

describe('CreateSessionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows validation error when submitting without selecting a contract', async () => {
    const user = userEvent.setup()
    render(<CreateSessionModal open={true} onClose={mockOnClose} />)

    await user.click(screen.getByRole('button', { name: /create session/i }))

    expect(screen.getByText('Please select a contract')).toBeInTheDocument()
  })

  it('calls onClose after successful session creation', async () => {
    // ... mock useCreateHistory, fill form, submit, assert onClose called
  })
})
```

---

## 9. Hook Testing

### Pattern: Test the hook, not the API

```typescript
// src/hooks/useHistory.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCreateHistory } from './useHistory'

// Mock fetch globally
global.fetch = vi.fn()

const createWrapper = () => {
  const queryClient = new QueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCreateHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invalidates history and contract queries on success', async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // Mock successful response
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ history: { id: 'h1' } }),
    })

    const { result } = renderHook(() => useCreateHistory(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ contract_id: 'c1', date: Date.now(), from: 480, to: 570 })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['history'] })
    })
  })
})
```

---

## 10. Mocking

### What to mock

| Dependency | Tool | When |
|---|---|---|
| `fetch` calls to API routes | MSW | API tests, hook tests |
| Clerk auth (`auth()`, `currentUser()`) | `vi.mock` with return value | All server-side tests |
| InstantDB (`instantServer`) | `vi.mock` with mocked methods | Route handler tests |
| `date-fns` (for time-based utils) | `vi.mock` | Utility tests that depend on `Date.now()` |
| React Query query client | `new QueryClient()` per test | Hook tests |
| `sonner` toast | `vi.mock` | Component tests that call `toast.success/error` |

### Global fetch mock pattern

```typescript
// src/test/mocks/fetch.ts
export function setupFetchMock(overrides: Record<string, unknown> = {}) {
  const defaultResponse = { ok: true, json: () => Promise.resolve({}) }
  global.fetch = vi.fn().mockResolvedValue({ ...defaultResponse, ...overrides })
}
```

### Clerk auth mock

```typescript
// src/test/mocks/clerk.ts
import { vi } from 'vitest'

export const mockAuth = {
  userId: 'user_123',
  sessionId: 'sess_abc',
  role: 'ADMIN' as const,
}

export function mockClerk() {
  return vi.mock('@clerk/nextjs/server', () => ({
    auth: vi.fn(() => Promise.resolve({ userId: mockAuth.userId })),
    currentUser: vi.fn(() => Promise.resolve({ id: mockAuth.userId })),
  }))
}
```

### InstantDB mock

```typescript
// src/test/mocks/instantdb.ts
export const mockInstantServer = {
  query: vi.fn().mockResolvedValue({ history: [] }),
  transact: vi.fn().mockResolvedValue(undefined),
  tx: {
    history: {
      historyId: {
        update: vi.fn().mockReturnThis(),
        link: vi.fn().mockReturnThis(),
      },
    },
  },
}
```

---

## 11. Code Coverage

### Run coverage

```bash
npx vitest run --coverage
```

### Coverage report targets

- **Lines:** 60% initial → 80% target
- **Functions:** 70% initial → 85% target
- **Branches:** 50% initial → 70% target
- **Statements:** match lines

### Exclusions from coverage

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/**',
        'src/test/**',          // test utilities
        '*.config.*',           // config files
        'src/app/layout.tsx',  // root layout
        'src/providers/**',    // providers (integration test instead)
      ],
    },
  },
})
```

### Coverage workflow

1. Run `npx vitest run --coverage` locally before opening PR
2. CI runs coverage and fails if thresholds are not met
3. Coverage report is uploaded to Vercel or GitHub Artifacts

---

## 12. CI / Pre-commit

### Pre-commit hooks (optional — `lint-staged`)

```json
// package.json additions
{
  "lint-staged": {
    "*.{ts,tsx}": ["vitest related --run", "eslint --max-warnings 0"]
  }
}
```

### GitHub Actions CI (`/.github/workflows/test.yml`)

```yaml
name: Test & Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests with coverage
        run: npx vitest run --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
```

---

## 13. Test Utilities & Fixtures

### Shared fixtures (`src/test/fixtures/`)

```typescript
// src/test/fixtures/contracts.ts
import type { Contract } from '@/app/type/api'

export const mockContract: Contract = {
  id: 'contract_001',
  created_at: Date.now() - 86400000 * 30,
  updated_at: Date.now(),
  kind: 'PT',
  credits: 10,
  duration_per_session: 90,
  used_credits: 3,
  status: 'ACTIVE',
  money: 5000000,
  purchased_by: 'user_customer_001',
  sale_by: 'user_trainer_001',
}

export const mockContractExpired: Contract = {
  ...mockContract,
  status: 'EXPIRED',
}

export const mockContractCanceled: Contract = {
  ...mockContract,
  status: 'CANCELED',
}
```

```typescript
// src/test/fixtures/history.ts
import type { History } from '@/app/type/api'

export const mockHistoryRecord: History = {
  id: 'history_001',
  created_at: Date.now() - 86400000,
  updated_at: Date.now(),
  date: Date.now(),
  status: 'NEWLY_CREATED',
  from: 480,  // 08:00
  to: 570,    // 09:30
  teach_by: 'user_trainer_001',
}

export const mockOccupiedSlots = [
  { from: 480, to: 570 },
  { from: 600, to: 690 },
]
```

```typescript
// src/test/fixtures/users.ts
export const mockAdminUser = {
  id: 'user_admin_001',
  role: 'ADMIN' as const,
  clerk_id: 'clerk_admin',
  first_name: 'Admin',
  last_name: 'User',
}

export const mockCustomerUser = {
  id: 'user_customer_001',
  role: 'CUSTOMER' as const,
  clerk_id: 'clerk_customer',
  first_name: 'John',
  last_name: 'Doe',
}

export const mockTrainerUser = {
  id: 'user_trainer_001',
  role: 'STAFF' as const,
  clerk_id: 'clerk_trainer',
  first_name: 'Jane',
  last_name: 'Smith',
}
```

### Test setup file (`src/test/setup.ts`)

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock

// Global fetch cleanup between tests
afterEach(() => {
  global.fetch?.mockReset?.()
})
```

---

## 14. Accessibility Testing

### With jest-axe

```bash
npm install -D jest-axe
```

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

expect.extend(toHaveNoViolations)

describe('StatusBadge accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<StatusBadge status="ACTIVE" type="contract" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Checklist for component tests

- [ ] Status badges have `role="status"` and `aria-label` (already implemented)
- [ ] Modals trap focus on open
- [ ] Error messages are linked to inputs via `aria-describedby` or `aria-live`
- [ ] Icon-only buttons have accessible text alternatives

---

## Summary

| Action | Owner | Notes |
|---|---|---|
| Install Vitest + RTL + MSW | Dev | Do this first |
| Write `src/utils/` tests | All devs | Easy wins, start here |
| Write `src/lib/roleCheck` tests | All devs | Also easy |
| Write `src/utils/statusUtils` tests | All devs | Complex conditional logic |
| Write API route integration tests | All devs | Most business value |
| Write hook tests | All devs | Validate query key + invalidation |
| Write component tests | All devs | Priority: `StatusBadge`, `ContractCard`, modals |
| Set up Playwright E2E | Dev | Sign-in, create session, cancel session |
| Configure CI with coverage gate | DevOps | Fail PR if coverage thresholds not met |
