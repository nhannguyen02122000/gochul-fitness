# Phase 01 — Plan: Skeleton & Architecture

**phase:** 01
**slug:** skeleton-architecture
**status:** planned
**nyquist_compliant:** true
**wave_0_complete:** false
**created:** 2026-04-04

---

## Wave 0: Validation Scripts

Wave 0 creates all test infrastructure before any feature code. These scripts are the primary acceptance criteria for the phase.

### W0-A: Validation scripts

**`<read_first>`**
- `src/lib/roleCheck.ts` (current state — 2 helpers only)
- `src/lib/dbServer.ts` (server singleton pattern)
- `src/app/api/contract/getAll/route.ts` (auth + getUserSetting pattern)

**`<acceptance_criteria>`**
- `scripts/test-token-hygiene.sh` exists, is executable, and exits 0
- `scripts/test-server-only.sh` exists, is executable, and exits 0
- `scripts/test-tool-count.sh` exists, is executable, and exits 0

**`<action>`**

Create three files with the exact contents below. Run `chmod +x scripts/test-*.sh` after creation.

`scripts/test-token-hygiene.sh`:
```bash
#!/bin/bash
# Verifies no Clerk tokens or session data appear in console.log statements.
# Exit 0 = PASS (no token leakage), exit 1 = FAIL (token found)
set -e

SEARCH_PATTERN='console\.\(log\|error\|warn\).*\(token\|clerkToken\|sessionToken\|bearer\|authToken\|clerk_token\)'
FOUND=$(grep -rni "$SEARCH_PATTERN" src/app/api/ai-chatbot/ src/lib/ai/ 2>/dev/null || true)
if [ -n "$FOUND" ]; then
  echo "FAIL: Sensitive token patterns found in logs:"
  echo "$FOUND"
  exit 1
fi
echo "PASS: No token leakage patterns found"
exit 0
```

`scripts/test-server-only.sh`:
```bash
#!/bin/bash
# Verifies server-only files have the 'server-only' import guard.
# Exit 0 = PASS, exit 1 = FAIL
set -e
FILES="src/lib/ai/anthropicService.ts src/lib/ai/toolDefinitions.ts"
for f in $FILES; do
  if ! grep -q "import 'server-only'" "$f" 2>/dev/null; then
    echo "FAIL: $f missing 'import \"server-only\"'"
    exit 1
  fi
done
echo "PASS: All files have server-only guard"
exit 0
```

`scripts/test-tool-count.sh`:
```bash
#!/bin/bash
# Verifies TOOL_DEFINITIONS contains exactly 10 tools.
# Exit 0 = PASS, exit 1 = FAIL
set -e
COUNT=$(grep -c "^  name:" src/lib/ai/toolDefinitions.ts 2>/dev/null || echo "0")
if [ "$COUNT" -eq 10 ]; then
  echo "PASS: $COUNT tools found"
  exit 0
else
  echo "FAIL: Expected 10 tools, found $COUNT"
  exit 1
fi
```

---

## Wave 1: Core Library Files (parallel)

All four files are independent and can be created simultaneously.

### W1-A: Expand `src/lib/roleCheck.ts`

**`<read_first>`**
- `src/lib/roleCheck.ts` (current state: 2 helpers)
- `src/app/type/api/index.ts` (`Role` type definition at line 7)

**`<acceptance_criteria>`**
- `grep "export type Role" src/lib/roleCheck.ts` → `export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER'`
- `grep "export function isStaff" src/lib/roleCheck.ts` → exists
- `grep "export function isCustomer" src/lib/roleCheck.ts` → exists
- `grep "export function isStaffOrAdmin" src/lib/roleCheck.ts` → exists (existing)
- `grep "export function isAdminOrCustomer" src/lib/roleCheck.ts` → exists
- `grep "export function isValidRole" src/lib/roleCheck.ts` → exists
- `grep "export function requireRole" src/lib/roleCheck.ts` → exists
- `grep "import 'server-only'" src/lib/roleCheck.ts` → not present (roleCheck.ts does not need server-only guard — it's pure utility, no DB calls)
- File compiles: `npx tsc --noEmit src/lib/roleCheck.ts` exits 0

**`<action>`**

Replace the content of `src/lib/roleCheck.ts` with:

```typescript
/**
 * Role-based access control helpers for GoChul Fitness.
 * Single source of truth for all role checks across the codebase.
 * @file src/lib/roleCheck.ts
 */

import type { Role } from '@/app/type/api'

export type { Role }

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
 * Guard: returns true if role is one of the allowed roles.
 * Use for early-return patterns in API routes.
 *
 * @example
 * if (!requireRole(role, ['ADMIN'])) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 * }
 */
export function requireRole(role: string, allowed: Role[]): boolean {
  return allowed.includes(role as Role)
}
```

---

### W1-B: Create `src/lib/ai/anthropicService.ts`

**`<read_first>`**
- `docs/FEAT_AIBOT.txt` (AI client initialization pattern)
- `src/lib/dbServer.ts` (pattern for env-var initialization at module level)

**`<acceptance_criteria>`**
- `grep "import 'server-only'" src/lib/ai/anthropicService.ts` → present
- `grep "import Anthropic from '@anthropic-ai/sdk'" src/lib/ai/anthropicService.ts` → present
- `grep "createAnthropicClient" src/lib/ai/anthropicService.ts` → present (exported function)
- `grep "CLAUDE_API_KEY" src/lib/ai/anthropicService.ts` → present (used as `process.env.CLAUDE_API_KEY`)
- `grep "CLAUDE_BASE_URL" src/lib/ai/anthropicService.ts` → present (defaults to `https://api.anthropic.com`)
- `grep "MODEL_NAME" src/lib/ai/anthropicService.ts` → present (defaults to `'claude-opus-4-6'`)
- `grep "callClaudePlaceholder" src/lib/ai/anthropicService.ts` → present (Phase 1 placeholder, accepts systemPrompt + userMessage, returns Promise<string>)
- `grep "MAX_TOOL_ITERATIONS" src/lib/ai/anthropicService.ts` → absent (Phase 1 stub, not implementing loop yet)
- `grep -E "console\.(log|error|warn).*(token|clerkToken|sessionToken)" src/lib/ai/anthropicService.ts` → empty (no token logging)
- File compiles: `npx tsc --noEmit src/lib/ai/anthropicService.ts` exits 0
- `bash scripts/test-server-only.sh` → exits 0

**`<action>`**

Create `src/lib/ai/anthropicService.ts` with these exact contents:

```typescript
/**
 * Anthropic Claude SDK client wrapper for GoChul Fitness AI Chatbot.
 * Phase 1: Configured client + placeholder call (no tool-use loop yet).
 * Phase 4: Will add callClaudeWithTools() and executeTool() functions.
 * @file src/lib/ai/anthropicService.ts
 */

import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

const MODEL_NAME = process.env.MODEL_NAME ?? 'claude-opus-4-6'

/**
 * Singleton Anthropic client configured from environment variables.
 * Uses CLAUDE_BASE_URL when set (for AI router proxies), otherwise defaults to
 * the official Anthropic API endpoint.
 */
const anthropicClient = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL ?? 'https://api.anthropic.com',
})

/**
 * Creates (or returns) the configured Anthropic client.
 * Exporting this allows future injection points (e.g., mocking for tests).
 */
export function createAnthropicClient(): Anthropic {
  return anthropicClient
}

/**
 * Placeholder AI call for Phase 1 skeleton.
 *
 * Accepts a system prompt and a single user message, calls Claude, and returns
 * the text response. No tool-use loop, no multi-turn history yet — those land
 * in Phase 3 and Phase 4 respectively.
 *
 * @param systemPrompt  - Full system prompt including role context + tool descriptions
 * @param userMessage  - The user's message content
 * @returns The plain text response from Claude
 * @throws  Re-throws Anthropic API errors; callers must handle 4xx/5xx gracefully
 *
 * @example
 * const reply = await callClaudePlaceholder(
 *   buildSystemPrompt('ADMIN', 'John Doe', 'inst_123'),
 *   'List my contracts'
 * )
 */
export async function callClaudePlaceholder(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await anthropicClient.messages.create({
    model: MODEL_NAME,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textContent = response.content.find(
    (block) => block.type === 'text'
  )

  if (!textContent || textContent.type !== 'text') {
    return ''
  }

  return textContent.text
}
```

---

### W1-C: Create `src/lib/ai/toolDefinitions.ts`

**`<read_first>`**
- `docs/PROGRAM.md` §§3, 4 (RBAC matrix, API routes, contract/history types)
- `src/app/type/api/index.ts` (`ContractKind`, `HistoryStatus` type aliases)

**`<acceptance_criteria>`**
- `grep "import 'server-only'" src/lib/ai/toolDefinitions.ts` → present
- `grep "^export const TOOL_DEFINITIONS" src/lib/ai/toolDefinitions.ts` → present
- `bash scripts/test-tool-count.sh` → exits 0 (10 tools confirmed)
- `grep "name: 'get_contracts'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'create_contract'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'update_contract_status'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'update_contract'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'delete_contract'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'get_sessions'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'create_session'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'update_session'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'update_session_status'" src/lib/ai/toolDefinitions.ts` → present
- `grep "name: 'update_session_note'" src/lib/ai/toolDefinitions.ts` → present
- `grep "ADMIN.*STAFF.*CUSTOMER" src/lib/ai/toolDefinitions.ts` → role permission table in file header comment
- File compiles: `npx tsc --noEmit src/lib/ai/toolDefinitions.ts` exits 0
- `bash scripts/test-server-only.sh` → exits 0

**`<action>`**

Create `src/lib/ai/toolDefinitions.ts`. The 10 tools use Anthropic's `tool_use` schema format (`name`, `description`, `input_schema`). Per-role scoping is documented in file-header JSDoc comments. Each tool's `description` field encodes role restrictions inline so the AI has full context.

```typescript
/**
 * GoChul Fitness AI Chatbot — Tool Definitions
 *
 * Phase 1: All 10 GoChul API endpoints defined as Anthropic tool_use objects.
 * Phase 4: TOOL_DEFINITIONS is passed to anthropicClient.messages.create({ tools }).
 *
 * ══════════════════════════════════════════════════════════════
 * ROLE PERMISSIONS SUMMARY
 * ══════════════════════════════════════════════════════════════
 * Tool                    │ ADMIN │ STAFF │ CUSTOMER │
 * ─────────────────────────┼───────┼───────┼──────────┤
 * get_contracts           │   ✅  │   ✅  │    ✅    │
 * create_contract         │   ✅  │   ✅  │    ❌    │
 * update_contract         │   ✅  │   ❌  │    ❌    │
 * delete_contract         │   ✅  │   ❌  │    ❌    │
 * update_contract_status  │   ✅  │  ⚠️   │   ⚠️    │
 * get_sessions            │   ✅  │   ✅  │    ✅    │
 * create_session          │   ✅  │   ✅  │   ⚠️    │
 * update_session          │   ✅  │  ⚠️  │   ⚠️    │
 * update_session_status   │   ✅  │   ✅  │    ✅    │
 * update_session_note     │   ✅  │  ⚠️  │   ⚠️    │
 *
 * ⚠️ = limited (see description)
 *
 * The API layer is the authoritative enforcement gate. The AI uses this matrix
 * in the system prompt (hybrid approach — D-02) to give contextually accurate
 * error messages and ask appropriate follow-up questions.
 *
 * @file src/lib/ai/toolDefinitions.ts
 */

import 'server-only'

// Convenience alias matching the Anthropic SDK type
type Tool = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. get_contracts
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: all contracts
// STAFF: contracts where sale_by = their InstantDB user ID
// CUSTOMER: contracts where purchased_by = their InstantDB user ID (NEWLY_CREATED excluded)

export const get_contracts: Tool = {
  name: 'get_contracts',
  description:
    'List gym contracts. Returns contracts filtered by the calling user role ' +
    '(ADMIN sees all, STAFF sees their own sales, CUSTOMER sees their own purchases). ' +
    'Supports pagination, status filtering, kind filtering, and date range filtering.',
  input_schema: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Page number (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Items per page (default: 10, max: 50)',
      },
      statuses: {
        type: 'string',
        description:
          'Comma-separated list of contract statuses. ' +
          'Valid values: NEWLY_CREATED, CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, ' +
          'CUSTOMER_PAID, PT_CONFIRMED, ACTIVE, CANCELED, EXPIRED. ' +
          'CUSTOMER role cannot request NEWLY_CREATED status.',
      },
      kind: {
        type: 'string',
        description:
          'Contract kind filter. Values: PT (Personal Training), ' +
          'REHAB (Rehabilitation), PT_MONTHLY (Monthly PT)',
        enum: ['PT', 'REHAB', 'PT_MONTHLY'],
      },
      start_date: {
        type: 'number',
        description: 'Filter contracts starting on or after this Unix timestamp (ms)',
      },
      end_date: {
        type: 'number',
        description: 'Filter contracts starting on or before this Unix timestamp (ms)',
      },
      sale_by_name: {
        type: 'string',
        description: 'Search by trainer/PT name (ADMIN/CUSTOMER only)',
      },
      purchased_by_name: {
        type: 'string',
        description: 'Search by customer name (ADMIN/STAFF only)',
      },
    },
    required: [],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. create_contract
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: ✅ create for any customer
// STAFF: ✅ create for any customer
// CUSTOMER: ❌ forbidden — returns HTTP 403

export const create_contract: Tool = {
  name: 'create_contract',
  description:
    'Create a new gym contract. Only ADMIN and STAFF roles can create contracts. ' +
    'The contract is created with status NEWLY_CREATED and sale_by set to the ' +
    'authenticated user. Returns the created contract object.',
  input_schema: {
    type: 'object',
    properties: {
      purchased_by: {
        type: 'string',
        description: 'InstantDB $users.id of the customer (required)',
      },
      kind: {
        type: 'string',
        description: 'Contract type (required)',
        enum: ['PT', 'REHAB', 'PT_MONTHLY'],
      },
      credits: {
        type: 'number',
        description: 'Number of sessions (PT/REHAB only; PT_MONTHLY does not use credits)',
      },
      duration_per_session: {
        type: 'number',
        description: 'Minutes per session (15–180, must be divisible by 15)',
      },
      money: {
        type: 'number',
        description: 'Contract price in VND (required)',
      },
      start_date: {
        type: 'number',
        description: 'Contract start date as Unix timestamp (ms)',
      },
      end_date: {
        type: 'number',
        description: 'Contract end date as Unix timestamp (ms, required)',
      },
    },
    required: ['purchased_by', 'kind', 'money', 'end_date'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. update_contract_status
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: can force-set most transitions (see PROGRAM.md §4.2)
// STAFF: NEWLY_CREATED→CUSTOMER_REVIEW, CUSTOMER_PAID→PT_CONFIRMED, limited cancels
// CUSTOMER: limited workflow transitions on own contracts only

export const update_contract_status: Tool = {
  name: 'update_contract_status',
  description:
    'Update the status of a gym contract (workflow transitions). ' +
    'ADMIN: can force-set most valid transitions. ' +
    'STAFF: NEWLY_CREATED→CUSTOMER_REVIEW, CUSTOMER_PAID→PT_CONFIRMED, limited cancels. ' +
    'CUSTOMER: CUSTOMER_REVIEW→CUSTOMER_CONFIRMED/CANCELED, ' +
    'CUSTOMER_CONFIRMED→CUSTOMER_PAID/CANCELED, PT_CONFIRMED→ACTIVE. ' +
    'ACTIVE contracts cannot be canceled by STAFF or CUSTOMER.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'InstantDB contract ID (required)',
      },
      status: {
        type: 'string',
        description:
          'New status value. Valid transitions depend on current status and role. ' +
          'Values: CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, ' +
          'PT_CONFIRMED, ACTIVE, CANCELED, EXPIRED.',
        enum: [
          'CUSTOMER_REVIEW',
          'CUSTOMER_CONFIRMED',
          'CUSTOMER_PAID',
          'PT_CONFIRMED',
          'ACTIVE',
          'CANCELED',
          'EXPIRED',
        ],
      },
    },
    required: ['contract_id', 'status'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. update_contract
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN only. Updates contract fields (not status).
// STAFF/CUSTOMER: HTTP 403

export const update_contract: Tool = {
  name: 'update_contract',
  description:
    'Update contract fields (not status). ADMIN role only. ' +
    'Can update: kind, credits, duration_per_session, money, start_date, end_date.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'InstantDB contract ID (required)',
      },
      kind: {
        type: 'string',
        description: 'Contract type',
        enum: ['PT', 'REHAB', 'PT_MONTHLY'],
      },
      credits: {
        type: 'number',
        description: 'Number of sessions',
      },
      duration_per_session: {
        type: 'number',
        description: 'Minutes per session (15–180, divisible by 15)',
      },
      money: {
        type: 'number',
        description: 'Contract price in VND',
      },
      start_date: {
        type: 'number',
        description: 'Contract start date as Unix timestamp (ms)',
      },
      end_date: {
        type: 'number',
        description: 'Contract end date as Unix timestamp (ms)',
      },
    },
    required: ['contract_id'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. delete_contract
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN only. Soft-deletes by setting status to CANCELED.
// STAFF/CUSTOMER: HTTP 403

export const delete_contract: Tool = {
  name: 'delete_contract',
  description:
    'Cancel (soft-delete) a contract by setting its status to CANCELED. ' +
    'ADMIN role only. Note: ACTIVE contracts cannot be deleted; ' +
    'use update_contract_status with CANCELED instead.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'InstantDB contract ID (required)',
      },
    },
    required: ['contract_id'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. get_sessions
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: all sessions
// STAFF: sessions they created (historyUser link)
// CUSTOMER: sessions from their own purchased contracts

export const get_sessions: Tool = {
  name: 'get_sessions',
  description:
    'List all training sessions (history). Returns sessions filtered by role. ' +
    'ADMIN sees all sessions; STAFF sees their own; CUSTOMER sees sessions from their contracts. ' +
    'Supports pagination, status/date filtering, and trainer/customer name search.',
  input_schema: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Page number (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Items per page (default: 10, max: 50)',
      },
      statuses: {
        type: 'string',
        description:
          'Comma-separated list of session statuses. ' +
          'Valid values: NEWLY_CREATED, CHECKED_IN, CANCELED, EXPIRED',
      },
      start_date: {
        type: 'number',
        description: 'Filter sessions on or after this Unix timestamp (ms)',
      },
      end_date: {
        type: 'number',
        description: 'Filter sessions on or before this Unix timestamp (ms)',
      },
      teach_by_name: {
        type: 'string',
        description: 'Search by trainer name',
      },
      customer_name: {
        type: 'string',
        description: 'Search by customer name',
      },
      from_minute: {
        type: 'number',
        description: 'Filter sessions starting at or after this minute of day (0–1440)',
      },
      to_minute: {
        type: 'number',
        description: 'Filter sessions starting at or before this minute of day (0–1440)',
      },
    },
    required: [],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. create_session
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: no restrictions
// STAFF: no restrictions
// CUSTOMER: can only create for contracts they purchased
// Additional constraints: contract must be ACTIVE, not expired, no time overlap,
// credits available (PT/REHAB). Duration must match contract.duration_per_session.

export const create_session: Tool = {
  name: 'create_session',
  description:
    'Book a new training session. ' +
    'ADMIN/STAFF: no restrictions. CUSTOMER: can only create for their own contracts. ' +
    'Additional constraints: contract must be ACTIVE and not expired, ' +
    'no time overlap with existing sessions by the same trainer, ' +
    'credits must be available for PT/REHAB contracts.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'InstantDB contract ID of the contract to book against (required)',
      },
      date: {
        type: 'number',
        description:
          'Session date as Unix timestamp (ms, day only — time component is ignored) (required)',
      },
      from: {
        type: 'number',
        description:
          'Start minute of the session (0–1440, e.g., 480 = 8:00 AM) (required)',
      },
      to: {
        type: 'number',
        description:
          'End minute of the session (0–1440, must be after `from`) (required)',
      },
      teach_by: {
        type: 'string',
        description: 'InstantDB $users.id of the trainer (required)',
      },
    },
    required: ['contract_id', 'date', 'from', 'to', 'teach_by'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. update_session
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: any session
// STAFF: sessions they created
// CUSTOMER: sessions from contracts they purchased
// Cannot update CHECKED_IN, CANCELED, or EXPIRED sessions.

export const update_session: Tool = {
  name: 'update_session',
  description:
    'Update a training session (date, time, or trainer). Reschedules a session. ' +
    'ADMIN: any session. STAFF: sessions they created. CUSTOMER: sessions from their contracts. ' +
    'Cannot update CHECKED_IN, CANCELED, or EXPIRED sessions.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: {
        type: 'string',
        description: 'InstantDB history/session ID (required)',
      },
      date: {
        type: 'number',
        description: 'New session date as Unix timestamp (ms, day only)',
      },
      from: {
        type: 'number',
        description: 'New start minute (0–1440)',
      },
      to: {
        type: 'number',
        description: 'New end minute (0–1440)',
      },
      teach_by: {
        type: 'string',
        description: 'New trainer InstantDB $users.id',
      },
    },
    required: ['history_id'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. update_session_status
// ─────────────────────────────────────────────────────────────────────────────
// Dual check-in system: both customer and staff must check in → status CHECKED_IN.
// Cancel (NEWLY_CREATED→CANCELED) allowed for any role on NEWLY_CREATED sessions.
// EXPIRED sessions cannot be updated.

export const update_session_status: Tool = {
  name: 'update_session_status',
  description:
    'Update a session status: check in a customer (NEWLY_CREATED→CHECKED_IN) or ' +
    'cancel a session (NEWLY_CREATED→CANCELED). ' +
    'Dual check-in: CUSTOMER sets user_check_in_time, STAFF/ADMIN sets staff_check_in_time. ' +
    'Both timestamps must be set → status becomes CHECKED_IN. ' +
    'Cancel is only allowed for NEWLY_CREATED sessions. EXPIRED sessions cannot be updated.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: {
        type: 'string',
        description: 'InstantDB history/session ID (required)',
      },
      action: {
        type: 'string',
        description:
          'Action to perform. "check_in": set the calling party\'s check-in timestamp. ' +
          '"cancel": cancel the session (NEWLY_CREATED only).',
        enum: ['check_in', 'cancel'],
      },
    },
    required: ['history_id', 'action'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. update_session_note
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: can update any session note
// STAFF: can update staff_note for sessions where teach_by matches their user ID
// CUSTOMER: can update customer_note for sessions from contracts they purchased

export const update_session_note: Tool = {
  name: 'update_session_note',
  description:
    'Add or update a note on a training session. ' +
    'STAFF/ADMIN can update staff_note; CUSTOMER can update customer_note. ' +
    'STAFF can only update notes for sessions where teach_by matches their user ID.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: {
        type: 'string',
        description: 'InstantDB history/session ID (required)',
      },
      note: {
        type: 'string',
        description: 'Note text to set (required)',
      },
    },
    required: ['history_id', 'note'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL_DEFINITIONS — ordered array of all 10 tools
// ─────────────────────────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS: Tool[] = [
  get_contracts,
  create_contract,
  update_contract_status,
  update_contract,
  delete_contract,
  get_sessions,
  create_session,
  update_session,
  update_session_status,
  update_session_note,
]
```

---

### W1-D: Create `src/lib/ai/systemPrompt.ts`

**`<read_first>`**
- `docs/FEAT_AIBOT.txt` (Vietnamese time rules, AI behavior)
- `src/lib/ai/toolDefinitions.ts` (role permission table — referenced verbatim)

**`<acceptance_criteria>`**
- `grep "export function buildSystemPrompt" src/lib/ai/systemPrompt.ts` → present
- `grep "export type SystemPromptInput" src/lib/ai/systemPrompt.ts` → present
- `grep "ROLE PERMISSIONS" src/lib/ai/systemPrompt.ts` → present (section heading)
- `grep "TIME CONVENTIONS" src/lib/ai/systemPrompt.ts` → present (section heading)
- `grep "BEHAVIOR RULES" src/lib/ai/systemPrompt.ts` → present (section heading)
- `grep "Vietnam.*UTC+7\|Asia/Ho_Chi_Minh" src/lib/ai/systemPrompt.ts` → present (timezone context)
- `grep "sáng.*chiều.*tối.*đêm" src/lib/ai/systemPrompt.ts` → present (all 4 time windows)
- `grep "hôm nay.*ngày mai.*thứ" src/lib/ai/systemPrompt.ts` → present (date inference rules)
- `grep "sáng.*00:00.*11:59" src/lib/ai/systemPrompt.ts` → present
- `grep "chiều.*12:00.*14:59" src/lib/ai/systemPrompt.ts` → present
- `grep "tối.*15:00.*17:59" src/lib/ai/systemPrompt.ts` → present
- `grep "đêm.*18:00.*23:59" src/lib/ai/systemPrompt.ts` → present
- `grep "same language.*Vietnamese.*English" src/lib/ai/systemPrompt.ts` → present (language rule)
- `grep "MAX_TOOL_ITERATIONS\|10.*iteration\|prevent runaway" src/lib/ai/systemPrompt.ts` → present
- File compiles: `npx tsc --noEmit src/lib/ai/systemPrompt.ts` exits 0

**`<action>`**

Create `src/lib/ai/systemPrompt.ts`:

```typescript
/**
 * System prompt builder for GoChul Fitness AI Chatbot.
 *
 * Assembles the full system prompt string injected into Claude for every
 * chatbot request. Includes: role context, RBAC matrix, Vietnamese time
 * conventions, behavior rules, and tool overview.
 *
 * Phase 1: buildSystemPrompt() is called in the route handler with role + user info.
 * Phase 4: TOOL_DEFINITIONS descriptions supplement this prompt.
 *
 * @file src/lib/ai/systemPrompt.ts
 */

import 'server-only'
import type { Role } from '@/app/type/api'

export type SystemPromptInput = {
  role: Role
  userName: string
  userInstantId: string
}

function getServerDateVietnam(): string {
  return new Date().toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Builds the complete system prompt for the GoChul Fitness chatbot.
 *
 * @param input.role          - The calling user's role (ADMIN | STAFF | CUSTOMER)
 * @param input.userName      - The calling user's display name
 * @param input.userInstantId - The user's InstantDB $users.id
 * @returns A full system prompt string for Claude
 */
export function buildSystemPrompt(input: SystemPromptInput): string {
  const { role, userName, userInstantId } = input
  const serverDate = getServerDateVietnam()

  return `
You are an AI assistant for the GoChul Fitness gym management app.
You help users manage their gym contracts and training sessions through
natural conversation — in English or Vietnamese.

You are currently helping a ${role} user: ${userName}
User InstantDB ID: ${userInstantId}
Role: ${role}

## ROLE PERMISSIONS

You operate within strict role boundaries. The API enforces permissions as a
safety net, but you must understand and respect these limits:

ADMIN:
- Can view, create, update, and delete all contracts and sessions.
- Can update contract fields and force-expire contracts.
- Cannot impersonate another user.

STAFF:
- Can create contracts and manage sessions they created.
- Can view contracts where they are the assigned trainer (sale_by).
- Can update limited contract statuses: NEWLY_CREATED→CUSTOMER_REVIEW,
  CUSTOMER_PAID→PT_CONFIRMED.
- Cannot update contract fields or delete contracts.
- Cannot update notes on sessions where they are not the trainer (teach_by).

CUSTOMER:
- Can only view and act on contracts they purchased (purchased_by).
- Cannot create contracts, update contract fields, or delete contracts.
- Can only update notes on sessions from their own contracts (customer_note).

SPECIFIC RESTRICTIONS:
- CUSTOMER cannot create contracts — explain this politely if asked.
- STAFF cannot update contract fields or delete contracts.
- ACTIVE contracts cannot be canceled by STAFF or CUSTOMER — only ADMIN can force-cancel.
- CUSTOMER cannot see NEWLY_CREATED contracts.
- Always check whether the user has permission before attempting a write action.

## TIME CONVENTIONS (Vietnam / UTC+7)

All times are interpreted in Ho Chi Minh City timezone (UTC+7).
Current server date (Vietnam): ${serverDate}

Time-of-day windows:
- "sáng" (morning):       00:00–11:59  (12-hour: 12:00 AM–11:59 AM)
- "chiều" (afternoon):   12:00–14:59  (12-hour: 12:00 PM–2:59 PM)
- "tối" (evening):       15:00–17:59  (12-hour: 3:00 PM–5:59 PM)
- "đêm" (night):         18:00–23:59  (12-hour: 6:00 PM–11:59 PM)

Date inference rules:
- "hôm nay" = today
- "ngày mai" = tomorrow
- "thứ X" (e.g., "thứ 6") = the next occurrence of that weekday
- Always use the current server date as the anchor when inferring dates.
- When user provides a time without a date, ask for clarification or default to "sáng".
- When user provides a date without a time, ask for clarification or default to "sáng".
- Convert 24h time to 12-hour format with period (e.g., "13:00" → "1:00 chiều").

## AVAILABLE TOOLS

You have access to the following tools to interact with the GoChul Fitness app.
Use these tools to fulfill user requests — do not make up information.
If you need more information to call a tool (missing required parameters), ask the user.
If a tool returns a permission error, translate it to a friendly message in the user's language.
If a tool returns a validation error, explain the issue clearly and suggest a fix.

TOOL OVERVIEW (full schemas passed separately to the model):
1. get_contracts       — List gym contracts
2. create_contract     — Create a new contract (ADMIN/STAFF only)
3. update_contract_status — Change contract workflow status
4. update_contract    — Update contract fields (ADMIN only)
5. delete_contract     — Cancel a contract (ADMIN only)
6. get_sessions        — List training sessions
7. create_session      — Book a new training session
8. update_session      — Reschedule a session
9. update_session_status — Check in or cancel a session
10. update_session_note  — Add/update a session note

## LANGUAGE RULE

You MUST respond in the same language the user uses.
- User writes in Vietnamese → respond in Vietnamese.
- User writes in English → respond in English.
- If the language is unclear, default to the language of the user's latest message.

## BEHAVIOR RULES

1. Ask for missing required parameters before calling any tool.
2. Confirm the user's intent before executing write operations (create, update, delete).
3. If a tool call returns an error, translate it to a user-friendly message in the user's language.
4. If the user does not have permission for an action, explain this clearly and politely.
5. Maximum 10 tool call iterations per conversation turn to prevent runaway loops.
6. Do not make up data — always use tool calls to get or modify information.
7. Format structured results (contract lists, session info) as clear, readable text.
`.trim()
}
```

---

## Wave 2: API Route Handler

### W2-A: Create `src/app/api/ai-chatbot/route.ts`

**`<read_first>`**
- `src/app/api/contract/getAll/route.ts` (auth + getUserSetting + role pattern to replicate)
- `src/lib/ai/anthropicService.ts` (W1-B output — callClaudePlaceholder)
- `src/lib/ai/systemPrompt.ts` (W1-D output — buildSystemPrompt)
- `src/lib/roleCheck.ts` (W1-A output — requireRole helper)

**`<acceptance_criteria>`**
- `grep "import { auth } from '@clerk/nextjs/server'" src/app/api/ai-chatbot/route.ts` → present
- `grep "export const dynamic = 'force-dynamic'" src/app/api/ai-chatbot/route.ts` → present
- `grep "export async function POST" src/app/api/ai-chatbot/route.ts` → present
- `grep "const authCtx = await auth()" src/app/api/ai-chatbot/route.ts` → present
- `grep "401.*Unauthorized" src/app/api/ai-chatbot/route.ts` → present (returns 401 when not logged in)
- `grep "getUserSetting" src/app/api/ai-chatbot/route.ts` → present (instantServer.query call)
- `grep "buildSystemPrompt" src/app/api/ai-chatbot/route.ts` → present
- `grep "callClaudePlaceholder" src/app/api/ai-chatbot/route.ts` → present (Phase 1 placeholder)
- `grep "TOOL_DEFINITIONS" src/app/api/ai-chatbot/route.ts` → absent (Phase 1, not passed to AI yet)
- `grep -E "console\.(log|error|warn).*(token|clerkToken|sessionToken|clerk_token)" src/app/api/ai-chatbot/route.ts` → empty
- `grep "console.error" src/app/api/ai-chatbot/route.ts` → present (for API error logging, no token values)
- `grep "getToken.*template.*gochul-fitness" src/app/api/ai-chatbot/route.ts` → present (D-01: Clerk scoped token)
- `grep "NextResponse.json" src/app/api/ai-chatbot/route.ts` → present (all responses use NextResponse.json)
- File compiles: `npx tsc --noEmit src/app/api/ai-chatbot/route.ts` exits 0
- `bash scripts/test-token-hygiene.sh` → exits 0

**`<action>`**

Create the file `src/app/api/ai-chatbot/route.ts` (the directory `src/app/api/ai-chatbot/` must be created first):

```typescript
/**
 * POST /api/ai-chatbot — GoChul Fitness AI Chatbot route handler.
 *
 * Phase 1: Verifies auth (401 without session), resolves user role,
 * builds system prompt, returns a placeholder AI response.
 * Phase 3: Accepts messages[] array, returns bot response.
 * Phase 4: Implements tool-use loop with TOOL_DEFINITIONS.
 *
 * Auth: Clerk session cookie → auth() → getUserSetting() → role.
 * Token forwarding: getToken({ template: 'gochul-fitness' }) → forwarded as
 *   Authorization: Bearer <token> to GoChul API routes (Phase 4 execution).
 *
 * @file src/app/api/ai-chatbot/route.ts
 */

import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/lib/ai/systemPrompt'
import { callClaudePlaceholder } from '@/lib/ai/anthropicService'
import { requireRole } from '@/lib/roleCheck'
import type { Role } from '@/app/type/api'

// Disable Next.js caching — this route must always run fresh
export const dynamic = 'force-dynamic'
export const revalidate = 0

type AIChatRequestBody = {
  /** The user's latest message text */
  message: string
  /** Phase 3+: Full conversation history [{role: 'user'|'assistant', content: string}] */
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(request: Request) {
  // ── 1. Authenticate via Clerk session cookie ─────────────────────────────────
  const authCtx = await auth()
  const { userId } = authCtx

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized — please sign in to use the chatbot' },
      { status: 401 }
    )
  }

  // ── 2. Parse request body ─────────────────────────────────────────────────────
  let body: AIChatRequestBody
  try {
    body = (await request.json()) as AIChatRequestBody
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body — expected JSON with { message: string }' },
      { status: 400 }
    )
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: message (string)' },
      { status: 400 }
    )
  }

  // ── 3. Resolve user role via InstantDB user_setting ──────────────────────────
  let userRole: Role
  let userInstantId: string
  let userName: string

  try {
    const userData = await instantServer.query({
      user_setting: {
        $: {
          where: {
            clerk_id: userId
          }
        },
        users: {}
      }
    })

    const userSetting = userData.user_setting[0]

    if (!userSetting) {
      return NextResponse.json(
        { error: 'User settings not found — please complete onboarding' },
        { status: 404 }
      )
    }

    const rawRole = userSetting.role
    if (!requireRole(rawRole, ['ADMIN', 'STAFF', 'CUSTOMER'])) {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 }
      )
    }

    userRole = rawRole as Role
    userInstantId = userSetting.users?.[0]?.id ?? ''
    userName = [userSetting.first_name, userSetting.last_name]
      .filter(Boolean)
      .join(' ') || userId
  } catch (error) {
    console.error('Error resolving user role:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to resolve user session — please try again' },
      { status: 500 }
    )
  }

  // ── 4. (Phase 1 stub) Get Clerk scoped token for downstream API forwarding ────
  // D-01: Clerk JWT template 'gochul-fitness' must be configured in Clerk Dashboard.
  // If the template is missing, getToken returns null and we fall back to same-origin
  // cookie forwarding (automatic for internal fetch calls within the same Next.js app).
  // The token is stored in a local variable — it is NEVER logged or sent to Anthropic.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clerkToken: string | null = await authCtx.getToken({ template: 'gochul-fitness' })

  // ── 5. Build system prompt ────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    role: userRole,
    userName,
    userInstantId,
  })

  // ── 6. (Phase 1 placeholder) Call Claude ────────────────────────────────────
  // Phase 1: single-turn placeholder — no tools, no history.
  // Phase 3: pass messages[] history to callClaudeWithHistory().
  // Phase 4: implement tool-use loop with executeTool() calls.
  let botReply: string
  try {
    botReply = await callClaudePlaceholder(systemPrompt, body.message)
  } catch (error) {
    console.error(
      'Anthropic API error:',
      error instanceof Error ? error.message : String(error)
    )
    return NextResponse.json(
      {
        error:
          'AI service temporarily unavailable — please try again in a moment'
      },
      { status: 502 }
    )
  }

  // ── 7. Debug probe: ?debug=auth exercises Clerk token forwarding via internal API call
  //   This is a Phase 1-only test path to verify auth forwarding works before tool execution
  //   is implemented in Phase 4. Remove this block when Phase 4 lands.
  // ─────────────────────────────────────────────────────────────────────────────────
  const url = new URL(request.url)
  if (url.searchParams.get('debug') === 'auth') {
    // Proxy through GET /api/contract/getAll with the forwarded Clerk token
    try {
      const apiResponse = await fetch(
        new URL('/api/contract/getAll', request.url).toString(),
        {
          headers: {
            ...(clerkToken
              ? { Authorization: `Bearer ${clerkToken}` }
              : {}),
            'Content-Type': 'application/json',
          },
        }
      )
      const apiBody = await apiResponse.json()
      return NextResponse.json(
        {
          debug: 'auth',
          apiStatus: apiResponse.status,
          apiBody,
          clerkTokenPresent: clerkToken !== null,
        },
        {
          status: apiResponse.status,
        }
      )
    } catch (err) {
      return NextResponse.json(
        { debug: 'auth', error: 'Internal fetch failed', detail: String(err) },
        { status: 502 }
      )
    }
  }

  // ── 8. Return response ───────────────────────────────────────────────────────
  return NextResponse.json({
    reply: botReply,
    role: userRole,
    // Phase 3+: include conversation context for multi-turn
    messages: [
      ...(body.messages ?? []),
      { role: 'user' as const, content: body.message },
      { role: 'assistant' as const, content: botReply },
    ],
  })
}
```

---

## Wave 3: Clerk Dashboard Setup Note + Final Verification

### W3-A: Document Clerk JWT template setup requirement

**`<read_first>`**
- `01-RESEARCH.md` §8 (Clerk Middleware Considerations — out-of-band setup)
- `01-CONTEXT.md` D-01 (decision to use getToken template approach)

**`<acceptance_criteria>`**
- `docs/CLERK_JWT_SETUP.md` exists in the project root
- `grep "gochul-fitness" docs/CLERK_JWT_SETUP.md` → present (template name)
- `grep "5.*minute\|short-lived\|JWT template" docs/CLERK_JWT_SETUP.md` → present (token lifetime note)
- `grep "Clerk Dashboard.*JWT Templates\|clerk.com" docs/CLERK_JWT_SETUP.md` → present (setup URL)

**`<action>`**

Create `docs/CLERK_JWT_SETUP.md`:

```markdown
# Clerk JWT Template Setup — gochul-fitness

> **Required for AI chatbot auth forwarding.** Complete this step before testing
> the chatbot in production or with token-forwarding flows.

## Why This Is Needed

The AI chatbot route (`POST /api/ai-chatbot`) uses Clerk scoped tokens to
forward authentication to GoChul API routes when executing tool calls in Phase 4.

Decision D-01 specifies: `getToken({ template: 'gochul-fitness' })`
— a short-lived JWT issued by Clerk, scoped to this application.

## Setup Steps

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → your application
2. Navigate to **Configure → JWT Templates**
3. Click **New template → Empty template**
4. Configure:
   - **Name**: `gochul-fitness`
   - **Token lifetime**: `5 minutes` (short-lived — enough for a single tool call chain)
   - **Claims**: ensure `sub` (user ID) and `sid` (session ID) are included
   - Leave all other options at defaults
5. Save the template

## What Happens If Not Configured

`getToken({ template: 'gochul-fitness' })` returns `null`.
The chatbot route handles this gracefully — it falls back to same-origin
cookie forwarding for internal GoChul API calls (automatic in Next.js).

However, **short-lived scoped tokens are recommended** for:
- Minimizing blast radius if a token is leaked
- Better auditability of bot-initiated API calls
- Supporting cross-service tool execution in future phases

## Verification

After setup, verify the template works:

```bash
# Sign in to the app, then from the browser console run:
Clerk.session.getToken({ template: 'gochul-fitness' }).then(console.log)
# Should return a JWT string (eyJhbG...), not null
```

If the output is `null`, the template name or configuration is incorrect.

## Troubleshooting

| Symptom | Likely Cause |
|---------|-------------|
| `getToken()` returns `null` | Template name mismatch (check spelling: `gochul-fitness`) |
| 401 from internal API calls | Token forwarding not set up; same-origin fallback not working |
| Token rejected by GoChul routes | GoChul API routes may need update to verify forwarded JWT (Phase 4) |
```

---

## Wave 4: Integration & Acceptance Tests

### W4-A: `scripts/test-phase1-auth.sh` — HTTP 200/401 + role resolution

**`<read_first>`**
- `src/app/api/ai-chatbot/route.ts` (W2-A output)
- `src/lib/roleCheck.ts` (W1-A output)

**`<acceptance_criteria>`**
- `scripts/test-phase1-auth.sh` exists and is executable
- Script exits 0 when run against a running dev server with a valid Clerk session cookie
- Script tests:
  1. `curl -X POST http://localhost:3000/api/ai-chatbot -d '{"message":"hello"}'` → HTTP 401
  2. Same with valid Clerk session cookie → HTTP 200 + JSON body with `reply` field
  3. Response JSON contains `role` field with one of `ADMIN|STAFF|CUSTOMER`
- Script includes comments explaining each test case

**`<action>`**

Create `scripts/test-phase1-auth.sh`:
```bash
#!/bin/bash
# Phase 1 acceptance: AI chatbot route auth + role resolution
# Tests:
#   1. Unauthenticated request → HTTP 401
#   2. Authenticated request → HTTP 200 + JSON with reply + role
#   3. ?debug=auth probe → HTTP 200 with apiStatus + clerkTokenPresent fields
#
# Prerequisites:
#   - Next.js dev server running on localhost:3000
#   - Clerk JWT template 'gochul-fitness' configured in Clerk Dashboard
#     (see docs/CLERK_JWT_SETUP.md)
#   - For authenticated tests (2 & 3): a Clerk session token is required.
#     Cookie name: __session (cookie-based sessions) or __clerk_db_jwt (JWT sessions).
#
# Usage:
#   bash scripts/test-phase1-auth.sh [CLERK_SESSION_TOKEN]

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
ENDPOINT="/api/ai-chatbot"
TOKEN="${1:-}"

echo "=== Phase 1 Auth Test ==="
echo "Base URL: $BASE_URL"
echo ""

# ── Test 1: Unauthenticated request ─────────────────────────────────────────
echo "[Test 1] Unauthenticated request → expect HTTP 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}')

if [ "$STATUS" -eq 401 ]; then
  echo "  PASS: Got HTTP $STATUS (expected 401)"
else
  echo "  FAIL: Got HTTP $STATUS (expected 401)"
  exit 1
fi
echo ""

# ── Test 2: Authenticated request (requires token) ────────────────────────────
if [ -z "$TOKEN" ]; then
  echo "[Test 2] SKIPPED: No Clerk session token provided"
  echo "  To test authenticated path, run:"
  echo "    bash scripts/test-phase1-auth.sh '<CLERK_SESSION_TOKEN>'"
  echo "  You can get a token via Clerk's browser console:"
  echo "    Clerk.session.getToken().then(console.log)"
  echo ""
  echo "[Test 3] SKIPPED: debug=auth probe requires token"
else
  echo "[Test 2] Authenticated request → expect HTTP 200 + JSON reply + role"
  # Single curl with -w to capture both body and status in one call
  RESPONSE=$(curl -s -w "\n__HTTP_STATUS__:%{http_code}" \
    -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Cookie: __session=$TOKEN" \
    -d '{"message":"hello"}')

  HTTP_STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")

  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "  PASS: Got HTTP $HTTP_STATUS"

    # Verify response is valid JSON with 'reply' field
    if echo "$BODY" | grep -q '"reply"'; then
      echo "  PASS: Response contains 'reply' field"
    else
      echo "  FAIL: Response missing 'reply' field"
      echo "  Response: $BODY"
      exit 1
    fi

    # Verify response contains 'role' field
    if echo "$BODY" | grep -q '"role"'; then
      ROLE=$(echo "$BODY" | grep -o '"role":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo "  PASS: Response contains role = '$ROLE'"
      if [[ "$ROLE" == "ADMIN" || "$ROLE" == "STAFF" || "$ROLE" == "CUSTOMER" ]]; then
        echo "  PASS: Role is valid (ADMIN|STAFF|CUSTOMER)"
      else
        echo "  FAIL: Role is not a valid value: '$ROLE'"
        exit 1
      fi
    else
      echo "  FAIL: Response missing 'role' field"
      exit 1
    fi
  else
    echo "  FAIL: Got HTTP $HTTP_STATUS (expected 200)"
    echo "  Response: $BODY"
    exit 1
  fi
  echo ""

  # ── Test 3: debug=auth probe (Phase 1 proxy for Criterion 4) ────────────────
  # Verifies Clerk token forwarding works by calling /api/contract/getAll internally.
  # This exercises the same code path Phase 4 tool execution will use.
  # Remove this test block when Phase 4 is implemented.
  echo "[Test 3] debug=auth probe → expect HTTP 200 with apiStatus + clerkTokenPresent"
  DEBUG_RESP=$(curl -s -w "\n__HTTP_STATUS__:%{http_code}" \
    -X POST "$BASE_URL$ENDPOINT?debug=auth" \
    -H "Content-Type: application/json" \
    -H "Cookie: __session=$TOKEN" \
    -d '{"message":"hello"}')

  DEBUG_STATUS=$(echo "$DEBUG_RESP" | grep "__HTTP_STATUS__" | cut -d: -f2)
  DEBUG_BODY=$(echo "$DEBUG_RESP" | grep -v "__HTTP_STATUS__")

  if [ "$DEBUG_STATUS" -eq 200 ]; then
    echo "  PASS: Got HTTP $DEBUG_STATUS"
    if echo "$DEBUG_BODY" | grep -q '"apiStatus"'; then
      echo "  PASS: Response contains 'apiStatus' field"
    else
      echo "  FAIL: Response missing 'apiStatus' field"
      echo "  Response: $DEBUG_BODY"
      exit 1
    fi
    if echo "$DEBUG_BODY" | grep -q '"clerkTokenPresent"'; then
      echo "  PASS: Response contains 'clerkTokenPresent' field"
    else
      echo "  FAIL: Response missing 'clerkTokenPresent' field"
      echo "  Response: $DEBUG_BODY"
      exit 1
    fi
  else
    echo "  FAIL: Got HTTP $DEBUG_STATUS (expected 200)"
    echo "  Response: $DEBUG_BODY"
    exit 1
  fi
fi

echo ""
echo "=== All applicable tests passed ==="
exit 0
`````

---

## Summary

| Task | Deliverable | Wave | Requirements |
|------|-------------|------|-------------|
| W0-A | 3 validation scripts | 0 | API-12 |
| W1-A | Expanded `roleCheck.ts` | 1 | API-11 |
| W1-B | `anthropicService.ts` | 1 | API-12 |
| W1-C | `toolDefinitions.ts` | 1 | API-01–10, API-11 |
| W1-D | `systemPrompt.ts` | 1 | API-11 |
| W2-A | `route.ts` | 2 | API-11, API-12 |
| W3-A | `docs/CLERK_JWT_SETUP.md` | 3 | API-12 |
| W4-A | `test-phase1-auth.sh` | 4 | API-11, API-12 |

---

## Dependencies

```
Wave 0  (test scripts)
  └─ Wave 1  (library files — W1-A through W1-D, parallel)
         └─ Wave 2  (route.ts — depends on W1-A, W1-B, W1-D)
                └─ Wave 3  (docs + cleanup)
                       └─ Wave 4  (integration test)
```

---

## Must-Haves (from Phase Goal)

| # | Must-have | Verified by |
|---|-----------|-------------|
| 1 | `src/app/api/ai-chatbot/route.ts` exists, TypeScript compiles, auth returns 401/200 | W2-A acceptance criteria |
| 2 | `src/lib/ai/toolDefinitions.ts` exists, contains all 10 tools with schemas | W1-C acceptance criteria |
| 3 | `src/lib/ai/anthropicService.ts` exists, exports configured Anthropic client | W1-B acceptance criteria |
| 4 | `src/lib/roleCheck.ts` expanded with all role helpers | W1-A acceptance criteria |
| 5 | Clerk JWT template noted as out-of-band setup step | W3-A created `docs/CLERK_JWT_SETUP.md` |
| 6 | Auth forwarding verified via test script | W4-A `test-phase1-auth.sh` |
| 7 | No token logging anywhere in new files | `bash scripts/test-token-hygiene.sh` |

---

## Phase Completion Gates

Before marking Phase 1 complete, ALL of the following must be true:

```bash
# 1. TypeScript compiles
npx tsc --noEmit \
  src/app/api/ai-chatbot/route.ts \
  src/lib/ai/anthropicService.ts \
  src/lib/ai/toolDefinitions.ts \
  src/lib/ai/systemPrompt.ts \
  src/lib/roleCheck.ts

# 2. Token hygiene check
bash scripts/test-token-hygiene.sh          # must exit 0

# 3. Server-only guards present
bash scripts/test-server-only.sh             # must exit 0

# 4. Tool count verified
bash scripts/test-tool-count.sh              # must exit 0

# 5. Integration: unauthenticated → 401
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/ai-chatbot \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'                  # must output "401"

# 6. Integration: authenticated → 200 + role field
bash scripts/test-phase1-auth.sh "$CLERK_TOKEN"  # must exit 0
```

---

*Plan: 01-skeleton-architecture*
*Status: planned*
*nyquist_compliant: true*
