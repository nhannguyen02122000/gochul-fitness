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
  - src/lib/ai/formatters.ts
  - src/lib/ai/systemPrompt.ts
  - src/lib/ai/anthropicService.ts
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

## Wave 1 — Foundation

### Task 1: Create `src/lib/ai/formatters.ts`

<read_first>
- `src/lib/ai/anthropicService.ts` — existing client setup
- `src/app/api/contract/getAll/route.ts` — contract response shape `{ contracts, pagination }`
- `src/app/api/history/getAll/route.ts` — history response shape `{ history, pagination }`
- `.planning/phases/04-multi-turn-tool-use-loop/04-RESEARCH.md` — Pattern 4 (formatters) and Pattern 5 (translateError)
</read_first>

<action>
Create `src/lib/ai/formatters.ts` as a new file. All functions use `'Asia/Ho_Chi_Minh'` timezone.

**Exported types:**
```typescript
export type ToolResult =
  | { success: true; formatted: string }
  | { success: false; formatted: string }

export type UserLanguage = 'vi' | 'en'
```

**`formatContractList(contracts, pagination): string`**
- Input: `contracts: Record<string, unknown>[]`, `pagination: Record<string, unknown>`
- Returns markdown table: `| Loại | Buổi | Giá | Trạng thái | Bắt đầu | Kết thúc |`
- Empty state: `"Không có hợp đồng nào."`
- Footer: `**Tổng cộng:** {total} hợp đồng.`
- Credits column: `${credits} buổi` or `—` when null
- Uses `formatVND` (Intl.NumberFormat `vi-VN`, currency VND, minimumFractionDigits 0) and `formatDate` (Asia/Ho_Chi_Minh, dd/mm/yyyy)

**`formatSessionList(sessions, pagination): string`**
- Input: `sessions: Record<string, unknown>[]`, `pagination: Record<string, unknown>`
- Returns markdown table: `| Ngày | Giờ | Trạng thái | Ghi chú PT | Ghi chú KH |`
- Empty state: `"Không có buổi tập nào."`
- Footer: `**Tổng cộng:** {total} buổi tập.`
- Uses `formatTimeRange(from, to)` → `"08:00 – 09:30"` (zero-padded HH:MM)
- Notes: `📝 ${staff_note}` and `💬 ${customer_note}`, empty string when absent

**`formatActionResult(entity, action, data): string`**
- entity: `'contract' | 'session'`, action: `'created' | 'updated' | 'canceled'`
- Contract: `✅ **Hợp đồng đã được tạo**` with table of kind/credits/money/status/start/end
- Session: `✅ **Buổi tập đã được đặt**` with table of date/time/status
- Uses `formatVND`, `formatDate`, `formatTimeRange`

**`translateError(rawError, lang): string`**
- Input: `rawError: string`, `lang: UserLanguage`
- Static `ERROR_TRANSLATIONS` record with keys: `'403'`, `'404'`, `'429'`, `'400'`, `'500'`, `'rate limit'`
- Each entry: `{ vi: string, en: string }`
- Detection: HTTP status via regex `/\b(403|404|429|400|500)\b/`, rate-limit via `rawError.toLowerCase().includes('rate limit')`
- Fallback: `Đã xảy ra lỗi: ${rawError}` (vi) / `An error occurred: ${rawError}` (en)
- 403 vi: `"Bạn không có quyền thực hiện thao tác này."`
- 403 en: `"You don't have permission to perform this action."`
- 429 vi: `"Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút."`
- 429 en: `"Too many requests. Please try again in a few minutes."`
</action>

<acceptance_criteria>
- [ ] `export type ToolResult` appears
- [ ] `export function formatContractList` appears
- [ ] `export function formatSessionList` appears
- [ ] `export function formatActionResult` appears
- [ ] `export function translateError` appears
- [ ] `| Loại | Buổi | Giá | Trạng thái | Bắt đầu | Kết thúc |` appears (contract header)
- [ ] `| Ngày | Giờ | Trạng thái | Ghi chú PT | Ghi chú KH |` appears (session header)
- [ ] `'Asia/Ho_Chi_Minh'` appears in formatDate
- [ ] `'rate limit'` appears (lowercase) in translateError body
- [ ] `'403'` key in ERROR_TRANSLATIONS with vi/en bilingual values
- [ ] `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

### Task 2: Update `src/lib/ai/systemPrompt.ts`

<read_first>
- `src/lib/ai/systemPrompt.ts` (current — has BEHAVIOR RULES section ending with `.trim()`)
</read_first>

<action>
In `buildSystemPrompt()`, after the closing `## BEHAVIOR RULES` section (before the final `.trim()`), append a new section:

```typescript
## CONFIRMATION RULE

Before calling any CREATE, UPDATE (except update_session_note), or DELETE tool:
1. STOP the tool loop and return a confirmation proposal to the user.
2. Clearly state: what action will be taken, with what parameters.
3. Ask the user to confirm by clicking "Confirm" or replying "yes/đồng ý/ok".
4. If the user replies "no/không/cancel", do NOT call the tool. Acknowledge and stop.
5. When a user message contains the prefix "CONFIRMED:" it means the user has confirmed the last proposal. Execute the pending write action immediately.

Example proposal format:
"Tôi sẽ tạo hợp đồng PT cho **Nguyễn Văn A**, gói **10 buổi**, giá **1,500,000 VND**. Bạn xác nhận không?"
```
</action>

<acceptance_criteria>
- [ ] `CONFIRMATION RULE` appears in the file
- [ ] `CONFIRMED:` prefix instruction appears
- [ ] `no/không/cancel` instruction appears
- [ ] `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

## Wave 2 — Core AI Logic

### Task 3: Implement `callClaudeWithTools()` + `executeTool()` in `src/lib/ai/anthropicService.ts`

<read_first>
- `src/lib/ai/anthropicService.ts` (existing `callClaudePlaceholder`, client setup)
- `src/lib/ai/toolDefinitions.ts` (TOOL_DEFINITIONS array)
- `src/lib/ai/formatters.ts` (new from Task 1)
- `src/lib/ai/systemPrompt.ts` (updated in Task 2)
- `.planning/phases/04-multi-turn-tool-use-loop/04-RESEARCH.md` — Pattern 1 and Pattern 2
</read_first>

<action>
Replace the entire body of `anthropicService.ts` (keep the existing imports and client setup at the top).

**Add new imports:**
```typescript
import type { Message, MessageParam } from '@anthropic-ai/sdk/resources/messages/messages'
import type { ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'
import { TOOL_DEFINITIONS } from '@/lib/ai/toolDefinitions'
import {
  formatContractList,
  formatSessionList,
  formatActionResult,
  translateError,
  type UserLanguage,
} from '@/lib/ai/formatters'
```

**Add type definitions (after the client singleton):**
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

**`detectLanguage(messages: ConversationMessage[]): UserLanguage`**
- Check last user message with regex `/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i`
- Return `'vi'` if matches, else `'en'`

**`executeTool(toolName, input, clerkToken, lang): Promise<ToolResult>`**
- `baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'`
- `headers = { 'Content-Type': 'application/json', ...(clerkToken ? { Authorization: \`Bearer ${clerkToken}\` } : {}) }`
- **Retry loop:** `for (let attempt = 0; attempt < 2; attempt++)` — `try` the dispatch; on catch, check if retryable (429, 5xx, network): `continue`, else `break`
- After loop: `return { success: false, formatted: translateError(lastError.message, lang) }`

**Tool dispatch switch:**
```typescript
switch (toolName) {
  case 'get_contracts': {
    const params = new URLSearchParams(
      Object.entries(input).map(([k, v]) => [k, String(v)])
    ).toString()
    const res = await fetch(`${baseUrl}/api/contract/getAll?${params}`, {
      headers: { Authorization: headers.Authorization! }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatContractList(data.contracts ?? [], data.pagination ?? {}) }
  }
  case 'create_contract': {
    const res = await fetch(`${baseUrl}/api/contract/create`, {
      method: 'POST', headers, body: JSON.stringify(input)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatActionResult('contract', 'created', data.contract ?? {}) }
  }
  case 'update_contract_status': {
    const res = await fetch(`${baseUrl}/api/contract/updateStatus`, {
      method: 'POST', headers, body: JSON.stringify(input)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatActionResult('contract', 'updated', data.contract ?? {}) }
  }
  case 'update_contract': {
    const res = await fetch(`${baseUrl}/api/contract/update`, {
      method: 'POST', headers, body: JSON.stringify(input)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatActionResult('contract', 'updated', data.contract ?? {}) }
  }
  case 'delete_contract': {
    const res = await fetch(`${baseUrl}/api/contract/delete`, {
      method: 'POST', headers, body: JSON.stringify(input)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatActionResult('contract', 'canceled', data.contract ?? {}) }
  }
  case 'get_sessions': {
    const params = new URLSearchParams(
      Object.entries(input).map(([k, v]) => [k, String(v)])
    ).toString()
    const res = await fetch(`${baseUrl}/api/history/getAll?${params}`, {
      headers: { Authorization: headers.Authorization! }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatSessionList(data.history ?? [], data.pagination ?? {}) }
  }
  case 'create_session': {
    const res = await fetch(`${baseUrl}/api/history/create`, {
      method: 'POST', headers, body: JSON.stringify(input)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatActionResult('session', 'created', data.history ?? {}) }
  }
  case 'update_session': {
    const res = await fetch(`${baseUrl}/api/history/update`, {
      method: 'POST', headers, body: JSON.stringify(input)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatActionResult('session', 'updated', data.history ?? {}) }
  }
  case 'update_session_status': {
    const res = await fetch(`${baseUrl}/api/history/updateStatus`, {
      method: 'POST', headers, body: JSON.stringify(input)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatActionResult('session', 'updated', data.history ?? {}) }
  }
  case 'update_session_note': {
    const res = await fetch(`${baseUrl}/api/history/updateNote`, {
      method: 'POST', headers, body: JSON.stringify(input)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { success: true, formatted: formatActionResult('session', 'updated', data.history ?? {}) }
  }
  default:
    throw new Error(`Unknown tool: ${toolName}`)
}
```

**`callClaudeWithTools(params: CallClaudeParams): Promise<CallResult>`**
```typescript
export async function callClaudeWithTools({
  messages,
  systemPrompt,
  role,
  clerkToken,
}: CallClaudeParams): Promise<CallResult> {
  const lang = detectLanguage(messages)

  // Build conversation messages array for API
  const conversationMessages: MessageParam['messages'] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  let iterations = 0

  while (iterations < MAX_TOOL_ITERATIONS) {
    const response = await anthropicClient.messages.create({
      model: MODEL_NAME,
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationMessages,
      tools: TOOL_DEFINITIONS,
    })

    const textParts: string[] = []
    const toolCalls: ToolUseBlock[] = []

    for (const block of response.content) {
      if (block.type === 'text') textParts.push(block.text)
      else if (block.type === 'tool_use') toolCalls.push(block)
    }

    const assistantText = textParts.join('\n')
    const hasConfirmed = assistantText.includes('CONFIRMED:')

    // No tool calls → done
    if (toolCalls.length === 0) {
      return { type: 'text', text: assistantText }
    }

    // Determine if this is a write tool
    const isWriteTool = (name: string) =>
      ['create_contract', 'create_session', 'update_contract', 'delete_contract',
       'update_session', 'update_session_status'].includes(name)

    const primaryToolName = toolCalls[0].name

    // Write tool without confirmation → return proposal
    if (isWriteTool(primaryToolName) && !hasConfirmed) {
      return {
        type: 'proposal',
        text: assistantText,
        proposedAction: primaryToolName,
      }
    }

    // Execute tools and collect results
    const toolResults: ToolResultBlockParam[] = []

    for (const toolCall of toolCalls) {
      try {
        const result = await executeTool(
          toolCall.name,
          toolCall.input as Record<string, unknown>,
          clerkToken,
          lang,
        )
        toolResults.push({
          tool_use_id: toolCall.id,
          type: 'tool_result',
          content: result.formatted,
          is_error: !result.success,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        toolResults.push({
          tool_use_id: toolCall.id,
          type: 'tool_result',
          content: translateError(msg, lang),
          is_error: true,
        })
      }
    }

    // Append tool results to conversation (user role required by Anthropic)
    conversationMessages.push({
      role: 'user',
      content: toolResults as unknown as string,
    } as MessageParam['messages'][number])

    iterations++
  }

  // Cap hit
  return {
    type: 'text',
    text: 'I reached the maximum number of steps (10). Please try a simpler or more specific request.',
  }
}
```
</action>

<acceptance_criteria>
- [ ] `export async function callClaudeWithTools` appears
- [ ] `export type CallResult` appears (union of 'text' | 'proposal')
- [ ] `const MAX_TOOL_ITERATIONS = 10` appears
- [ ] `export function executeTool` appears
- [ ] `export function detectLanguage` appears
- [ ] `TOOL_DEFINITIONS` imported and used in messages.create
- [ ] `formatContractList` imported from formatters
- [ ] `formatSessionList` imported from formatters
- [ ] `formatActionResult` imported from formatters
- [ ] `translateError` imported from formatters
- [ ] `get_contracts` GET dispatch with URLSearchParams appears
- [ ] `create_contract` POST dispatch appears
- [ ] `create_session` POST dispatch appears
- [ ] Retry loop (`attempt < 2`) appears in executeTool
- [ ] HTTP 429 handling in executeTool retry
- [ ] `type: 'proposal'` return appears
- [ ] `'CONFIRMED:'` detection appears
- [ ] `isWriteTool` helper appears
- [ ] `conversationMessages.push({ role: 'user', content: toolResults })` appears
- [ ] `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

## Wave 3 — Route Update

### Task 4: Update `src/app/api/ai-chatbot/route.ts`

<read_first>
- `src/app/api/ai-chatbot/route.ts` (current — imports `callClaudePlaceholder`, steps 1–8)
- `src/lib/ai/anthropicService.ts` (updated in Task 3)
</read_first>

<action>
**Replace import:**
```typescript
// OLD:
import { callClaudePlaceholder } from '@/lib/ai/anthropicService'
// NEW:
import { callClaudeWithTools } from '@/lib/ai/anthropicService'
```

**Replace step 6 + 8 logic** (the callClaudePlaceholder block and return):
```typescript
// OLD:
let botReply: string
try {
  botReply = await callClaudePlaceholder(systemPrompt, body.message)
} catch (error) {
  console.error('Anthropic API error:', ...)
  return NextResponse.json({ error: '...' }, { status: 502 })
}
// ...
return NextResponse.json({ reply: botReply, type: 'text' as const, role: userRole, messages: [...] })

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
  console.error('Anthropic API error:', error instanceof Error ? error.message : String(error))
  return NextResponse.json(
    { error: 'AI service temporarily unavailable — please try again in a moment' },
    { status: 502 }
  )
}

const { type: responseType, text: botReply } = callResult

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

**Remove step 7** (the `?debug=auth` block entirely) — it's a Phase 1 artifact no longer needed.
</action>

<acceptance_criteria>
- [ ] `callClaudeWithTools` imported
- [ ] `callClaudePlaceholder` NOT imported
- [ ] `type: 'proposal'` appears in the return block
- [ ] `type: 'text'` appears in the return block
- [ ] `?debug=auth` code block is absent
- [ ] `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

## Wave 4 — Client UI

### Task 5: Update `src/store/useAIChatbotStore.ts`

<read_first>
- `src/store/useAIChatbotStore.ts` (current — `type?: 'normal' | 'error'`)
</read_first>

<action>
In the `ChatMessage` interface, replace the type union:

```typescript
// OLD:
type?: 'normal' | 'error'

// NEW:
type?: 'normal' | 'error' | 'proposal'
```
</action>

<acceptance_criteria>
- [ ] `'proposal'` appears in `ChatMessage.type` union
- [ ] `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

### Task 6: Update `src/components/chatbot/MessageBubble.tsx`

<read_first>
- `src/components/chatbot/MessageBubble.tsx` (current)
- `.planning/phases/04-multi-turn-tool-use-loop/04-UI-SPEC.md` — Proposal Bubble Layout
</read_first>

<action>
**Update interface:**
```typescript
interface MessageBubbleProps {
  message: ChatMessage
  onConfirm?: () => void
}
```

**Update function signature:**
```typescript
export default function MessageBubble({ message, onConfirm }: MessageBubbleProps) {
```

**In the assistant bubble branch** (role === 'assistant', not error), replace the render with a conditional that supports the proposal variant:

```typescript
// Replace the single ReactMarkdown block with this structure inside the non-error assistant div:
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
```

**Add aria-label on the non-error assistant div when type === 'proposal':**
```typescript
<div
  aria-label={type === 'proposal' ? 'Action requires confirmation' : 'AI Assistant response'}
  ...
>
```
</action>

<acceptance_criteria>
- [ ] `onConfirm?: () => void` appears in `MessageBubbleProps` interface
- [ ] `aria-label="Confirm action"` appears on the button element
- [ ] `bg-[var(--color-cta)]` appears on the button
- [ ] `aria-label="Action requires confirmation"` appears
- [ ] `type === 'proposal'` appears in the component
- [ ] `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

### Task 7: Update `src/components/chatbot/MessageList.tsx`

<read_first>
- `src/components/chatbot/MessageList.tsx` (current)
</read_first>

<action>
**Add interface:**
```typescript
interface MessageListProps {
  onConfirm?: () => void
}
```

**Update function signature:**
```typescript
export default function MessageList({ onConfirm }: MessageListProps) {
```

**In messages.map**, pass `onConfirm` to proposal bubbles only:
```typescript
{messages.map((msg) => (
  <MessageBubble
    key={msg.id}
    message={msg}
    onConfirm={msg.type === 'proposal' ? onConfirm : undefined}
  />
))}
```

**Update greeting bubble** to pass `onConfirm={undefined}`:
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
- [ ] `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

### Task 8: Update `src/components/chatbot/MessageInput.tsx`

<read_first>
- `src/components/chatbot/MessageInput.tsx` (current)
- `src/components/chatbot/MessageList.tsx` (updated in Task 7)
- `.planning/phases/04-multi-turn-tool-use-loop/04-UI-SPEC.md` — Interaction Contracts
</read_first>

<action>
**Add `handleConfirm` function** before the `handleSubmit` function:

```typescript
const handleConfirm = async () => {
  if (isLoading || isSubmittingRef.current) return

  isSubmittingRef.current = true

  // Build history: existing messages + the proposal bubble
  const conversationHistory = messages.map(({ role, content }) => ({
    role,
    content,
  }))
  const lastBotMsg = messages[messages.length - 1]

  // Add "Confirmed" user message
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
          ...(lastBotMsg ? [{ role: 'assistant' as const, content: lastBotMsg.content }] : []),
          { role: 'user', content: 'Confirmed' },
        ],
      }),
    })
    const data = await res.json()

    if (!res.ok || data.type === 'error') {
      addMessage({
        role: 'assistant',
        content: data.error ?? 'Something went wrong. Please try again.',
        type: 'error',
      })
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

**Update the return JSX** to add `handleConfirm` prop to `MessageList`:
```typescript
// Find the <MessageList /> component and add the prop:
<MessageList onConfirm={handleConfirm} />
```
</action>

<acceptance_criteria>
- [ ] `async function handleConfirm` appears in MessageInput.tsx
- [ ] `onConfirm={handleConfirm}` passed to `<MessageList`
- [ ] `message: 'CONFIRMED'` appears in handleConfirm body
- [ ] Full conversation history sent in second API call (including last bot msg)
- [ ] `'Confirmed'` user message added to thread before second call
- [ ] `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

## Wave 5 — Verification

### Task 9: TypeScript Compilation

<read_first>
- All 8 modified/created files
</read_first>

<action>
Run `npx tsc --noEmit` at project root. Verify zero errors.
</action>

<acceptance_criteria>
- [ ] `npx tsc --noEmit` exits with code 0
- [ ] No `Cannot find module` errors
- [ ] No `Argument of type ... is not assignable` errors
</acceptance_criteria>

---

## Requirements → Task Coverage

| Requirement | Task |
|---|---|
| LOOP-01 | Task 3 (system prompt + loop) |
| LOOP-02 | Task 3 (while loop) |
| LOOP-03 | Tasks 2, 3, 6, 8 |
| LOOP-04 | Task 2 (system prompt) |
| LOOP-05 | Task 3 (MAX_TOOL_ITERATIONS = 10) |
| TIME-01 | Task 2 (system prompt already has window rules) |
| TIME-02 | Task 2 (system prompt already has 24h→12h rule) |
| TIME-03 | Task 2 (system prompt already has hôm nay/ngày mai/thứ X rules) |
| TIME-04 | Task 2 (system prompt already has single-anchor rule) |
| TIME-05 | Task 2 (system prompt already has LANGUAGE RULE) |
| ERR-01 | Tasks 1, 3 (translateError with vi/en) |
| ERR-02 | Tasks 1, 3 (translateError user-friendly) |
| ERR-03 | Task 3 (retry loop in executeTool) |
| ERR-04 | Tasks 1, 3 (429 detection + rate-limit translation) |
| THRD-05 | Tasks 1, 3 (formatters → markdown tables) |
| THRD-06 | Tasks 6, 7 (react-markdown already wired) |