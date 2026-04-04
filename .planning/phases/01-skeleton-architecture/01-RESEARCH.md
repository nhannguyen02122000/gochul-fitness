# Research: Phase 1 — Skeleton & Architecture

**Phase:** 1 — Skeleton & Architecture
**Research date:** 2026-04-04
**Goal:** Gather all knowledge needed to plan Phase 1 implementation

---

## Table of Contents

1. [File Structure & Locations](#1-file-structure--locations)
2. [Clerk JWT Token Strategy](#2-clerk-jwt-token-strategy)
3. [Anthropic SDK Integration](#3-anthropic-sdk-integration)
4. [Tool Definitions Strategy](#4-tool-definitions-strategy)
5. [roleCheck.ts Expansion](#5-rolecheckts-expansion)
6. [System Prompt Architecture](#6-system-prompt-architecture)
7. [Auth Security Best Practices](#7-auth-security-best-practices)
8. [Clerk Middleware Considerations](#8-clerk-middleware-considerations)
9. [Validation Architecture](#9-validation-architecture)

---

## 1. File Structure & Locations

### New Files

```
src/
  app/
    api/
      ai-chatbot/
        route.ts          ← Main route handler
  lib/
    ai/
      anthropicService.ts ← SDK client wrapper
      toolDefinitions.ts  ← TOOL_DEFINITIONS constant
      systemPrompt.ts     ← System prompt builder (optional, can be inline)
```

### File Responsibilities

| File | Responsibility |
|------|----------------|
| `route.ts` | Entry point: `auth()` → `getUserSetting()` → build prompt → call Claude → return response |
| `anthropicService.ts` | `createAnthropicClient()` returning a configured `Anthropic` instance; `callClaude(messages, tools?)` function |
| `toolDefinitions.ts` | `TOOL_DEFINITIONS: Tool[]` array (Anthropic tool_use schema format); `TOOL_DEFINITIONS_BY_ROLE` optional filtered variant |
| `systemPrompt.ts` | `buildSystemPrompt(role, userName, language?)` — assembles role context + tool definitions + Vietnamese time rules |

### No `server-only` Module Boundary Enforcement

Next.js App Router does **not** automatically enforce `server-only` at the module level — it relies on bundler configuration. The convention to prevent client-side imports is:

1. Keep the `src/lib/ai/` directory out of any client component imports
2. Do NOT export from a file that also has `'use client'` at the top
3. For explicit enforcement: add a `src/lib/ai/server.ts` re-export or use the `server-only` npm package

> **Recommendation:** Add `import 'server-only'` to `anthropicService.ts` and `toolDefinitions.ts`. This causes a compile-time error if any client component accidentally imports these files.

```typescript
// src/lib/ai/anthropicService.ts
import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
// ...
```

### `dynamic = 'force-dynamic'`

The route handler must opt out of all caching:

```typescript
// src/app/api/ai-chatbot/route.ts
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

This is consistent with all existing GoChul API routes. No Next.js ISR/caching for this handler.

---

## 2. Clerk JWT Token Strategy

### How Clerk Auth Works in Next.js App Router

Clerk's `auth()` function from `@clerk/nextjs/server` reads the `__session` cookie (or `__clerk_db_jwt` for JWT sessions) that Clerk's middleware set on the incoming request. This gives the route handler the authenticated `userId` without any additional work.

**Existing pattern** (confirmed in `src/app/api/contract/getAll/route.ts`):

```typescript
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // userId is the Clerk ID (e.g., "user_2xK3b...")

  // Look up InstantDB user and role via user_setting
  const userData = await instantServer.query({
    user_setting: { $: { where: { clerk_id: userId } }, users: {} }
  })
  const role = userData.user_setting[0]?.role
  // ...
}
```

**This pattern is the same for the chatbot route.** The chatbot route reads the Clerk cookie via `auth()`, gets the user's role from `user_setting`, and uses that role to scope what the AI can do.

### Clerk JWT Template for Token Forwarding (D-01)

Decision D-01 specifies using `getToken({ template: 'gochul-fitness' })` to get a short-lived scoped token for forwarding to GoChul API routes.

#### What This Means

Clerk JWT templates let you customize the claims in the JWT that Clerk issues for a user. A template named `gochul-fitness` would produce a JWT with custom claims that the GoChul API routes can verify. The key benefit: **the token is scoped and short-lived**, reducing blast radius if leaked.

#### Setup Required (Out of Band — Clerk Dashboard)

1. In the Clerk Dashboard → **JWT Templates** → **Create template**
2. Name: `gochul-fitness`
3. Token lifetime: short (e.g., 5 minutes — enough for a single API call chain)
4. Include standard claims: `sid` (session ID), `sub` (user ID)
5. No custom claims needed for Phase 1; the GoChul routes use `auth()` which reads the cookie, not the forwarded JWT

#### Using the Token in the Route Handler

```typescript
// Inside POST handler of /api/ai-chatbot/route.ts
import { auth } from '@clerk/nextjs/server'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get short-lived scoped token for forwarding to GoChul API routes
  const clerkToken = await getToken({ template: 'gochul-fitness' })
  // clerkToken is a string like "eyJhbG..." or null if template not configured

  // When calling GoChul API routes from within this route handler:
  const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/contract/getAll`, {
    headers: {
      'Content-Type': 'application/json',
      // Forward the scoped Clerk token
      'Authorization': `Bearer ${clerkToken}`,
    },
  })
}
```

#### Key Distinction: Forwarded Token vs. Cookie Reading

| Concern | `auth()` (cookie reading) | `getToken({ template })` (JWT extraction) |
|---------|---------------------------|-------------------------------------------|
| Used for | Verifying the current user's identity | Forwarding auth to downstream API routes |
| Works inside a Route Handler | ✅ Yes | ✅ Yes |
| Works with `server-side` fetch to GoChul routes | ❌ No (same-origin, cookies forwarded automatically) | ✅ Yes (explicit `Authorization` header) |
| Token lifetime | Session lifetime (hours) | Template-defined (e.g., 5 minutes) |
| Requires Clerk Dashboard config | No | Yes (JWT template must exist) |

**Important note:** For **same-origin** fetches from a Next.js Route Handler to another GoChul Route Handler (both on the same Next.js app), the Clerk session cookie is forwarded **automatically** by the browser/Node.js HTTP client because they're in the same origin. So explicit token forwarding may not be needed for internal calls. However, D-01 explicitly requires using `getToken({ template: 'gochul-fitness' })` for scoping. For Phase 1 verification, we'll test both approaches.

#### What Happens If Template Is Not Configured

If the Clerk JWT template `gochul-fitness` doesn't exist in the Clerk dashboard yet, `getToken({ template: 'gochul-fitness' })` returns `null`. The route handler must handle this gracefully — either:
- Fall back to internal API calls (same-origin cookie forwarding works automatically)
- Return an error indicating the template needs to be configured

**For Phase 1 skeleton:** Use `auth()` for user identity, use `getToken()` for token forwarding with a fallback comment. The curl test (Success Criterion 4) will verify which approach works.

### Clerk Middleware — No Changes Needed

The existing Clerk middleware at `middleware.ts` (which does not exist yet — Clerk handles this via `@clerk/nextjs/server`'s `auth()` function) is not needed to be changed for Phase 1. The chatbot route is an API route, so it's already behind any auth middleware that protects `/api/*`.

The `/api/ai-chatbot` route does NOT need to be in the public routes list.

---

## 3. Anthropic SDK Integration

### Package

`@anthropic-ai/sdk` is already in the project (confirmed from `docs/FEAT_AIBOT.txt`). The package provides the `Anthropic` client class.

### Client Initialization

```typescript
// src/lib/ai/anthropicService.ts
import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

const anthropicClient = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL ?? 'https://api.anthropic.com',
})
```

**Environment variables** (from `.env.local`):
```
CLAUDE_API_KEY=sk-c9b29dbbe7158aa97ac79e577974e27dbc6416b238db26fc79a0c20a17c36188
CLAUDE_BASE_URL=http://pro-x.io.vn
```

`MODEL_NAME` is not yet set in `.env.local`. For Phase 1, we can default to `claude-opus-4-6` or read from `process.env.MODEL_NAME ?? 'claude-opus-4-6'`. The Phase 1 skeleton should still be functional even if `MODEL_NAME` is hardcoded — the `.env.local` should be updated as a task.

```typescript
const MODEL_NAME = process.env.MODEL_NAME ?? 'claude-opus-4-6'
```

### SDK API — Phase 1 (No Tool-Use Loop)

For Phase 1, the route returns a **placeholder response** (no tool-use loop). The Anthropic SDK call is:

```typescript
import type { Message } from '@anthropic-ai/sdk'

export async function callClaudePlaceholder(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await anthropicClient.messages.create({
    model: MODEL_NAME,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ],
  })

  // Extract text from response
  const textContent = response.content.find(
    (block) => block.type === 'text'
  )
  return textContent?.type === 'text' ? textContent.text : ''
}
```

For Phase 1, this returns a hardcoded placeholder (the AI call is optional). The key deliverable is the **route handler scaffold** with correct auth, not the AI response quality.

### SDK API — Phase 4 Reference (Tool-Use Pattern)

For reference when implementing Phase 4, the tool-use pattern is:

```typescript
const response = await anthropicClient.messages.create({
  model: MODEL_NAME,
  max_tokens: 8192,
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
  tools: TOOL_DEFINITIONS,  // Array of Anthropic tool objects
})
// response.content will contain both 'text' and 'tool_use' blocks
```

### Error Handling

The SDK throws on API errors. Wrap in try/catch:

```typescript
try {
  const response = await anthropicClient.messages.create({ ... })
  return response
} catch (error) {
  // Log error WITHOUT the token
  console.error('Anthropic API error:', error instanceof Error ? error.message : String(error))
  throw error
}
```

**CRITICAL:** Never log `error.request` or any field that might contain the API key. The Anthropic SDK's error object does not include the request body/headers by default, but be defensive.

### TypeScript Types

The `@anthropic-ai/sdk` package exports types including:
- `Message` (role, content)
- `Tool` (name, description, input_schema)
- `MessageCreateParams`
- `ContentBlock`

Import from `@anthropic-ai/sdk`.

---

## 4. Tool Definitions Strategy

### Anthropic Tool Use Schema Format

Anthropic's `tool_use` parameter accepts an array of tool definition objects. Each tool has this shape:

```typescript
type Tool = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required: string[]
  }
}
```

### The 10 Tools

Listed in order matching ROADMAP.md:

#### 1. `get_contracts`

```typescript
{
  name: 'get_contracts',
  description: 'List gym contracts. Returns contracts filtered by the calling user role (ADMIN sees all, STAFF sees their own sales, CUSTOMER sees their own purchases). Supports pagination, status filtering, kind filtering, and date range filtering.',
  input_schema: {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Page number (default: 1)' },
      limit: { type: 'number', description: 'Items per page (default: 10, max: 50)' },
      statuses: {
        type: 'string',
        description: 'Comma-separated list of contract statuses. Valid values: NEWLY_CREATED, CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, PT_CONFIRMED, ACTIVE, CANCELED, EXPIRED. Note: CUSTOMER role cannot request NEWLY_CREATED status.'
      },
      kind: {
        type: 'string',
        description: 'Contract kind filter. Values: PT (Personal Training), REHAB (Rehabilitation), PT_MONTHLY (Monthly PT)',
        enum: ['PT', 'REHAB', 'PT_MONTHLY']
      },
      start_date: { type: 'number', description: 'Filter contracts starting on or after this Unix timestamp (ms)' },
      end_date: { type: 'number', description: 'Filter contracts starting on or before this Unix timestamp (ms)' },
      sale_by_name: { type: 'string', description: 'Search by trainer/PT name (ADMIN/CUSTOMER only)' },
      purchased_by_name: { type: 'string', description: 'Search by customer name (ADMIN/STAFF only)' }
    },
    required: []
  }
}
```

#### 2. `create_contract`

```typescript
{
  name: 'create_contract',
  description: 'Create a new gym contract. Only ADMIN and STAFF roles can create contracts. The contract is created with status NEWLY_CREATED and sale_by set to the authenticated user.',
  input_schema: {
    type: 'object',
    properties: {
      purchased_by: { type: 'string', description: 'InstantDB user ID of the customer (required)' },
      kind: { type: 'string', description: 'Contract type', enum: ['PT', 'REHAB', 'PT_MONTHLY'] },
      credits: { type: 'number', description: 'Number of sessions (PT/REHAB only; PT_MONTHLY does not use credits)' },
      duration_per_session: { type: 'number', description: 'Minutes per session (15–180, must be divisible by 15)' },
      money: { type: 'number', description: 'Contract price in VND' },
      start_date: { type: 'number', description: 'Contract start date as Unix timestamp (ms)' },
      end_date: { type: 'number', description: 'Contract end date as Unix timestamp (ms)' }
    },
    required: ['purchased_by', 'kind', 'money', 'end_date']
  }
}
```

**Role scope comment:**
```
// ADMIN: ✅ create for any customer
// STAFF:  ✅ create for any customer
// CUSTOMER: ❌ forbidden — returns HTTP 403
```

#### 3. `update_contract_status`

```typescript
{
  name: 'update_contract_status',
  description: 'Update the status of a gym contract (workflow transitions). Role determines which transitions are allowed. Prevents invalid transitions (e.g., cannot skip from NEWLY_CREATED to ACTIVE). ADMIN can force-set any valid transition. ACTIVE contracts cannot be canceled by STAFF or CUSTOMER.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: { type: 'string', description: 'InstantDB contract ID (required)' },
      status: {
        type: 'string',
        description: 'New status. Valid transitions depend on current status and role. ADMIN: can force most transitions. STAFF: NEWLY_CREATED→CUSTOMER_REVIEW, CUSTOMER_PAID→PT_CONFIRMED, NEWLY_CREATED→CANCELED. CUSTOMER: CUSTOMER_REVIEW→CUSTOMER_CONFIRMED/CANCELED, CUSTOMER_CONFIRMED→CUSTOMER_PAID/CANCELED, PT_CONFIRMED→ACTIVE.',
        enum: ['CUSTOMER_REVIEW', 'CUSTOMER_CONFIRMED', 'CUSTOMER_PAID', 'PT_CONFIRMED', 'ACTIVE', 'CANCELED', 'EXPIRED']
      }
    },
    required: ['contract_id', 'status']
  }
}
```

#### 4. `update_contract`

```typescript
{
  name: 'update_contract',
  description: 'Update contract fields (not status). Only ADMIN role can update contract fields. Can update: kind, credits, duration_per_session, money, start_date, end_date.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: { type: 'string', description: 'InstantDB contract ID (required)' },
      kind: { type: 'string', description: 'Contract type', enum: ['PT', 'REHAB', 'PT_MONTHLY'] },
      credits: { type: 'number', description: 'Number of sessions' },
      duration_per_session: { type: 'number', description: 'Minutes per session (15–180, divisible by 15)' },
      money: { type: 'number', description: 'Contract price in VND' },
      start_date: { type: 'number', description: 'Contract start date as Unix timestamp (ms)' },
      end_date: { type: 'number', description: 'Contract end date as Unix timestamp (ms)' }
    },
    required: ['contract_id']
  }
}
```

**Role scope:** ADMIN only; STAFF/CUSTOMER → HTTP 403.

#### 5. `delete_contract`

```typescript
{
  name: 'delete_contract',
  description: 'Cancel (soft-delete) a contract by setting its status to CANCELED. Only ADMIN role can delete contracts. Note: ACTIVE contracts cannot be deleted; use update_contract_status with CANCELED instead.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: { type: 'string', description: 'InstantDB contract ID (required)' }
    },
    required: ['contract_id']
  }
}
```

**Role scope:** ADMIN only; STAFF/CUSTOMER → HTTP 403.

#### 6. `get_sessions`

```typescript
{
  name: 'get_sessions',
  description: 'List all training sessions (history). Returns sessions filtered by the calling user role. ADMIN sees all sessions, STAFF sees their own sessions, CUSTOMER sees sessions from their own contracts.',
  input_schema: {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Page number (default: 1)' },
      limit: { type: 'number', description: 'Items per page (default: 10, max: 50)' },
      statuses: {
        type: 'string',
        description: 'Comma-separated list of session statuses. Valid values: NEWLY_CREATED, CHECKED_IN, CANCELED, EXPIRED'
      },
      start_date: { type: 'number', description: 'Filter sessions on or after this Unix timestamp (ms)' },
      end_date: { type: 'number', description: 'Filter sessions on or before this Unix timestamp (ms)' },
      teach_by_name: { type: 'string', description: 'Search by trainer name' },
      customer_name: { type: 'string', description: 'Search by customer name' },
      from_minute: { type: 'number', description: 'Filter sessions starting at or after this minute of day (0–1440)' },
      to_minute: { type: 'number', description: 'Filter sessions starting at or before this minute of day (0–1440)' }
    },
    required: []
  }
}
```

#### 7. `create_session`

```typescript
{
  name: 'create_session',
  description: 'Book a new training session. ADMIN: no restrictions. STAFF: no restrictions. CUSTOMER: can only create sessions for contracts they purchased. Additional constraints: contract must be ACTIVE and not expired, session time must not overlap with existing sessions by the same trainer, credits must be available for PT/REHAB contracts.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: { type: 'string', description: 'InstantDB contract ID of the contract to book against (required)' },
      date: { type: 'number', description: 'Session date as Unix timestamp (ms, day only — time component is ignored) (required)' },
      from: { type: 'number', description: 'Start minute of the session (0–1440, e.g., 480 = 8:00 AM) (required)' },
      to: { type: 'number', description: 'End minute of the session (0–1440, must be after `from`) (required)' },
      teach_by: { type: 'string', description: 'InstantDB user ID of the trainer (required)' }
    },
    required: ['contract_id', 'date', 'from', 'to', 'teach_by']
  }
}
```

#### 8. `update_session`

```typescript
{
  name: 'update_session',
  description: 'Update a training session (date, time, or trainer). Reschedules a session. ADMIN: any session. STAFF: only sessions they created. CUSTOMER: only sessions from contracts they purchased. Cannot update CHECKED_IN, CANCELED, or EXPIRED sessions.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: { type: 'string', description: 'InstantDB history/session ID (required)' },
      date: { type: 'number', description: 'New session date as Unix timestamp (ms, day only)' },
      from: { type: 'number', description: 'New start minute (0–1440)' },
      to: { type: 'number', description: 'New end minute (0–1440)' },
      teach_by: { type: 'string', description: 'New trainer InstantDB user ID' }
    },
    required: ['history_id']
  }
}
```

#### 9. `update_session_status`

```typescript
{
  name: 'update_session_status',
  description: 'Update a session status: check-in a customer (NEWLY_CREATED→CHECKED_IN) or cancel a session (NEWLY_CREATED→CANCELED). Dual check-in system: both customer and staff must check in for status to become CHECKED_IN. Cancel is only allowed for NEWLY_CREATED sessions. EXPIRED sessions cannot be updated.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: { type: 'string', description: 'InstantDB history/session ID (required)' },
      action: {
        type: 'string',
        description: 'Action to perform. "check_in": set the calling party\'s check-in timestamp. "cancel": cancel the session (NEWLY_CREATED only).',
        enum: ['check_in', 'cancel']
      }
    },
    required: ['history_id', 'action']
  }
}
```

#### 10. `update_session_note`

```typescript
{
  name: 'update_session_note',
  description: 'Add or update a note on a training session. STAFF/ADMIN can update staff_note; CUSTOMER can update customer_note. STAFF can only update notes for sessions where teach_by matches their user ID.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: { type: 'string', description: 'InstantDB history/session ID (required)' },
      note: { type: 'string', description: 'Note text to set (required)' }
    },
    required: ['history_id', 'note']
  }
}
```

### Per-Role Action Scoping Approach

The ROADMAP says "per-role action scoping in comments." The approach is:
1. Comments at the top of `toolDefinitions.ts` document which roles can call which tools
2. The AI system prompt also contains the role permission matrix (D-02: hybrid approach)
3. The GoChul API routes enforce permissions as the final safety net (API-11)

```typescript
// src/lib/ai/toolDefinitions.ts
/**
 * GoChul Fitness AI Chatbot — Tool Definitions
 *
 * Role permissions for each tool:
 * - get_contracts:        ADMIN ✅ | STAFF ✅ | CUSTOMER ✅
 * - create_contract:       ADMIN ✅ | STAFF ✅ | CUSTOMER ❌
 * - update_contract:        ADMIN ✅ | STAFF ❌ | CUSTOMER ❌
 * - delete_contract:       ADMIN ✅ | STAFF ❌ | CUSTOMER ❌
 * - update_contract_status: ADMIN ✅ (all) | STAFF ✅ (limited) | CUSTOMER ✅ (limited)
 * - get_sessions:          ADMIN ✅ | STAFF ✅ | CUSTOMER ✅
 * - create_session:        ADMIN ✅ | STAFF ✅ | CUSTOMER ✅ (own contracts only)
 * - update_session:        ADMIN ✅ | STAFF ✅ (own) | CUSTOMER ✅ (own contract)
 * - update_session_status: ADMIN ✅ | STAFF ✅ | CUSTOMER ✅
 * - update_session_note:   ADMIN ✅ | STAFF ✅ (teach_by) | CUSTOMER ✅ (own contract)
 */
```

### Response Schema Examples

For Phase 1, response schemas are documented in comments. For Phase 4, these can be formalized. Example for `get_contracts`:

```typescript
/**
 * Response example for get_contracts:
 * {
 *   contracts: [
 *     {
 *       id: "abc123",
 *       kind: "PT",
 *       credits: 10,
 *       used_credits: 3,
 *       duration_per_session: 60,
 *       status: "ACTIVE",
 *       money: 5000000,
 *       start_date: 1744051200000,
 *       end_date: 1746560640000,
 *       sale_by_user: { id: "...", first_name: "John", last_name: "Doe" },
 *       purchased_by_user: { id: "...", first_name: "Jane", last_name: "Smith" }
 *     }
 *   ],
 *   pagination: { page: 1, limit: 10, total: 1, hasMore: false },
 *   role: "CUSTOMER"
 * }
 */
```

---

## 5. roleCheck.ts Expansion

### Current State

The existing `src/lib/roleCheck.ts` has only two helpers:

```typescript
export function isAdmin(role: string) {
  return role === 'ADMIN'
}

export function isStaffOrAdmin(role: string) {
  return role === 'STAFF' || role === 'ADMIN'
}
```

**C7 (CONCERNS.md):** These helpers are **never imported anywhere**. Role checks are inlined in each route with inconsistent patterns. The chatbot route will also need role checks, so standardizing here is essential.

### Needed Helpers

Based on the RBAC matrix in PROGRAM.md, the following helpers are needed:

```typescript
// src/lib/roleCheck.ts

export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export function isAdmin(role: string): role is 'ADMIN' {
  return role === 'ADMIN'
}

export function isStaff(role: string): role is 'STAFF' {
  return role === 'STAFF'
}

export function isCustomer(role: string): role is 'CUSTOMER' {
  return role === 'CUSTOMER'
}

export function isStaffOrAdmin(role: string): boolean {
  return role === 'STAFF' || role === 'ADMIN'
}

export function isAdminOrCustomer(role: string): boolean {
  return role === 'ADMIN' || role === 'CUSTOMER'
}

export function isValidRole(role: string): role is Role {
  return role === 'ADMIN' || role === 'STAFF' || role === 'CUSTOMER'
}

/**
 * Guard: throws or returns false if role is not one of the allowed roles.
 * Use for early-return patterns in API routes.
 */
export function requireRole(role: string, allowed: Role[]): boolean {
  return allowed.includes(role as Role)
}
```

### Guard Pattern in Route Handlers

Instead of inline `if (role !== 'ADMIN') return 403`, use:

```typescript
import { isAdmin } from '@/lib/roleCheck'

// In route handler:
if (!isAdmin(role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Refactoring Existing Routes (Out of Scope for Phase 1)

Refactoring existing routes to use `roleCheck.ts` is **out of Phase 1 scope** but is tracked in the Open Items. Phase 1 should:
1. Expand `roleCheck.ts` with all needed helpers
2. Have the chatbot route use the helpers
3. Note that existing routes should be refactored in a separate task

---

## 6. System Prompt Architecture

### Role Context Section

The system prompt must tell the AI who it's talking to so it can scope actions correctly. Format:

```
You are an AI assistant for GoChul Fitness gym management app.
You are currently helping a [ROLE] user: [USER_NAME]

User ID: [USER_INSTANT_ID]
Role: [ADMIN | STAFF | CUSTOMER]
```

### Role Permission Matrix

Embed the full RBAC matrix in the system prompt (D-02 hybrid approach):

```
ROLE PERMISSIONS:
- ADMIN: Can perform all operations on all contracts and sessions.
- STAFF: Can create contracts, view contracts where sale_by=[their ID], create and manage sessions they created.
- CUSTOMER: Can only view and act on their own contracts (purchased_by=[their ID]) and sessions within those contracts.

SPECIFIC RESTRICTIONS:
- CUSTOMER cannot create contracts
- STAFF cannot update or delete contracts (only update status via specific transitions)
- CUSTOMER cannot cancel ACTIVE contracts (only pre-ACTIVE contracts they own)
- CUSTOMER cannot update contract fields
- ADMIN is the only role that can update contract fields, delete contracts, or force-expire contracts
```

### Vietnamese Time Rules

From `docs/FEAT_AIBOT.txt`, the time rules must be in the system prompt:

```
TIME CONVENTIONS (Vietnam / UTC+7):
- "sáng" (morning): 00:00–11:59 (12-hour clock: 12:00 AM–11:59 AM)
- "chiều" (afternoon): 12:00–14:59 (12-hour clock: 12:00 PM–2:59 PM)
- "tối" (evening): 15:00–17:59 (12-hour clock: 3:00 PM–5:59 PM)
- "đêm" (night): 18:00–23:59 (12-hour clock: 6:00 PM–11:59 PM)

DATE INFERENCE (server time is UTC+7, current date: [SERVER_DATE]):
- "hôm nay" = today
- "ngày mai" = tomorrow
- "thứ X" = the next occurrence of that weekday (e.g., "thứ 6" → the upcoming Friday)
- Infer remaining time anchors from a single anchor: if user says "thứ 6", infer the full date
- Always convert 24h time to 12-hour format with period (e.g., "13:00" → "1:00 chiều")

When user provides a time without a date, use the current server date as the anchor.
When user provides a date without a time, ask for clarification or use morning (sáng) as default.
```

### Tool Definitions Placement

Tools should be passed via Anthropic's `tools` parameter (not in the system prompt text). The system prompt should reference them:

```
You have access to the following tools to interact with the GoChul Fitness app.
Use these tools to fulfill the user's requests. Always call a tool rather than making up information.
If you need more information to call a tool (missing required parameters), ask the user.
If a tool returns a permission error, inform the user in their language.
```

### Language Instruction

The bot must support both English and Vietnamese. Include in system prompt:

```
You must respond in the same language the user uses.
If the user writes in Vietnamese, respond in Vietnamese.
If the user writes in English, respond in English.
Use appropriate gym management terminology in the user's language.
```

### Complete System Prompt Structure (Phase 1)

```typescript
function buildSystemPrompt(
  role: string,
  userName: string,
  userInstantId: string
): string {
  const serverDate = new Date().toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
You are an AI assistant for GoChul Fitness gym management app.
You are currently helping a ${role} user: ${userName}

User InstantDB ID: ${userInstantId}
Role: ${role}

## ROLE PERMISSIONS

${ROLE_PERMISSIONS_MATRIX}

## TIME CONVENTIONS (Vietnam / UTC+7)

Current server date (Vietnam): ${serverDate}

- "sáng" (morning): 00:00–11:59 (12-hour: 12:00 AM–11:59 AM)
- "chiều" (afternoon): 12:00–14:59 (12-hour: 12:00 PM–2:59 PM)
- "tối" (evening): 15:00–17:59 (12-hour: 3:00 PM–5:59 PM)
- "đêm" (night): 18:00–23:59 (12-hour: 6:00 PM–11:59 PM)

Date inference:
- "hôm nay" = today
- "ngày mai" = tomorrow
- "thứ X" = the next occurrence of that weekday
- Infer remaining time anchors from a single anchor
- Convert 24h time to 12-hour format with period (e.g., "13:00" → "1:00 chiều")

## BEHAVIOR RULES

1. Always respond in the same language the user uses.
2. If required parameters are missing, ask the user for them before calling any tool.
3. If a tool returns an error, translate it to a user-friendly message in the user's language.
4. If the user does not have permission for an action, explain this clearly.
5. Do not make up information — always use tool calls to get data.
6. Confirm the user's intent before executing write operations (create, update, delete).
7. Maximum 10 tool call iterations per conversation turn to prevent runaway loops.
`.trim()
}
```

---

## 7. Auth Security Best Practices

### Token Hygiene Rules (Pitfall P5 Prevention)

These rules must be enforced in the route handler and any tool execution code:

1. **Never `console.log` the Clerk token.** The `clerkToken` variable must never appear in any log statement:
   ```typescript
   // ❌ WRONG
   console.log('Forwarding token:', clerkToken)

   // ✅ CORRECT
   console.log('Forwarding auth to GoChul API')
   ```

2. **Never include the Clerk token in the Anthropic API call.** The Anthropic API should only receive messages + system prompt. The `clerkToken` is for GoChul internal API calls only.

3. **Keep tool execution server-side only.** The chatbot route executes the GoChul API calls internally — the AI never gets direct access to the Clerk token. The AI receives only tool results (success/failure data), never the auth token.

4. **Use `server-only` package** on all server-side files.

5. **Error messages must not expose tokens.** When catching errors from API calls:
   ```typescript
   catch (error) {
     // Only log the error type/message, never the full error object
     console.error('API call failed:', error instanceof Error ? error.message : 'Unknown error')
     return NextResponse.json({ error: 'Failed to execute operation' }, { status: 500 })
   }
   ```

### Clerk Token Forwarding Flow

```
Client browser
  │
  │ POST /api/ai-chatbot (Clerk cookie auto-attached)
  ▼
/api/ai-chatbot/route.ts
  │
  ├─ auth() ──► verifies Clerk cookie ──► userId + role
  │
  ├─ getToken({ template: 'gochul-fitness' }) ──► short-lived JWT
  │
  ├─ build system prompt (userId, role, tools, time rules)
  │
  ├─ callClaude(systemPrompt, userMessage) ──► NO Clerk token to Anthropic
  │
  ├─ if AI requests a tool call:
  │    └─ fetch('/api/contract/getAll', {
  │         headers: { Authorization: `Bearer ${clerkToken}` }
  │       })
  │         └─ GoChul API route reads auth() from forwarded token
  │
  └─ return AI response to client (NO token in response)
```

### Success Criterion 6 Enforcement Plan

Success Criterion 6: "No Clerk session tokens appear in any `console.log` output or error traces in the route handler."

Enforcement:
1. ESLint rule: add a custom rule or use `no-restricted-syntax` to flag string literals containing `token` or `clerk` in `console.*` calls
2. Manual review of the route handler before Phase 1 is marked complete
3. The route handler should use structured logging that strips sensitive fields

---

## 8. Clerk Middleware Considerations

### No Middleware Changes Needed

The existing GoChul app uses Clerk's Next.js integration. The middleware (if any) handles session cookies for all routes. The chatbot route at `/api/ai-chatbot` is:
- A Next.js API route (covered by any existing auth middleware)
- Uses `auth()` from `@clerk/nextjs/server` for user identity
- Does NOT need to be in any "public routes" list

### Clerk Dashboard JWT Template Setup

This is an **out-of-band task** (manual, in Clerk dashboard) — not implementable via code:

1. Go to Clerk Dashboard → **JWT Templates**
2. Click **New template** → **Empty template**
3. Name: `gochul-fitness`
4. Token lifetime: 5 minutes
5. Claims: `sub` (user ID), `sid` (session ID) — these are the defaults
6. Save

The chatbot route handler must gracefully handle the case where this template doesn't exist yet (returns null from `getToken()`).

---

## 9. Validation Architecture

### What "Phase 1 Works Correctly" Means

Phase 1 is validated when all 7 success criteria from ROADMAP.md are demonstrably true. The key insight: **Phase 1 is a backend-only skeleton** — there is no UI, so all validation is done via HTTP requests (curl, Postman, or a simple test script).

### Success Criteria → Measurable Tests

#### Criterion 1: HTTP 200 with session, HTTP 401 without

```bash
# Without session — expect 401
curl -X POST http://localhost:3000/api/ai-chatbot \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}' \
  # No Clerk session cookie

# With valid session — expect 200 and JSON body
curl -X POST http://localhost:3000/api/ai-chatbot \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=<VALID_SESSION_TOKEN>" \
  -d '{"message":"hello"}'
```

**Test mechanism:** A bash script or Node.js script that makes both requests and asserts the status codes.

#### Criterion 2: Role Resolution

```bash
# Test with a known ADMIN session
# Expect role field in response or debug output
```

**Test mechanism:** The route handler returns the resolved role in the JSON response (for Phase 1 skeleton only; remove in Phase 3 when real responses return). Or: inspect via a debug header or log (not in production code).

#### Criterion 3: TOOL_DEFINITIONS Completeness

```bash
# Verify the file exists and has 10 tools
node -e "const t = require('./src/lib/ai/toolDefinitions.ts'); console.log(t.TOOL_DEFINITIONS.length)"
```

**Test mechanism:**
1. TypeScript build passes with no errors
2. `TOOL_DEFINITIONS.length === 10`
3. Each tool has `name`, `description`, `input_schema`
4. All 10 endpoint names are present: `get_contracts`, `create_contract`, `update_contract_status`, `update_contract`, `delete_contract`, `get_sessions`, `create_session`, `update_session`, `update_session_status`, `update_session_note`

#### Criterion 4: Auth Forwarding End-to-End

This is the most critical test. The chatbot route must be able to call a GoChul API route (e.g., `/api/contract/getAll`) using the forwarded Clerk token.

```bash
# Step 1: Get a Clerk session token
# Step 2: POST to /api/ai-chatbot with a message that triggers a contract list
# Step 3: Verify the /api/contract/getAll call inside succeeded
```

**Test mechanism:** A minimal Node.js test script:
1. Sign in via Clerk test utilities or use an existing test account
2. Extract the session token from the Clerk cookie or use `getToken()`
3. POST to `/api/ai-chatbot` with `{"message": "list my contracts"}`
4. Verify the response contains contract data (not a 401/403 from the internal call)

**Alternative (simpler):** Add a debug flag to the route handler (Phase 1 only) that echoes back whether the token forwarding succeeded:

```typescript
// PHASE 1 ONLY — remove in Phase 3
const debug = searchParams.get('debug')
if (debug) {
  const forwarded = await fetch(`${appUrl}/api/contract/getAll?limit=1`, {
    headers: { Authorization: `Bearer ${clerkToken}` }
  })
  return NextResponse.json({
    debug: {
      tokenForwardingWorked: forwarded.ok,
      status: forwarded.status,
      role: userRole
    }
  })
}
```

#### Criterion 5: System Prompt Contains Role Context + Tool Definitions

**Test mechanism:**
1. The `buildSystemPrompt()` function is called in the route handler
2. Verify the prompt string includes the user's role (inspect via test that calls the function directly)
3. The `TOOL_DEFINITIONS` constant is passed to `callClaude()` (Phase 4)

#### Criterion 6: No Token Logging

**Test mechanism:**
1. Review all `console.log` / `console.error` calls in `route.ts`, `anthropicService.ts`, and any execution helpers
2. Search for pattern: `console.*clerk|console.*token|console.*session`
3. ESLint custom rule: flag any `console.*` call containing the word "token" (as a catch-all)

#### Criterion 7: Server-Only Verification

**Test mechanism:**
1. TypeScript build: `next build` completes without importing server-only files into client bundles
2. Add `import 'server-only'` to `anthropicService.ts` and `toolDefinitions.ts` — any client import causes a compile error
3. Check the build output: `src/app/api/ai-chatbot/route.ts` should appear only in the server bundle, not in the client manifest

### Test Strategy Summary

| Criterion | Test Type | Tool | Who Runs |
|-----------|-----------|------|----------|
| 1. Auth behavior | Integration | `curl` or Node.js test script | Developer |
| 2. Role resolution | Integration | `curl` + debug response | Developer |
| 3. Tool definitions | Unit | `ts-node` or TypeScript check | CI / Developer |
| 4. Auth forwarding | Integration | `curl` + test script | Developer |
| 5. System prompt | Unit | Direct function call test | Developer |
| 6. Token hygiene | Manual + ESLint | Grep + ESLint custom rule | CI |
| 7. Server-only | Build | `next build` | CI |

### Pre-Phase-2 Checklist

Before Phase 2 begins, verify:

- [ ] `src/app/api/ai-chatbot/route.ts` exists and TypeScript compiles without errors
- [ ] `src/lib/ai/anthropicService.ts` exists and exports `createAnthropicClient()`
- [ ] `src/lib/ai/toolDefinitions.ts` exists with all 10 tools
- [ ] `src/lib/roleCheck.ts` expanded with all role helper functions
- [ ] `POST /api/ai-chatbot` returns 200 with valid session, 401 without
- [ ] Clerk JWT template `gochul-fitness` is configured in Clerk Dashboard (or confirmed fallback works)
- [ ] Auth forwarding verified via curl/test script
- [ ] Zero `console.log` calls containing `token` or `clerk` in the route handler
- [ ] `next build` passes with no server-only violations

---

*Research completed: 2026-04-04*
*Ready for planning: yes*
