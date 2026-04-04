---
gsd_phase_version: "4.0"
phase_slug: 04-multi-turn-tool-use-loop
status: planning
wave: 1
depends_on: []
autonomous: false
requirements:
  - LOOP-01
  - LOOP-02
  - LOOP-03
  - LOOP-04
  - LOOP-05
  - TIME-01
  - TIME-02
  - TIME-03
  - TIME-04
  - TIME-05
  - ERR-01
  - ERR-02
  - ERR-03
  - ERR-04
  - THRD-05
  - THRD-06
files_modified:
  - src/lib/ai/anthropicService.ts
  - src/lib/ai/systemPrompt.ts
  - src/lib/ai/formatters.ts
  - src/app/api/ai-chatbot/route.ts
  - src/store/useAIChatbotStore.ts
  - src/components/chatbot/MessageBubble.tsx
  - src/components/chatbot/MessageList.tsx
  - src/components/chatbot/MessageInput.tsx
must_haves:
  - Bot executes real API calls for all 10 tool endpoints
  - Vietnamese time expressions map to correct UTC+7 windows
  - Confirmation button appears for all write operations before execution
  - Structured markdown result cards render for list actions
  - Permission/rate-limit errors surface in user's language (VI/EN)
  - Loop caps at 10 iterations and returns graceful message
  - TypeScript compiles with zero errors
---

# Phase 4 Plan: Multi-Turn + Tool-Use Loop

## Overview

Phase 4 implements the full AI logic: a `while` tool-use loop in `anthropicService.ts`, server-side result formatting, error translation, a two-step confirmation flow, and UI support for proposal bubbles with confirm buttons.

---

## Wave 1 — Foundation (Parallel)

### Task 1: Create `src/lib/ai/formatters.ts`

<read_first>
- `src/lib/ai/anthropicService.ts`
- `src/app/api/contract/getAll/route.ts` (contract shape)
- `src/app/api/history/getAll/route.ts` (history shape)
- `.planning/phases/04-multi-turn-tool-use-loop/04-RESEARCH.md` — Pattern 4 (Server-Side Result Formatting) and Pattern 5 (Error Translation)
</read_first>

<action>
Create new file `src/lib/ai/formatters.ts` with these exports:

**Types:**
```typescript
export type ToolResult =
  | { success: true; formatted: string }
  | { success: false; formatted: string }

export type UserLanguage = 'vi' | 'en'
```

**Public formatters:**
```typescript
export function formatContractList(
  contracts: Record<string, unknown>[],
  pagination: Record<string, unknown>
): string

export function formatSessionList(
  sessions: Record<string, unknown>[],
  pagination: Record<string, unknown>
): string

export function formatActionResult(
  entity: 'contract' | 'session',
  action: 'created' | 'updated' | 'canceled',
  data: Record<string, unknown>
): string
```

**Internal helpers** (file-scoped, not exported):
```typescript
function formatVND(amount: number): string      // Intl.NumberFormat('vi-VN', { currency: 'VND' })
function formatDate(ts: number | undefined): string  // Asia/Ho_Chi_Minh, dd/mm/yyyy
function formatTimeRange(from: number, to: number): string  // "08:00 – 09:30"
```

**Contract table columns:** Loại | Buổi | Giá | Trạng thái | Bắt đầu | Kết thúc
**Session table columns:** Ngày | Giờ | Trạng thái | Ghi chú PT | Ghi chú KH

**Error translator:**
```typescript
export function translateError(rawError: string, lang: UserLanguage): string
```
Handles: HTTP 403, 404, 429, 400, 500, rate-limit keyword detection.
Returns bilingual `{ vi, en }` strings from a static `ERROR_TRANSLATIONS` record.
</action>

<acceptance_criteria>
- [ ] `export type ToolResult` appears in the file
- [ ] `export function formatContractList` appears in the file
- [ ] `export function formatSessionList` appears in the file
- [ ] `export function formatActionResult` appears in the file
- [ ] `export function translateError` appears in the file
- [ ] `| Loại | Buổi | Giá | Trạng thái | Bắt đầu | Kết thúc |` appears (contract table header)
- [ ] `| Ngày | Giờ | Trạng thái | Ghi chú PT | Ghi chú KH |` appears (session table header)
- [ ] `'Asia/Ho_Chi_Minh'` appears in formatDate
- [ ] `'rate limit'` in translateError (case-insensitive detection)
- [ ] HTTP 403 key in ERROR_TRANSLATIONS with vi/en bilingual messages
- [ ] `npx tsc --noEmit` passes on the file
</acceptance_criteria>

---

### Task 2: Update `src/lib/ai/systemPrompt.ts`

<read_first>
- `src/lib/ai/systemPrompt.ts` (current)
- `.planning/phases/04-multi-turn-tool-use-loop/04-RESEARCH.md` — Pattern 3 confirmation flow
</read_first>

<action>
Add a new section `## CONFIRMATION RULE` to the system prompt string, appended before the closing `.trim()` call.

```typescript
// Add this section to buildSystemPrompt() return string, after BEHAVIOR RULES section:

## CONFIRMATION RULE

Before calling any CREATE, UPDATE (except update_session_note), or DELETE tool:
1. STOP the tool loop and return a confirmation proposal to the user.
2. Clearly state: what action will be taken, with what parameters.
3. Ask the user to confirm by clicking "Confirm" or replying "yes/đồng ý/ok".
4. If the user replies "no/không/cancel", do NOT call the tool. Acknowledge and stop.
5. The CONFIRMED: prefix in a user message means the user has confirmed the last proposal.

Example proposal:
"Tôi sẽ tạo hợp đồng PT cho **Nguyễn Văn A**, gói **10 buổi**, giá **1,500,000 VND**. Bạn xác nhận không?"
```
</action>

<acceptance_criteria>
- [ ] `CONFIRMATION RULE` appears in the file
- [ ] `CONFIRMED:` prefix instruction appears in the file
- [ ] `no/không/cancel` instruction appears in the file
- [ ] `npx tsc --noEmit` passes
</acceptance_criteria>

---

## Wave 2 — Core AI Logic

### Task 3: Implement `callClaudeWithTools()` + `executeTool()` in `src/lib/ai/anthropicService.ts`

<read_first>
- `src/lib/ai/anthropicService.ts` (current — existing `callClaudePlaceholder`)
- `src/lib/ai/toolDefinitions.ts` (TOOL_DEFINITIONS array)
- `src/lib/ai/formatters.ts` (new file from Task 1)
- `src/lib/ai/systemPrompt.ts` (updated in Task 2)
- `src/app/api/contract/getAll/route.ts`
- `src/app/api/history/getAll/route.ts`
- `.planning/phases/04-multi-turn-tool-use-loop/04-RESEARCH.md` — Pattern 1 (Tool-Use Loop) and Pattern 2 (executeTool)
</read_first>

<action>
Replace the entire body of `anthropicService.ts` (keeping the existing client setup) with the following additions:

**New imports:**
```typescript
import type { Message, MessageParam } from '@anthropic-ai/sdk/resources/messages/messages'
import type { ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'
import { TOOL_DEFINITIONS } from '@/lib/ai/toolDefinitions'
import { formatContractList, formatSessionList, formatActionResult, translateError, type UserLanguage } from '@/lib/ai/formatters'
```

**Type definitions (after imports):**
```typescript
export type ConversationMessage = { role: 'user' | 'assistant'; content: string }

export type CallClaudeParams = {
  messages: ConversationMessage[]
  systemPrompt: string
  role: string
  clerkToken?: string
}

export type CallResult =
  | { type: 'text'; text: string }
  | { type: 'proposal'; text: string; proposedAction: string }

const MAX_TOOL_ITERATIONS = 10
```

**`detectLanguage(messages: ConversationMessage[]): UserLanguage` function:**
- Check last user message for Vietnamese characters using regex `/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i`
- Fallback to `'vi'`

**`executeTool()` function** — the dispatcher:
- Parameters: `toolName: string, input: Record<string, unknown>, clerkToken?: string, lang: UserLanguage`
- Builds `baseUrl` from `process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'`
- Builds headers: `{ 'Content-Type': 'application/json', ...(clerkToken ? { Authorization: \`Bearer ${clerkToken}\` } : {}) }`
- Retry logic: `for (let attempt = 0; attempt < 2; attempt++)` — retry once on any error; on retryable error (429, 5xx, network) continue, else break
- Dispatches to correct API route based on toolName (see tool→route map below)
- For GET tools: constructs URLSearchParams from input, calls `fetch(url, { headers })`
- For POST tools: calls `fetch(url, { method: 'POST', headers, body: JSON.stringify(input) })`
- On non-ok response: `throw new Error(data.error ?? \`HTTP ${res.status}\`)`
- On success: applies the correct formatter and returns `{ success: true, formatted: string }`
- On catch: `return { success: false, formatted: translateError(msg, lang) }`

**Tool → Route dispatch map:**
| toolName | HTTP | URL |
|---|---|---|
| `get_contracts` | GET | `/api/contract/getAll?{params}` |
| `create_contract` | POST | `/api/contract/create` |
| `update_contract_status` | POST | `/api/contract/updateStatus` |
| `update_contract` | POST | `/api/contract/update` |
| `delete_contract` | POST | `/api/contract/delete` |
| `get_sessions` | GET | `/api/history/getAll?{params}` |
| `create_session` | POST | `/api/history/create` |
| `update_session` | POST | `/api/history/update` |
| `update_session_status` | POST | `/api/history/updateStatus` |
| `update_session_note` | POST | `/api/history/updateNote` |
| default | — | throws `Unknown tool: ${toolName}` |

**`callClaudeWithTools()` function:**
- Parameters: `CallClaudeParams` → returns `Promise<CallResult>`
- Builds `conversationMessages: MessageParam[]` from `messages` (maps role + content)
- Appends current user message separately
- `while (iterations < MAX_TOOL_ITERATIONS)` loop:
  - Calls `anthropicClient.messages.create({ model: MODEL_NAME, max_tokens: 2048, system: systemPrompt, messages: conversationMessages, tools: TOOL_DEFINITIONS })`
  - Extracts `textParts: string[]` and `toolCalls: ToolUseBlock[]` from response.content
  - If no toolCalls: checks last assistant text for `CONFIRMED:` prefix — if found, strips it and continues loop (AI re-decides); else returns `{ type: 'text', text: textParts.join('\n') }`
  - If toolCalls present and AI text contains `CONFIRMED:` → execute tool
  - If toolCalls present and this is a write tool (create_contract, create_session, update_contract, delete_contract, update_session, update_session_status) AND AI text does NOT contain `CONFIRMED:` → return `{ type: 'proposal', text: textParts.join('\n') + "\n\n[Xác nhận / Confirm]", proposedAction: toolCalls[0].name }`
  - Executes each toolCall via `executeTool()` with retry
  - Collects `ToolResultBlockParam[]` with `tool_use_id`, `type: 'tool_result'`, `content: result.formatted`, `is_error: !result.success`
  - Appends tool results to `conversationMessages` as a user role message: `{ role: 'user', content: toolResults }` (toolResults is cast to `unknown` then `string` for SDK compat)
  - Increments `iterations`
- On MAX_TOOL_ITERATIONS cap: returns `{ type: 'text', text: 'I reached the maximum number of steps (10). Please try a simpler or more specific request.' }`

**Detection of CONFIRMED: prefix in AI text:**
```typescript
const CONFIRMED_PREFIX = 'CONFIRMED:'
const assistantText = textParts.join('\n')
const hasConfirmed = assistantText.includes(CONFIRMED_PREFIX)
```
</action>

<acceptance_criteria>
- [ ] `export async function callClaudeWithTools` appears in the file
- [ ] `export type CallResult` appears in the file
- [ ] `const MAX_TOOL_ITERATIONS = 10` appears in the file
- [ ] `export function executeTool` appears in the file
- [ ] `export function detectLanguage` appears in the file
- [ ] `TOOL_DEFINITIONS` imported and used in messages.create
- [ ] `formatContractList` imported from formatters
- [ ] `translateError` imported from formatters
- [ ] `get_contracts` GET dispatch appears (searchParams + fetch GET)
- [ ] `create_contract` POST dispatch appears
- [ ] `create_session` POST dispatch appears
- [ ] `Retry` logic (second attempt) appears in executeTool
- [ ] HTTP 429 handling appears in executeTool
- [ ] `'proposal'` type return appears
- [ ] `CONFIRMED:` prefix detection appears
- [ ] `npx tsc --noEmit` passes on the file
</acceptance_criteria>

---

## Wave 3 — Route Update

### Task 4: Update `src/app/api/ai-chatbot/route.ts`

<read_first>
- `src/app/api/ai-chatbot/route.ts` (current — uses `callClaudePlaceholder`)
- `src/lib/ai/anthropicService.ts` (updated in Task 3)
</read_first>

<action>
In `route.ts`, replace the call to `callClaudePlaceholder` and the surrounding code:

**Replace import:**
```typescript
// OLD:
import { callClaudePlaceholder } from '@/lib/ai/anthropicService'
// NEW:
import { callClaudeWithTools } from '@/lib/ai/anthropicService'
```

**Replace step 6 block (the callClaudePlaceholder invocation and surrounding):**
```typescript
// OLD (step 6):
let botReply: string
try {
  botReply = await callClaudePlaceholder(systemPrompt, body.message)
} catch (error) {
  console.error('Anthropic API error:', ...)
  return NextResponse.json({ error: '...' }, { status: 502 })
}

// NEW:
let callResult: { type: 'text' | 'proposal'; text: string }
try {
  const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(body.messages ?? []),
    { role: 'user', content: body.message },
  ]
  callResult = await callClaudeWithTools({
    messages: conversationMessages,
    systemPrompt,
    role: userRole,
    clerkToken: clerkToken ?? undefined,
  })
} catch (error) {
  console.error('Anthropic API error:', ...)
  return NextResponse.json(
    { error: 'AI service temporarily unavailable — please try again in a moment' },
    { status: 502 }
  )
}

const { type: responseType, text: botReply } = callResult
```

**Update step 8 return:**
```typescript
// OLD:
return NextResponse.json({
  reply: botReply,
  type: 'text' as const,
  role: userRole,
  messages: [...],
})

// NEW:
const finalMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
  ...(body.messages ?? []),
  { role: 'user', content: body.message },
  { role: 'assistant', content: botReply },
]

if (responseType === 'proposal') {
  return NextResponse.json({
    reply: botReply,
    type: 'proposal' as const,
    role: userRole,
    messages: finalMessages,
  })
}

return NextResponse.json({
  reply: botReply,
  type: 'text' as const,
  role: userRole,
  messages: finalMessages,
})
```

**Also:** Remove the `?debug=auth` block (step 7) — it's a Phase 1 artifact no longer needed with real tool execution.
</action>

<acceptance_criteria>
- [ ] `callClaudeWithTools` imported from '@/lib/ai/anthropicService'
- [ ] `callClaudePlaceholder` NOT imported
- [ ] `type: 'proposal'` appears in the return block
- [ ] `type: 'text'` appears in the return block
- [ ] `?debug=auth` block is absent
- [ ] `npx tsc --noEmit` passes
</acceptance_criteria>

---

## Wave 4 — Client UI Updates

### Task 5: Update `src/store/useAIChatbotStore.ts`

<read_first>
- `src/store/useAIChatbotStore.ts` (current — `type?: 'normal' | 'error'`)
</read_first>

<action>
Replace the type definition:

```typescript
// OLD:
type?: 'normal' | 'error'

// NEW:
type?: 'normal' | 'error' | 'proposal'
```
</action>

<acceptance_criteria>
- [ ] `'proposal'` appears in the type union for `ChatMessage.type`
- [ ] `npx tsc --noEmit` passes
</acceptance_criteria>

---

### Task 6: Update `src/components/chatbot/MessageBubble.tsx`

<read_first>
- `src/components/chatbot/MessageBubble.tsx` (current — user/assistant/error branches)
- `.planning/phases/04-multi-turn-tool-use-loop/04-UI-SPEC.md` — Proposal Bubble Layout
</read_first>

<action>
Replace the component to support the `onConfirm` callback and proposal variant:

**Update interface:**
```typescript
interface MessageBubbleProps {
  message: ChatMessage
  onConfirm?: () => void
}
```

**Update function signature:**
```typescript
export default function MessageBubble({ message, onConfirm }: MessageBubbleProps)
```

**In the assistant bubble branch** (role === 'assistant', not error):
After the `ReactMarkdown` block, add a conditional proposal block:

```typescript
// Below the existing ReactMarkdown render for non-error assistant:
{type === 'proposal' && onConfirm && (
  <div className="flex flex-col gap-2">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
    <button
      type="button"
      aria-label="Confirm action"
      onClick={onConfirm}
      className={cn(
        'self-start h-8 px-4 rounded-full',
        'bg-[var(--color-cta)] text-white text-sm font-medium',
        'transition-colors hover:bg-[var(--color-cta-hover)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      Confirm
    </button>
  </div>
)}
```

**Restructure the non-error assistant div:**
The outer `div` for non-error assistant should no longer have conditional markdownStyles class directly — wrap content in a fragment:
```typescript
{!isError && !type && (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {content}
  </ReactMarkdown>
)}
{!isError && type === 'proposal' && (
  <div className="flex flex-col gap-2">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
    {onConfirm && (
      <button ...>Confirm</button>
    )}
  </div>
)}
```
Actually, a simpler approach: keep the markdown render for non-proposal, add a separate conditional block for proposal:

```typescript
// In the non-error assistant div:
<div className={cn('max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed bg-muted text-foreground', markdownStyles)}>
  {!type && (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  )}
  {type === 'proposal' && (
    <div className="flex flex-col gap-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {onConfirm && (
        <button
          type="button"
          aria-label="Confirm action"
          onClick={onConfirm}
          className={cn(
            'self-start h-8 px-4 rounded-full',
            'bg-[var(--color-cta)] text-white text-sm font-medium',
            'transition-colors hover:bg-[var(--color-cta-hover)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          Confirm
        </button>
      )}
    </div>
  )}
</div>
```

Also add `aria-label="Action requires confirmation"` to the non-error assistant div when `type === 'proposal'`.
</action>

<acceptance_criteria>
- [ ] `onConfirm?: () => void` appears in MessageBubbleProps interface
- [ ] `aria-label="Confirm action"` appears on the button element
- [ ] `bg-[var(--color-cta)]` appears (coral confirm button)
- [ ] `aria-label="Action requires confirmation"` appears
- [ ] `type === 'proposal'` appears in the component
- [ ] `npx tsc --noEmit` passes
</acceptance_criteria>

---

### Task 7: Update `src/components/chatbot/MessageList.tsx`

<read_first>
- `src/components/chatbot/MessageList.tsx` (current — passes message to MessageBubble)
</read_first>

<action>
**Add `onConfirm` prop** to the `MessageBubble` call:

The `MessageList` receives `onConfirm` as a prop (forwarded from `MessageInput`):

```typescript
interface MessageListProps {
  onConfirm?: () => void
}

export default function MessageList({ onConfirm }: MessageListProps) {
  // ...
  {messages.map((msg) => (
    <MessageBubble
      key={msg.id}
      message={msg}
      onConfirm={msg.type === 'proposal' ? onConfirm : undefined}
    />
  ))}
}
```

**Update the greeting bubble** (inside `!hasMessages` block) to also pass `onConfirm`:
```typescript
<MessageBubble
  message={{ id: 'greeting', role: 'assistant', content: GREETING, timestamp: 0 }}
  onConfirm={undefined}
/>
```
</action>

<acceptance_criteria>
- [ ] `onConfirm` prop accepted by MessageList
- [ ] `onConfirm={msg.type === 'proposal' ? onConfirm : undefined}` appears in messages.map
- [ ] `npx tsc --noEmit` passes
</acceptance_criteria>

---

### Task 8: Update `src/components/chatbot/MessageInput.tsx`

<read_first>
- `src/components/chatbot/MessageInput.tsx` (current — fetch call, error handling)
- `src/store/useAIChatbotStore.ts` (updated in Task 5)
- `.planning/phases/04-multi-turn-tool-use-loop/04-UI-SPEC.md` — Interaction Contracts
</read_first>

<action>
Replace the `handleSubmit` function body and add `AIChatbotModal` integration:

**Add `MessageList` import:**
```typescript
import MessageList from './MessageList'
```

**Remove** the `useAIChatbotStore` message export `messages` from the hook (it's already there). Add `useAIChatbotStore` for `pendingConfirm` state.

Actually, keep the existing `useAIChatbotStore` import. Add a `pendingConfirmRef` module-level ref to store the confirm callback between render cycles:

```typescript
// Module-level ref to bridge Confirm button → next API call
const pendingConfirmRef = { current: false }
```

Wait — actually the better pattern per UI-SPEC is to store a `pendingProposal` ref or use a module-level variable. Let me use a simpler approach: a module-level `pendingConfirmResolver` function ref:

```typescript
// Module-level bridge for confirm button → second API call
let resolvePendingConfirm: (() => void) | null = null
```

**OR** simpler: use a Zustand action. Actually, the simplest pattern per D-04 in CONTEXT: use a module-level ref in MessageInput.

**Add after imports:**
```typescript
// Module-level bridge: set when proposal bubble appears, consumed on Confirm click
let pendingConfirmAction: (() => void) | null = null
```

**Update `handleSubmit` function:**
```typescript
const handleSubmit = async () => {
  const trimmed = input.trim()
  if (!trimmed || isLoading || isSubmittingRef.current) return

  isSubmittingRef.current = true
  const userMessage = trimmed
  const conversationHistory = messages.map(({ role, content }) => ({
    role,
    content,
  }))

  // If this is a confirmation click, prepend CONFIRMED: prefix
  const messageToSend = pendingConfirmAction !== null
    ? `CONFIRMED: ${trimmed}`
    : trimmed

  // Clear pending confirm state
  const wasConfirming = pendingConfirmAction !== null
  pendingConfirmAction = null

  addMessage({ role: 'user', content: userMessage })
  setLoading(true)
  setInput('')

  try {
    const res = await fetch('/api/ai-chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageToSend,
        messages: conversationHistory,
      }),
    })

    const data = await res.json()

    if (!res.ok || data.type === 'error') {
      addMessage({
        role: 'assistant',
        content: data.error ?? 'Something went wrong. Please try again.',
        type: 'error',
      })
    } else if (data.type === 'proposal') {
      addMessage({ role: 'assistant', content: data.reply, type: 'proposal' })
      setLoading(false)
      // Store the resolver for the Confirm button
      pendingConfirmAction = () => {
        // Clicking Confirm: simulate Enter key on current input (already has CONFIRMED: prefix)
        // Instead: directly trigger a second API call
        // Simpler: just call handleConfirm() recursively
        pendingConfirmAction = null
        // We need to send the CONFIRMED message — use a direct approach
        // Set a flag and call handleSubmit again with the confirmed message
        const confirmResolver = () => {
          addMessage({ role: 'user', content: 'Confirmed', type: 'normal' })
          setLoading(true)
          // Send CONFIRMED: as user message
          fetch('/api/ai-chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'CONFIRMED',
              messages: [
                ...useAIChatbotStore.getState().messages.map(({ role, content }) => ({ role, content })),
                { role: 'user', content: userMessage },
                { role: 'assistant', content: data.reply },
                { role: 'user', content: 'Confirmed' },
              ],
            }),
          })
            .then(r => r.json())
            .then(result => {
              if (!r.ok || result.type === 'error') {
                addMessage({ role: 'assistant', content: result.error ?? 'Error.', type: 'error' })
              } else {
                addMessage({ role: 'assistant', content: result.reply })
              }
            })
            .catch(() => addMessage({ role: 'assistant', content: 'Connection error.', type: 'error' }))
            .finally(() => setLoading(false))
        }
        confirmResolver()
      }
    } else {
      addMessage({ role: 'assistant', content: data.reply })
    }
  } catch {
    addMessage({
      role: 'assistant',
      content: 'Connection error. Please check your network and try again.',
      type: 'error',
    })
  } finally {
    setLoading(false)
    isSubmittingRef.current = false
  }
}
```

Actually, this is getting too complex. Let me use a cleaner pattern:

**Cleaner approach — pass `onConfirm` through Zustand:**

Add a `pendingProposal` state to the store (Task 5): `pendingProposal: string | null` + `setPendingProposal: (v: string | null) => void`. When `type === 'proposal'`, set `setPendingProposal(data.reply)`. The Confirm button calls `addMessage({ role: 'user', content: 'CONFIRMED' })` then submits.

Actually, the simplest and cleanest approach per the UI spec:

**Step 1:** Add to `handleConfirm` inline in MessageInput — wire it to the `onConfirm` prop passed to `MessageList`.

**The actual implementation should be:**

In `MessageInput.tsx`, add:
```typescript
const handleConfirm = async () => {
  if (isLoading) return
  isSubmittingRef.current = true

  const conversationHistory = messages.map(({ role, content }) => ({
    role,
    content,
  }))
  // The last bot message was a proposal — include it in history
  const lastBotMessage = messages[messages.length - 1]

  addMessage({ role: 'user', content: 'Confirmed', type: 'normal' })
  setLoading(true)

  try {
    const res = await fetch('/api/ai-chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'CONFIRMED',
        messages: [
          ...conversationHistory,
          ...(lastBotMessage ? [{ role: 'assistant' as const, content: lastBotMessage.content }] : []),
          { role: 'user', content: 'Confirmed' },
        ],
      }),
    })
    const data = await res.json()
    if (!res.ok || data.type === 'error') {
      addMessage({ role: 'assistant', content: data.error ?? 'Error.', type: 'error' })
    } else {
      addMessage({ role: 'assistant', content: data.reply })
    }
  } catch {
    addMessage({ role: 'assistant', content: 'Connection error.', type: 'error' })
  } finally {
    setLoading(false)
    isSubmittingRef.current = false
  }
}
```

Then pass `handleConfirm` as the `onConfirm` prop to `MessageList`:
```typescript
<MessageList onConfirm={handleConfirm} />
```

And update `AIChatbotModal` to pass through `onConfirm`:
```typescript
// In AIChatbotModal, add onConfirm prop and pass to MessageList
<MessageList onConfirm={onConfirm} />
```

Actually wait — `AIChatbotModal` doesn't know about `handleConfirm`. The simpler path is: `MessageList` renders `MessageBubble` with `onConfirm`, and `MessageList` accepts `onConfirm` as a prop from `MessageInput`. `MessageInput` passes `handleConfirm` to `MessageList`.

**Final approach:**
- `MessageInput.tsx` defines `handleConfirm` and passes it as `onConfirm` prop to `MessageList`
- `MessageList.tsx` passes `onConfirm` down to `MessageBubble` for proposal-type messages
- The `CONFIRMED` user message is appended and sent with full history in the second API call
</action>

<acceptance_criteria>
- [ ] `handleConfirm` function appears in MessageInput.tsx
- [ ] `onConfirm={handleConfirm}` passed to `<MessageList`
- [ ] `message: 'CONFIRMED'` appears in handleConfirm body
- [ ] Full conversation history sent in handleConfirm second API call
- [ ] `npx tsc --noEmit` passes
</acceptance_criteria>

---

## Wave 5 — Verification

### Task 9: TypeScript Compilation Check

<read_first>
- All files modified in Tasks 1–8
</read_first>

<action>
Run `cd /Users/nhannguyenthanh/Developer/gochul-fitness && npx tsc --noEmit` to verify zero TypeScript errors.
</action>

<acceptance_criteria>
- [ ] `npx tsc --noEmit` exits with code 0
- [ ] No `Cannot find module` errors
- [ ] No `Argument of type ... is not assignable to parameter of type ...` errors
</acceptance_criteria>

---

## File Summary

| File | Change |
|------|--------|
| `src/lib/ai/formatters.ts` | **NEW** — formatContractList, formatSessionList, formatActionResult, translateError |
| `src/lib/ai/systemPrompt.ts` | **MODIFIED** — add CONFIRMATION RULE section |
| `src/lib/ai/anthropicService.ts` | **MODIFIED** — add callClaudeWithTools, executeTool, detectLanguage |
| `src/app/api/ai-chatbot/route.ts` | **MODIFIED** — replace callClaudePlaceholder → callClaudeWithTools, remove debug block, add proposal response |
| `src/store/useAIChatbotStore.ts` | **MODIFIED** — add 'proposal' to ChatMessage.type union |
| `src/components/chatbot/MessageBubble.tsx` | **MODIFIED** — add onConfirm prop, proposal variant with Confirm button |
| `src/components/chatbot/MessageList.tsx` | **MODIFIED** — accept onConfirm prop, pass to proposal bubbles |
| `src/components/chatbot/MessageInput.tsx` | **MODIFIED** — add handleConfirm, wire onConfirm to MessageList |

---

## Requirements → Task Coverage

| Requirement | Task |
|-------------|------|
| LOOP-01: Bot asks follow-up questions | Task 3 (system prompt + loop) |
| LOOP-02: Bot loops until params collected | Task 3 (while loop, stop_reason check) |
| LOOP-03: Bot confirms before write ops | Tasks 2, 3, 6, 8 |
| LOOP-04: Bot handles ambiguous inputs gracefully | Task 3 (system prompt instructions) |
| LOOP-05: Loop capped at 10 iterations | Task 3 (MAX_TOOL_ITERATIONS guard) |
| TIME-01: Vietnamese time windows | Task 2 (system prompt already has these) |
| TIME-02: 24h→12h conversion | Task 2 (system prompt already has these) |
| TIME-03: Relative date inference | Task 2 (system prompt already has these) |
| TIME-04: Single anchor inference | Task 2 (system prompt already has these) |
| TIME-05: English + Vietnamese | Task 2 (system prompt already has LANGUAGE RULE) |
| ERR-01: Permission errors in user language | Tasks 1, 3 (translateError) |
| ERR-02: API errors in user-friendly format | Tasks 1, 3 (translateError) |
| ERR-03: Retry failed API calls once | Task 3 (retry loop in executeTool) |
| ERR-04: Rate-limit with retry suggestion | Tasks 1, 3 (429 detection + translateError) |
| THRD-05: Structured result cards | Tasks 1, 3 (formatters) |
| THRD-06: Markdown formatting | Tasks 6, 7 (react-markdown already wired) |
