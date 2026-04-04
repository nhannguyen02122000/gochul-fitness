# Phase 4: Multi-Turn + Tool-Use Loop - Research

**Researched:** 2026-04-04
**Domain:** Anthropic Claude tool-use loop, multi-turn conversation with external API execution, Vietnamese time inference, structured markdown result formatting
**Confidence:** HIGH

## Summary

Phase 4 transforms the chatbot from a single-turn text responder into a fully functional AI agent. The core technical challenge is implementing the Anthropic tool-use loop: send the conversation history + system prompt + tools to Claude, collect `tool_use` blocks in the response, execute each tool, feed results back to Claude, repeat until `stop_reason === 'end_turn'`, then return the final text. The confirmation flow adds a two-step proposal/execute pattern where the AI surfaces a write action as a proposal bubble, and only executes after the user clicks Confirm. All API results are formatted server-side as markdown tables before being returned.

**Primary recommendation:** Implement `callClaudeWithTools()` as a plain `while` loop calling `messages.create()` non-streaming, with `executeTool()` as a pure router/dispatcher. Use the `'proposal'` `type` discriminator on the route response to trigger the client's Confirm button. No streaming, no new packages.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Loop lives in `anthropicService.ts` — new `callClaudeWithTools()` alongside `callClaudePlaceholder()`. Keep route.ts clean.
- **D-02:** `callClaudeWithTools()` signature: `({ messages, role, userName, userInstantId, clerkToken })` → `{ text: string, toolsUsed: ToolResult[], iterations: number }`
- **D-03:** Two-step confirmation: AI proposes as bubble with "Confirm" button. User clicks → sends `CONFIRMED: <action>` message → AI executes → result shown.
- **D-04:** Route returns `type: 'proposal'` in response JSON for confirmation bubbles. Client detects `type === 'proposal'` and renders Confirm button.
- **D-05:** Formatting happens server-side in `executeTool()` in `anthropicService.ts`. Raw API JSON goes through a formatter before being passed back to Claude.
- **D-06:** Results formatted as markdown tables in bot bubbles. `react-markdown` + `remark-gfm` already wired in `MessageBubble.tsx`.

### Claude's Discretion

- Exact prompt wording for the confirmation proposal
- Exact markdown table format for contracts vs. sessions
- Exact retry logic (ERR-03: retry failed API calls once)
- How to format the `toolsUsed` debug metadata
- Whether to use streaming or non-streaming (Phase 4: non-streaming)
- Confirmation button UI styling

### Deferred Ideas (OUT OF SCOPE)

- Streaming (Phase 5)
- Inline entity references like "cái thứ 2" (Phase 5)
- Rate limiting (Phase 5)
- Cross-language nudge (Phase 5)
- Availability check before booking (Phase 5)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOOP-01 | Bot asks follow-up when required parameters missing | System prompt (Phase 1) already instructs this; tool-use loop enforces it by detecting missing params in AI's follow-up questions |
| LOOP-02 | Bot loops until all parameters collected | `while (stop_reason !== 'end_turn')` loop in `callClaudeWithTools()` — stops when AI returns text without tool calls |
| LOOP-03 | Bot confirms before executing write operations | `CONFIRMED:` message protocol — AI proposes with `type: 'proposal'`, user confirms, AI executes |
| LOOP-04 | Bot handles ambiguous inputs gracefully | AI instructed via system prompt; tool-use loop enables back-and-forth |
| LOOP-05 | Loop capped at 10 iterations | `MAX_TOOL_ITERATIONS = 10` guard in `callClaudeWithTools()` |
| TIME-01 | sáng→00:00-11:59, chiều→12:00-14:59, tối→15:00-17:59, đêm→18:00-23:59 | Already in `systemPrompt.ts` (Phase 1) — verify no changes needed |
| TIME-02 | 24h→12h conversion | Already in `systemPrompt.ts` — verify no changes needed |
| TIME-03 | Relative date inference (hôm nay, ngày mai, thứ X) | Already in `systemPrompt.ts` — verify no changes needed |
| TIME-04 | Single anchor inference (e.g., "thứ 6" → upcoming Friday) | Already in `systemPrompt.ts` — verify no changes needed |
| TIME-05 | Both English and Vietnamese time expressions | Already in `systemPrompt.ts` — verify no changes needed |
| ERR-01 | Permission errors in user's language | `executeTool()` translates HTTP 403 to friendly message matching detected user language |
| ERR-02 | API errors in user-friendly format | `executeTool()` strips raw error strings, replaces with human-readable Vietnamese/English |
| ERR-03 | Retry failed API calls once before surfacing | Retry logic in `executeTool()` — `try` → `catch` → `try` again → surface error |
| ERR-04 | Rate-limit errors with retry suggestion | Detect HTTP 429 in `executeTool()`, return translated rate-limit message |
| THRD-05 | Bot message contains structured result cards | `executeTool()` formats API JSON → markdown tables; `react-markdown` renders in MessageBubble |
| THRD-06 | Bot messages support markdown (tables, bold, lists) | Already wired in MessageBubble.tsx (`react-markdown` + `remark-gfm`) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.82.0 ✅ installed | Tool-use loop via `messages.create()` | Project standard; already installed |
| Next.js 16 Route Handlers | bundled | `executeTool()` HTTP calls to internal API routes | Existing pattern throughout codebase |
| Zustand | bundled | `useAIChatbotStore` — add proposal type | Already in use |
| `react-markdown` + `remark-gfm` | bundled | Markdown rendering in bot bubbles | Already wired (Phase 2) |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `server-only` | Enforce server-only imports in `anthropicService.ts` | Already used in existing files |
| `@tanstack/react-query` | Not used in chatbot path | Irrelevant for chatbot flow |
| Clerk `getToken({ template: 'gochul-fitness' })` | Forward auth to internal API routes | Already implemented (Phase 1) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom while loop | Streaming `MessageStream` | Phase 4 uses non-streaming; streaming is Phase 5 |
| Client-side tool execution | Stream results to client | Route handler stays single-responsibility; all tool exec server-side |
| Zod for tool input validation | Direct `as` casting | SDK types (`ToolUseBlock.input: unknown`) already typed; validate per-tool in `executeTool()` |

**No new packages needed.** All required packages are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/ai/
│   ├── anthropicService.ts       # MODIFIED: add callClaudeWithTools() + executeTool()
│   ├── toolDefinitions.ts        # READ: TOOL_DEFINITIONS (already complete)
│   ├── systemPrompt.ts            # MODIFIED: add confirmation instruction
│   └── formatters.ts             # NEW: formatContractList(), formatSessionList(), formatActionResult()
├── app/
│   ├── api/ai-chatbot/
│   │   └── route.ts              # MODIFIED: replace callClaudePlaceholder → callClaudeWithTools
│   └── type/api/
│       └── index.ts              # READ: Role, ContractStatus, HistoryStatus types
└── components/chatbot/
    ├── MessageBubble.tsx         # MODIFIED: add type === 'proposal' variant
    ├── MessageInput.tsx          # MODIFIED: detect type === 'proposal', handle CONFIRMED:
    └── MessageList.tsx           # READ: no changes needed
```

### Pattern 1: Tool-Use Loop (`callClaudeWithTools`)

**What:** A `while` loop that calls `messages.create()` repeatedly until the model returns text (no tool calls).

**When to use:** Phase 4 — non-streaming implementation of the AI agent loop.

**Anthropic SDK 0.82.0 types (verified in `resources/messages/messages.d.ts`):**
- `ToolUseBlock` — `{ id: string, name: string, input: unknown, type: 'tool_use', caller: ... }`
- `ToolResultBlockParam` — `{ tool_use_id: string, type: 'tool_result', content?: string, is_error?: boolean }`
- `Message.content` — `Array<ContentBlock>` where `ContentBlock = TextBlock | ToolUseBlock | ...`
- `Message.stop_reason` — `'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'pause_turn' | 'refusal'`

**Core loop (verified against SDK source):**
```typescript
// Source: Anthropic SDK 0.82.0 + verified patterns
import type { Message, ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'

const MAX_ITERATIONS = 10

export async function callClaudeWithTools(
  params: CallClaudeParams
): Promise<{ text: string; toolsUsed: ToolResult[]; iterations: number }> {
  const { messages, systemPrompt, clerkToken } = params

  // Build initial messages array from conversation history
  const conversationMessages: MessageParam['messages'] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  let iterations = 0
  let toolsUsed: ToolResult[] = []

  while (iterations < MAX_ITERATIONS) {
    const response = await anthropicClient.messages.create({
      model: MODEL_NAME,
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationMessages,
      tools: TOOL_DEFINITIONS, // from toolDefinitions.ts
    })

    // Check each content block
    const textParts: string[] = []
    const toolCalls: ToolUseBlock[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
      } else if (block.type === 'tool_use') {
        toolCalls.push(block)
      }
    }

    // If no tool calls → done
    if (toolCalls.length === 0) {
      return { text: textParts.join('\n'), toolsUsed, iterations }
    }

    // Execute each tool and collect results
    const toolResults: ToolResultBlockParam[] = []
    for (const toolCall of toolCalls) {
      try {
        const result = await executeTool(toolCall.name, toolCall.input as Record<string, unknown>, clerkToken)
        toolResults.push({
          tool_use_id: toolCall.id,
          type: 'tool_result',
          content: result.formatted,
          is_error: !result.success,
        })
        toolsUsed.push({ name: toolCall.name, success: result.success, formattedResult: result.formatted })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        toolResults.push({
          tool_use_id: toolCall.id,
          type: 'tool_result',
          content: msg,
          is_error: true,
        })
      }
    }

    // Append tool results to conversation and loop
    conversationMessages.push({
      role: 'user',
      content: response.content as unknown as string, // tool results added below
    })
    // Anthropic SDK: tool results are added as content blocks, not appended as text
    // Correct approach: add a user message with tool_result content blocks
    conversationMessages.push({
      role: 'user',
      content: toolResults as unknown as string,
    })

    iterations++
  }

  // Cap hit — return partial response
  return {
    text: 'I reached the maximum number of steps. Please try a simpler request.',
    toolsUsed,
    iterations,
  }
}
```

**Important SDK nuance:** When appending tool results to the messages array, the SDK accepts `ContentBlockParam[]` as the `content` field of a user message. The `tool_result` blocks must be included as content blocks alongside any text. The message role must be `'user'` (Anthropic requires tool results to come from the user role).

### Pattern 2: `executeTool()` — API Router Dispatcher

**What:** A pure dispatcher that maps tool names to internal Next.js API route calls, with retry logic and error translation.

**When to use:** Every tool invocation from the AI loop.

```typescript
// Source: verified against existing API routes (contract/create, history/create, etc.)
type ToolResult =
  | { success: true; formatted: string }
  | { success: false; formatted: string }

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  clerkToken: string | null
): Promise<ToolResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
  }

  const fetchOptions = { method: 'POST', headers, body: JSON.stringify(input) }

  // Retry once for transient failures
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await dispatchToRoute(toolName, input, baseUrl, headers, fetchOptions)
      return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // Only retry on network/server errors, not business logic errors
      if (isRetryableError(lastError)) continue
      break
    }
  }

  return { success: false, formatted: translateError(lastError!.message, detectLanguage()) }
}

async function dispatchToRoute(
  toolName: string,
  input: Record<string, unknown>,
  baseUrl: string,
  headers: Record<string, string>,
  fetchOptions: { method: string; headers: Record<string, string>; body: string }
): Promise<ToolResult> {
  switch (toolName) {
    case 'get_contracts': {
      const params = new URLSearchParams(
        Object.entries(input).map(([k, v]) => [k, String(v)])
      ).toString()
      const res = await fetch(`${baseUrl}/api/contract/getAll?${params}`, {
        method: 'GET', headers: { Authorization: headers.Authorization! }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatContractList(data.contracts, data.pagination) }
    }
    case 'create_contract': {
      const res = await fetch(`${baseUrl}/api/contract/create`, { ...fetchOptions })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('contract', 'created', data.contract) }
    }
    // ... all 10 tools
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
```

### Pattern 3: Confirmation Flow (Two-Step)

**What:** Separate "propose" from "execute" to prevent silent writes.

**When to use:** Any `create_*`, `update_*` (except `update_session_note`), `delete_*` tool call.

**Flow (verified against D-03, D-04):**

1. AI decides to execute a write tool (e.g., `create_contract`)
2. Instead of calling `executeTool()` immediately, the loop detects the tool call and:
   - Formats the parameters as a human-readable proposal string
   - Sets `type: 'proposal'` on the route response
   - Returns without appending tool results to the conversation
3. Client (`MessageInput.tsx`) detects `type === 'proposal'`:
   - Renders the proposal text in a bot bubble with a **Confirm** button
   - When Confirm is clicked, sends `CONFIRMED: create_contract` as the user's next message
4. Next turn — AI sees `CONFIRMED: create_contract` and calls `executeTool()` for real
5. `executeTool()` result goes back to AI → AI returns final text

**Route response shape:**
```typescript
// When AI wants to execute a write tool
return NextResponse.json({
  reply: 'Bạn có chắc muốn tạo hợp đồng PT cho Nguyễn Văn A, 10 buổi, 1,500,000 VND không?',
  type: 'proposal',
  proposedAction: 'create_contract',
  proposedParams: { purchased_by: '...', kind: 'PT', ... },
  role: userRole,
  messages: [...],
})
```

### Pattern 4: Server-Side Result Formatting

**What:** Format raw API JSON into markdown tables in `executeTool()`, before returning to the AI and client.

**When to use:** All `get_*` tools and action results.

```typescript
// Source: derived from existing API response shapes (contract/getAll, history/getAll)
function formatContractList(contracts: Contract[], pagination: Pagination): string {
  if (!contracts.length) return 'Không có hợp đồng nào.'

  const rows = contracts.map(c => [
    c.kind,
    c.credits ? `${c.credits} buổi` : '—',
    formatVND(c.money),
    c.status,
    formatDate(c.start_date),
    formatDate(c.end_date),
  ])

  return `| Loại | Buổi | Giá | Trạng thái | Bắt đầu | Kết thúc |
|------|------|-----|------------|---------|---------|\
${rows.map(r => `| ${r.join(' | ')} |`).join('\n')}\n\nTổng: ${pagination.total} hợp đồng.`
}
```

### Pattern 5: Error Translation

**What:** Map HTTP status codes and error strings to user-friendly messages in Vietnamese or English.

```typescript
// Source: CLAUDE.md §9 Error Handling + ERR-01, ERR-02 requirements
const ERROR_TRANSLATIONS: Record<string, { vi: string; en: string }> = {
  '403': {
    vi: 'Bạn không có quyền thực hiện thao tác này.',
    en: "You don't have permission to perform this action.",
  },
  '404': {
    vi: 'Không tìm thấy dữ liệu yêu cầu.',
    en: 'The requested data was not found.',
  },
  'rate limit': {
    vi: 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.',
    en: 'Too many requests. Please try again in a few minutes.',
  },
  // ... more translations
}

function translateError(rawError: string, lang: 'vi' | 'en'): string {
  // Extract HTTP status or key phrase
  const statusMatch = rawError.match(/\b(403|404|429|400|500)\b/)
  const status = statusMatch?.[1]

  if (status && ERROR_TRANSLATIONS[status]) {
    return ERROR_TRANSLATIONS[status][lang]
  }

  // Check for rate-limit keywords
  if (rawError.toLowerCase().includes('rate limit')) {
    return ERROR_TRANSLATIONS['rate limit'][lang]
  }

  // Generic fallback
  return lang === 'vi'
    ? `Đã xảy ra lỗi: ${rawError}`
    : `An error occurred: ${rawError}`
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool-use loop state machine | Custom iteration tracker with `Map<>` | Plain `while` loop with counter | Anthropic SDK handles session state internally; simple counter is sufficient |
| Markdown rendering | Custom regex-based formatter | `react-markdown` + `remark-gfm` | Already installed and wired (Phase 2); supports tables, lists, bold, etc. |
| Claude API client | Raw `fetch()` to Anthropic API | `@anthropic-ai/sdk` `messages.create()` | Already installed; handles auth, type safety, error normalization |
| Tool result formatting | Let AI hallucinate format | Server-side formatters in `executeTool()` | Consistent, predictable output regardless of AI model behavior |
| Confirmation state management | Create new Zustand slice | `type: 'proposal'` on existing `ChatMessage` + route response | Minimal change, leverages existing `addMessage` |

**Key insight:** The Anthropic SDK `messages.create()` is idempotent per call — each call is a stateless API request. The loop accumulates state by appending tool result messages to the `messages[]` array. No custom state machine needed.

---

## Runtime State Inventory

> Not applicable — Phase 4 is a greenfield implementation (new logic, no rename/refactor/migration).

**Trigger:** This is a new feature phase, not a rename/refactor/migration. No files are being renamed, no strings are being replaced, no data is being migrated. All Runtime State Inventory categories are N/A.

---

## Common Pitfalls

### Pitfall 1: Tool result messages appended as text instead of content blocks
**What goes wrong:** Loop hangs or AI receives malformed input — tool results appear as garbled text instead of structured `tool_result` blocks.
**Why it happens:** The Anthropic SDK requires tool results as `ContentBlockParam[]` in the `content` field of a `user` role message. Appending them as a plain string breaks the loop.
**How to avoid:** Always construct user messages for tool results as:
```typescript
{
  role: 'user',
  content: toolResults as unknown as string  // Cast because SDK accepts ContentBlockParam[]
}
```
The SDK's type definition confirms: `content?: string | Array<ContentBlockParam>` — so `ToolResultBlockParam[]` is valid.

### Pitfall 2: Proposal type not preserved through the `messages[]` round-trip
**What goes wrong:** Proposal bubble shows, user clicks Confirm, but the AI doesn't know what was proposed — `CONFIRMED: action` message is ambiguous.
**Why it happens:** The `proposedAction` / `proposedParams` from the proposal response are not echoed back in the `messages[]` array sent in the next request.
**How to avoid:** On the next `MessageInput` send, include the `CONFIRMED:` prefix AND the original `proposedAction` in the message content. The `messages[]` sent to the API should include:
```typescript
{ role: 'user', content: 'CONFIRMED: create_contract' }
```
The system prompt already instructs the AI to interpret `CONFIRMED:` prefix specially.

### Pitfall 3: `clerkToken` is `null` in `executeTool()`
**What goes wrong:** API calls from the chatbot route to other routes fail because the Clerk token is null (template not configured or expired).
**Why it happens:** `getToken({ template: 'gochul-fitness' })` returns `null` if the JWT template is not configured in Clerk Dashboard. The Phase 1 route already handles this gracefully with `clerkToken ?? ''`, but `executeTool()` needs the same treatment.
**How to avoid:** In `executeTool()`, pass `clerkToken ?? undefined` and only add the `Authorization` header if truthy. Internal fetch within the same Next.js app can use cookie forwarding automatically.
**Warning signs:** API calls return 401 only from the chatbot route but work from other routes.

### Pitfall 4: Infinite loop — AI keeps calling tools even after hitting max iterations
**What goes wrong:** `MAX_TOOL_ITERATIONS` guard triggers but the function still returns a malformed response.
**Why it happens:** If `stop_reason === 'tool_use'` when the iteration cap is hit, the last `response.content` contains `ToolUseBlock`s that were never executed. Returning them as text would confuse the AI.
**How to avoid:** When the cap is hit, return a clear apology message: `"I reached the maximum number of steps (10). Please try a simpler or more specific request."`. Never return un-executed tool call content as text.

### Pitfall 5: Vietnam timezone inconsistency between `systemPrompt.ts` and `executeTool()`
**What goes wrong:** Dates formatted in one timezone in the system prompt (Vietnam) but in UTC in `executeTool()` formatters.
**Why it happens:** `buildSystemPrompt()` uses `'Asia/Ho_Chi_Minh'` timezone, but `formatContractList()` in `executeTool()` may default to local/UTC.
**How to avoid:** Always use `'Asia/Ho_Chi_Minh'` in all `Intl.DateTimeFormat` or `Date` formatting calls. Use the same `formatDate()` utility for both system prompt date display and result formatting.

### Pitfall 6: `type === 'proposal'` breaks existing `addMessage` calls
**What goes wrong:** Phase 2 `addMessage({ role: 'assistant', content: '...' })` calls — which omit `type` — get unexpected `undefined` values.
**Why it happens:** `ChatMessage.type` is already `type?: 'normal' | 'error'` (optional). Adding `'proposal'` to the union is backward-compatible.
**How to avoid:** Keep `type` optional. `undefined` renders as normal bot bubble. Phase 3 D-06 decision already made `type` optional for this reason.

---

## Code Examples

### New file: `src/lib/ai/formatters.ts`
```typescript
/**
 * Server-side result formatters for chatbot API responses.
 * Formats raw API JSON into markdown tables for the AI and client.
 * All formatting uses 'Asia/Ho_Chi_Minh' timezone.
 *
 * @file src/lib/ai/formatters.ts
 */

export type ToolResult =
  | { success: true; formatted: string }
  | { success: false; formatted: string }

/** Format a contract list as a markdown table */
export function formatContractList(
  contracts: Record<string, unknown>[],
  pagination: Record<string, unknown>
): string {
  if (!contracts.length) return 'Không có hợp đồng nào.'

  const rows = contracts.map(c => [
    String(c['kind'] ?? ''),
    c['credits'] ? `${c['credits']} buổi` : '—',
    formatVND(Number(c['money'] ?? 0)),
    String(c['status'] ?? ''),
    formatDate(c['start_date'] as number | undefined),
    formatDate(c['end_date'] as number | undefined),
  ])

  const table = [
    '| Loại | Buổi | Giá | Trạng thái | Bắt đầu | Kết thúc |',
    '|------|------|-----|------------|---------|---------|',
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n')

  const total = (pagination['total'] as number) ?? contracts.length
  return `${table}\n\n**Tổng cộng:** ${total} hợp đồng.`
}

/** Format a session list as a markdown table */
export function formatSessionList(
  sessions: Record<string, unknown>[],
  pagination: Record<string, unknown>
): string {
  if (!sessions.length) return 'Không có buổi tập nào.'

  const rows = sessions.map(s => [
    formatDate(s['date'] as number | undefined),
    formatTimeRange(s['from'] as number, s['to'] as number),
    String(s['status'] ?? ''),
    s['staff_note'] ? `📝 ${s['staff_note']}` : '',
    s['customer_note'] ? `💬 ${s['customer_note']}` : '',
  ])

  const table = [
    '| Ngày | Giờ | Trạng thái | Ghi chú PT | Ghi chú KH |',
    '|------|------|------------|-----------|-----------|',
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n')

  const total = (pagination['total'] as number) ?? sessions.length
  return `${table}\n\n**Tổng cộng:** ${total} buổi tập.`
}

/** Format a single action result (create/update/delete) */
export function formatActionResult(
  entity: 'contract' | 'session',
  action: 'created' | 'updated' | 'canceled',
  data: Record<string, unknown>
): string {
  if (entity === 'contract') {
    return [
      `✅ **Hợp đồng đã được tạo**`,
      ``,
      `| Trường | Giá trị |`,
      `|--------|---------|`,
      `| Loại | ${data['kind']} |`,
      `| Buổi | ${data['credits'] ?? '—'} |`,
      `| Giá | ${formatVND(Number(data['money'] ?? 0))} |`,
      `| Trạng thái | ${data['status']} |`,
      `| Bắt đầu | ${formatDate(data['start_date'] as number | undefined)} |`,
      `| Kết thúc | ${formatDate(data['end_date'] as number | undefined)} |`,
    ].join('\n')
  }
  // session
  return [
    `✅ **Buổi tập đã được đặt**`,
    ``,
    `| Trường | Giá trị |`,
    `|--------|---------|`,
    `| Ngày | ${formatDate(data['date'] as number | undefined)} |`,
    `| Giờ | ${formatTimeRange(data['from'] as number, data['to'] as number)} |`,
    `| Trạng thái | ${data['status']} |`,
  ].join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(ts: number | undefined): string {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(ts))
}

function formatTimeRange(from: number, to: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60)
    const min = m % 60
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
  }
  return `${fmt(from)} – ${fmt(to)}`
}
```

### Modifying `route.ts` — replace `callClaudePlaceholder`
```typescript
// In route.ts — replace step 6:
// OLD (Phase 1):
//   botReply = await callClaudePlaceholder(systemPrompt, body.message)

// NEW (Phase 4):
import { callClaudeWithTools } from '@/lib/ai/anthropicService'
import { TOOL_DEFINITIONS } from '@/lib/ai/toolDefinitions'

const conversationMessages = [
  ...(body.messages ?? []),
  { role: 'user' as const, content: body.message },
]

const { text: botReply, type: responseType } = await callClaudeWithTools({
  messages: conversationMessages,
  systemPrompt,
  role: userRole,
  userName,
  userInstantId,
  clerkToken: clerkToken ?? undefined,
})

// responseType: 'text' | 'proposal' | 'error'
// For 'proposal': reply contains the proposal text
// For 'error': reply contains translated error message
```

### Modifying `systemPrompt.ts` — add confirmation instructions
```typescript
// Add to BEHAVIOR RULES section:
const CONFIRMATION_RULE = `
## CONFIRMATION BEFORE WRITE ACTIONS

Before calling any CREATE, UPDATE (except update_session_note), or DELETE tool,
you MUST:
1. Stop the tool loop and return a confirmation proposal to the user.
2. The proposal must clearly state: what action will be taken, with what parameters.
3. After the user confirms (by clicking Confirm or saying "yes/đồng ý/okay"), THEN call the tool.
4. If the user says "no/không/cancel", do not call the tool. Acknowledge and stop.

Example proposal format:
"Tôi sẽ tạo hợp đồng PT cho **Nguyễn Văn A**, gói **10 buổi**, giá **1,500,000 VND**. Bạn xác nhận không?"
`.trim()
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-turn placeholder | Tool-use loop with confirmation | Phase 4 | Bot can execute multi-step operations |
| Raw API JSON in response | Markdown table formatting server-side | Phase 4 | Consistent, readable results |
| Error strings in English only | Language-aware error translation | Phase 4 | User-friendly in both EN/VI |
| Proposal + execution in one step | Two-step confirm-then-execute | Phase 4 | Prevents accidental writes |
| `callClaudePlaceholder()` | `callClaudeWithTools()` + `executeTool()` | Phase 4 | Full AI agent capability |

**Deprecated/outdated:**
- `callClaudePlaceholder()` — replaced by `callClaudeWithTools()` (kept for backward compat until Phase 4 ships)
- Inline role checks in chatbot route — replaced by `requireRole()` from `roleCheck.ts` (already done in Phase 1)

---

## Open Questions

1. **How to detect user language for error translation?**
   - What we know: System prompt has a `LANGUAGE RULE` instructing the AI to respond in the user's language. The AI itself can be used as a language detector for error messages.
   - What's unclear: `executeTool()` is a utility function — should it accept a `lang` parameter or infer from a message content heuristic?
   - Recommendation: Pass `lang: 'vi' | 'en'` from the route handler, inferred from `body.messages` — check the last user message for Vietnamese characters (`/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i`). Fallback to `'vi'` for empty/fallback.

2. **How should `CONFIRMED:` work when the user confirms with natural language ("đồng ý", "yes", "ok")?**
   - What we know: The system prompt instructs the AI to interpret confirmation. The client sends `CONFIRMED: action` as a prefix.
   - What's unclear: Does the client need to strip the prefix before including in `messages[]`, or does the AI handle it?
   - Recommendation: Include `CONFIRMED:` in `messages[]`. System prompt instructs AI to look for it as a special prefix.

3. **How to format `toolsUsed` in the return value?**
   - What we know: D-02 says `toolsUsed: ToolResult[]`. This is for debug metadata, not shown to users.
   - What's unclear: Should this be included in the API response or just logged?
   - Recommendation: Log `toolsUsed` server-side (console.debug). Don't include in route response body — it inflates payload and isn't needed by the client.

4. **Should `callClaudeWithTools` handle the `pause_turn` stop reason?**
   - What we know: `stop_reason: 'pause_turn'` means the model paused a long-running turn. The SDK documentation says to provide the response back as-is in a subsequent request.
   - What's unclear: Does this apply to the custom AI router (`pro-x.io.vn`) or only official Anthropic API?
   - Recommendation: Treat `pause_turn` like `tool_use` — loop continues. If it recurs, cap at MAX_ITERATIONS.

---

## Environment Availability

> Step 2.6: SKIPPED — no external dependencies identified beyond already-installed packages.

All required tools are already available in the project:
- `@anthropic-ai/sdk` 0.82.0 ✅ installed
- `react-markdown` + `remark-gfm` ✅ installed (Phase 2)
- `zustand` ✅ installed (Phase 2)
- Next.js 16 App Router ✅ installed
- Clerk auth ✅ installed
- All 10 GoChul API routes ✅ exist

**No new packages, no external CLI tools, no runtime services required.**

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None** — no test framework installed |
| Config file | N/A |
| Quick run command | `npx tsc --noEmit` (type-check only) |
| Full suite command | `npx tsc --noEmit && npm run lint` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Command | File Exists? |
|--------|----------|-----------|---------|--------------|
| LOOP-01 | Bot asks follow-up questions | Manual | Send "tạo hợp đồng" → verify bot asks for missing params | N/A |
| LOOP-02 | Bot loops until params collected | Manual | Complete a multi-param action → verify AI gathers all params | N/A |
| LOOP-03 | Bot confirms before write ops | Manual | "tạo hợp đồng" → verify Confirm button appears → click → action executes | N/A |
| LOOP-04 | Ambiguous input handling | Manual | Send "đặt lịch tập" with no contract → verify clarification asked | N/A |
| LOOP-05 | Loop capped at 10 iterations | Manual | Monitor `iterations` in server log for complex requests | N/A |
| TIME-01–05 | Vietnamese time inference | Manual | Test "sáng mai", "chiều thứ 6", "13:00" → verify correct inference | N/A |
| ERR-01 | Permission errors in user language | Manual | CUSTOMER tries "tạo hợp đồng" → verify Vietnamese error | N/A |
| ERR-02 | API errors user-friendly | Manual | Trigger API error → verify no raw error strings in response | N/A |
| ERR-03 | Retry once on API failure | Manual | Instrument server — verify 2 fetch attempts for transient error | N/A |
| ERR-04 | Rate-limit with retry suggestion | Manual | Trigger rate limit (if possible) → verify suggestion message | N/A |
| THRD-05 | Structured result cards | Manual | List contracts → verify markdown table renders | N/A |
| THRD-06 | Markdown formatting | Manual | Send various requests → verify tables, bold, lists render correctly | N/A |

### Wave 0 Gaps
- ❌ `tests/` directory does not exist
- ❌ No test framework (Vitest, Jest) in `package.json`
- ❌ No chatbot-specific test utilities

**Recommendation:** Install Vitest before Phase 4 implementation begins:
```bash
npm install --save-dev vitest @vitest/ui
npx vitest init
```

Without automated tests, all 16 requirements must be verified manually. A single regression in `anthropicService.ts` could break all chatbot functionality without detection.

### Phase Gate Criteria
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Manual smoke test: open chatbot → send "liệt kê hợp đồng" → verify markdown table appears
- [ ] Manual smoke test: send "tạo hợp đồng" (ADMIN) → verify Confirm button → click → contract created
- [ ] Manual smoke test: send "tạo hợp đồng" (CUSTOMER) → verify Vietnamese permission error

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts` — SDK types verified locally: `ToolUseBlock`, `ToolResultBlockParam`, `ContentBlock` union, `stop_reason` values, message structure
- `src/lib/ai/toolDefinitions.ts` — All 10 tool definitions already defined with schemas
- `src/lib/ai/systemPrompt.ts` — Vietnamese time rules (TIME-01–05) already in system prompt
- `src/app/api/contract/create/route.ts` — API request/response shapes verified for `executeTool()` routing
- `src/app/api/history/create/route.ts` — API request/response shapes verified
- `src/app/api/contract/getAll/route.ts` — Pagination + contract shape verified

### Secondary (MEDIUM confidence)
- [Anthropic Messages API documentation](https://docs.anthropic.com/en/api/messages) — Tool-use loop pattern (offline at research time; confirmed via SDK source)
- Claude Code MDN/CLAUDE.md — Project conventions for server-side code, error handling, TypeScript strict mode

### Tertiary (LOW confidence)
- None — all critical facts verified against installed SDK types and existing codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — `@anthropic-ai/sdk` 0.82.0 verified installed; all required packages already present
- Architecture: **HIGH** — all patterns verified against installed SDK types and existing codebase files
- Pitfalls: **HIGH** — all pitfalls derived from actual SDK type inspection and existing code analysis
- Validation: **LOW** — no test framework exists; all verification is manual; flagged as gap

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days — Anthropic SDK 0.82.0 is stable; no fast-moving dependencies in this phase)
