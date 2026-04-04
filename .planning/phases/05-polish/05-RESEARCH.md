# Phase 5: Polish — Research

**Written:** 2026-04-04
**Phase:** 05-polish
**Question:** "What do I need to know to PLAN this phase well?"

---

## 0. Executive Summary

Phase 5 has **6 deliverables**, all v2 enhancements (no v1 requirements). They fall into two buckets:

| Bucket | Deliverables | Nature |
|--------|-------------|--------|
| **Server-side** | `getOccupiedTimeSlots` tool, English time parsing rules, Upstash rate limiting, streaming Response from route | New logic + config; no UI changes |
| **Frontend + server** | `useChat` replacement, warning bubble, nudge bubble | Both UI and server response format |

All server-side work lives in `src/lib/ai/` and `src/app/api/ai-chatbot/route.ts`. All frontend work lives in `src/components/chatbot/`. No new components. No shadcn additions.

---

## 1. Streaming — Vercel AI SDK

### 1.1 Package Inventory

**Already installed:**
- `@anthropic-ai/sdk` (v0.82.0) — Phase 1 legacy. Used directly in `anthropicService.ts` for the tool-use loop. **Keep as-is.**
- `zustand` (v5) — Used by `useAIChatbotStore`. Phase 5 trims it.

**Need to add (Phase 5):**
```bash
npm install ai @ai-sdk/react @ai-sdk/anthropic @upstash/ratelimit @upstash/redis
```

| Package | Role | Phase 5 Purpose |
|---------|------|----------------|
| `ai` | Core SDK — `streamText`, `toDataStreamResponse` | Server-side streaming response in route.ts |
| `@ai-sdk/react` | React hooks — `useChat` | Client-side message state (replaces Zustand) |
| `@ai-sdk/anthropic` | Anthropic provider — `createAnthropic` | Wraps existing `@anthropic-ai/sdk` client config (baseURL + apiKey) for AI SDK |
| `@upstash/ratelimit` | Rate limiting | Server-side request throttling |
| `@upstash/redis` | Redis client (Upstash) | Backing store for `@upstash/ratelimit` |

**Package relationship note:** `@ai-sdk/anthropic` is the Vercel AI SDK's Anthropic provider. It is **different** from the existing `@anthropic-ai/sdk` (official Anthropic SDK). Both will coexist: the official SDK runs the tool-use loop (`callClaudeWithTools`), while the AI SDK's `streamText` wraps the final output as a streaming Response.

### 1.2 Two-Layer Architecture

```
Client                                  Server
───────                                 ──────
useChat (ai/react)  ──POST /api/ai-chatbot──►  callClaudeWithTools()
  messages[]                                    (existing @anthropic-ai/sdk)
  isLoading                                     │
  input/setInput                               ▼
  handleSubmit/append                     FINAL TEXT STRING
                                              │
                                              ▼
                                        streamText()
                                              │
                                              ▼
                                        toDataStreamResponse()  ← streaming Response
```

**Key insight (D-03 from 05-CONTEXT):** `callClaudeWithTools()` runs to completion server-side. Only the final text string is streamed. This means:
- The tool loop logic in `anthropicService.ts` does **not** change.
- The route.ts calls `callClaudeWithTools()` → gets `{ type, text }` → pipes `text` through `streamText`.
- **No partial tool results are visible to the user** — proposals still stop the loop (the stream never starts for proposals).

### 1.3 Server-Side: `route.ts` Streaming

The existing route (`src/app/api/ai-chatbot/route.ts`) returns `NextResponse.json({...})`. Phase 5 replaces the non-streaming return with a streaming `Response` via AI SDK.

**Key decision — which API surface to use:**
- `streamText` from `ai` + `toDataStreamResponse()` is the standard AI SDK streaming response format.
- `useChat` from `@ai-sdk/react` expects the AI SDK data stream protocol by default.

**Route pattern:**
```ts
// src/app/api/ai-chatbot/route.ts
import { createAnthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'

const anthropicProvider = createAnthropic({
  baseURL: process.env.CLAUDE_BASE_URL ?? 'https://api.anthropic.com',
  apiKey: process.env.CLAUDE_API_KEY,
})

// After callClaudeWithTools completes:
const result = await streamText({
  model: anthropicProvider(MODEL_NAME),
  system: systemPrompt,
  messages: conversationMessages,
})

return result.toDataStreamResponse()
```

**Important — the streaming model call is a second API call:** The `streamText` above creates a **new** streaming call to the LLM. This means:
- The existing `callClaudeWithTools()` logic runs first (tool loop).
- After it returns, we make a **second** call to the LLM just to stream the text.
- **Alternative (better approach):** The AI SDK supports `experimental_output: 'text'` or passing the already-computed text directly. The `toDataStreamResponse()` approach is designed for `generateText`/`streamText` which call the model. For a pre-computed text string, we need a different approach.

**The correct pattern for pre-computed text:**
The `useChat` hook expects a streaming Response that follows the AI SDK data stream protocol. For a pre-computed string (the output of `callClaudeWithTools()`), the simplest approach is to create a `ReadableStream` that yields the text:

```ts
// For text results:
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode(`0:{"type":"text","text":"${botReply}"}\n`))
    controller.close()
  }
})
return new Response(stream, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' }
})
```

Or using AI SDK's `toDataStreamResponse` with a synthetic `generateText` result. However, the **most correct** approach per the AI SDK protocol is to use `StreamData` and the format expected by `useChat`.

**Recommended approach for Phase 5:** Since `useChat` expects the AI SDK data stream protocol, and we have pre-computed text, the cleanest approach is:

```ts
import { CoreMessage } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'

const anthropic = createAnthropic({
  baseURL: process.env.CLAUDE_BASE_URL ?? 'https://api.anthropic.com/v1',
  apiKey: process.env.CLAUDE_API_KEY,
})

// For non-streaming text (proposals + tool results):
// Return JSON response (useChat handles this gracefully)
if (responseType === 'proposal') {
  return NextResponse.json({ type: 'proposal', ... })
}

// For streaming text:
// Call streamText with the existing conversation to stream the response
const result = await streamText({
  model: anthropic(MODEL_NAME),
  system: systemPrompt,
  messages: conversationMessages, // includes tool results from the loop
})

return result.toDataStreamResponse()
```

**Wait — this means two LLM calls (one for tool loop, one for streamText):** Yes, this is the trade-off of D-03 ("stream final output only"). The tool loop is non-streaming and runs to completion. Then `streamText` makes a fresh call with the conversation context. The AI SDK `streamText` can use `experimental_completedSteps: toolResults` to avoid re-executing tools, but this is experimental.

**Decision needed at planning time:** Whether to accept the double-LLM-call overhead, or to stream each chunk manually from the pre-computed string using a plain `ReadableStream`. The manual approach avoids the second call and is simpler:

```ts
// Simpler: stream pre-computed text without a second LLM call
function textToStream(text: string): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      // AI SDK data stream format for text
      const encoder = new TextEncoder()
      for (const chunk of splitIntoChunks(text)) {
        controller.enqueue(
          encoder.encode(`0:${JSON.stringify({ type: 'text', textDelta: chunk })}\n`)
        )
      }
      controller.close()
    }
  })
}

function splitIntoChunks(text: string, chunkSize = 10): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

return new Response(textToStream(botReply), {
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'x-usecase': 'pre-computed-text',
  }
})
```

**Recommendation:** Use the manual `ReadableStream` approach for pre-computed text. It avoids a second LLM call, works with `useChat`'s default fetch transport, and is fully under our control. Document this as the chosen approach.

### 1.4 Client-Side: `useChat` Hook

**Current state:** `MessageInput.tsx` manages message state via Zustand (`useAIChatbotStore`). It calls `POST /api/ai-chatbot` with `fetch`, awaits `res.json()`, and pushes messages via `addMessage`.

**Phase 5 change:** Replace Zustand message state with `useChat` from `@ai-sdk/react`.

**`useChat` return values used in Phase 5:**
```ts
const {
  messages,      // UIMessage[] — replaces useAIChatbotStore messages
  isLoading,     // boolean — replaces useAIChatbotStore isLoading
  input,         // string — replaces local useState('')
  setInput,      // (v: string) => void — replaces local setInput
  handleSubmit,  // (e: FormEvent) => void — replaces handleSubmit()
  append,        // (msg) => void — replaces handleConfirm()
} = useChat({
  api: '/api/ai-chatbot',
})
```

**Key integration notes:**
- `handleSubmit` handles Enter + button click automatically.
- `append` sends an extra message (for the confirm flow) without re-submitting the form.
- `useChat` manages its own message list. `MessageList` reads from `useChat` messages directly (via prop drilling or a shared context). The simplest approach for Phase 5: move `useChat` to `AIChatbotModal.tsx` and pass `messages`, `isLoading` down as props, or use a thin shared context.
- `AIChatbotModal` currently calls `clearMessages()` on close — with `useChat`, this is handled by `useChat` itself (set `clearThreadOnIdChange` or clear via `setMessages([])`). Remove `clearMessages` from the modal close handler.

### 1.5 `AIChatbotProvider`

`useChat` from `@ai-sdk/react` requires wrapping the component tree with `AIProvider` from `@ai-sdk/react`. Since the chatbot is in `MainLayout`, check if there's already an AI provider. If not, wrap the modal or the root layout with it:

```tsx
// In AIChatbotModal.tsx or MainLayout
import { AIProvider } from '@ai-sdk/react'

export default function AIChatbotModal() {
  return (
    <AIProvider>  {/* if not already provided higher up */}
      <Dialog ...>
        ...
      </Dialog>
    </AIProvider>
  )
}
```

**Recommendation:** Check `layout.tsx` first. If no AI provider exists, add it around the `<AIChatbotModal />` component in `MainLayout`. The provider is lightweight and can wrap any subtree.

### 1.6 Zustand Store — Phase 5 Final Shape

```ts
// useAIChatbotStore.ts — Phase 5 final
interface AIChatbotStore {
  isOpen: boolean
  setOpen: (v: boolean) => void
  // REMOVED: messages, isLoading, addMessage, setLoading, clearMessages
}
```

The store loses message/loading state. It retains modal open/close. `MessageInput` and `MessageList` stop importing from this store for those fields.

---

## 2. `getOccupiedTimeSlots` Tool

### 2.1 Purpose

Before booking a session (`create_session`), the bot checks whether the requested trainer is already booked at the requested time. If there's a conflict, it surfaces alternatives inline (warning bubble).

### 2.2 Tool Definition

Add to `toolDefinitions.ts`:

```ts
// toolDefinitions.ts
export const get_occupied_time_slots: Tool = {
  name: 'get_occupied_time_slots',
  description:
    'Check which time slots a trainer already has booked on a given date. ' +
    'Returns a list of occupied time ranges as [from, to] minute pairs. ' +
    'Use this before creating a session to avoid conflicts.',
  input_schema: {
    type: 'object',
    properties: {
      trainer_id: {
        type: 'string',
        description: "Trainer's InstantDB $users.id (required)",
      },
      date: {
        type: 'number',
        description: 'Target date as Unix timestamp (ms, day precision) (required)',
      },
    },
    required: ['trainer_id', 'date'],
  },
}
```

### 2.3 Dispatcher Addition

Add to the `dispatchTool()` switch in `anthropicService.ts`:

```ts
case 'get_occupied_time_slots': {
  // Calls GET /api/history/getAll?teach_by={trainer_id}&start_date={date}&end_date={date}
  // Filters to occupied slots (status !== CANCELED)
  const from = new Date(input.date as number).setHours(0, 0, 0, 0)
  const to = new Date(input.date as number).setHours(23, 59, 59, 999)
  const params = new URLSearchParams({
    teach_by: String(input.trainer_id),
    start_date: String(from),
    end_date: String(to),
  })
  const res = await fetch(`${baseUrl}/api/history/getAll?${params}`, {
    headers: { Authorization: headers.Authorization! },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

  const occupied = (data.history ?? [])
    .filter((h: any) => h.status !== 'CANCELED')
    .map((h: any) => `[${h.from}, ${h.to}]`)
    .join(', ')
  return {
    success: true,
    formatted: occupied
      ? `Occupied slots: ${occupied}`
      : 'No existing bookings for this trainer on this date.',
  }
}
```

### 2.4 Tool Flow in `callClaudeWithTools`

Claude is instructed (via system prompt) to call `get_occupied_time_slots` before `create_session`. The availability check happens inside the tool loop — not automatically injected by `executeTool()`.

### 2.5 Conflict Response Format

When `get_occupied_time_slots` returns a conflict, the formatted string goes into the tool result. Claude sees it and can generate a warning message. Phase 5 adds a `type: 'warning'` response option.

### 2.6 API Route for Availability (Alternative)

If the history API doesn't support the exact query needed (trainer + date + non-canceled), we may need a dedicated endpoint. Check `GET /api/history/getAll` — it accepts `teach_by_name`, `start_date`, `end_date` params. The dispatcher filters on the client side (already in code above). No new route needed.

---

## 3. Warning Bubble — Conflict Response

### 3.1 Server-Side: Route Response Format

When availability check finds a conflict, the route returns `{ reply, type: 'warning', suggestions }`. The `type` field signals the frontend to render the warning variant.

**New return type in route.ts:**
```ts
type ChatResponse =
  | { type: 'text'; reply: string; messages: ... }
  | { type: 'proposal'; reply: string; proposedAction: string; messages: ... }
  | { type: 'warning'; reply: string; suggestions: string[]; messages: ... }
  | { type: 'nudge'; reply: string; detectedLang: 'vi' | 'en'; messages: ... }
```

### 3.2 Frontend: `MessageBubble` Variant

Add `type: 'warning'` to the `ChatMessage` type in `useAIChatbotStore`:

```ts
// useAIChatbotStore.ts
type?: 'normal' | 'error' | 'proposal' | 'warning' | 'nudge'
```

Add rendering in `MessageBubble.tsx`:
```tsx
{/* existing code */}
{type === 'warning' && (
  <div
    className="bg-[--color-warning-bg] text-[#7A3E00] border-l-2 border-[--color-warning] px-3 py-2 rounded-2xl rounded-bl-md"
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
)}
```

Avatar: `AlertTriangle` icon, `--color-warning` background.

**Markdown in warning bubble:** Yes (UI spec says "yes"). Conflict messages may include formatted slot lists.

---

## 4. Language Nudge — Cross-Language Detection

### 4.1 Detection Logic (Already Implemented)

`detectLanguage(messages)` already exists in `anthropicService.ts`. It checks the most recent user message for Vietnamese diacritics. Phase 5 hooks it into the route response.

### 4.2 Route Integration

In `route.ts`, after `callClaudeWithTools()` returns, run `detectLanguage(conversationMessages)`. If the detected language differs from the previous language, inject a nudge bubble:

```ts
const lang = detectLanguage(conversationMessages)
const prevLang = detectLanguage(body.messages ?? [])
if (prevLang && lang !== prevLang) {
  return NextResponse.json({
    reply: `I noticed you switched language. I'll respond in ${lang === 'vi' ? 'Vietnamese' : 'English'}.`,
    type: 'nudge' as const,
    detectedLang: lang,
    messages: finalMessages,
  })
}
```

### 4.3 Frontend: Nudge Bubble

Add `type: 'nudge'` to `ChatMessage`. In `MessageBubble.tsx`:

```tsx
{type === 'nudge' && (
  <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-2xl rounded-bl-md text-[13px] italic">
    <Languages className="inline h-3 w-3 mr-1" />
    <span>{content}</span>
  </div>
)}
```

Avatar: `Languages` icon, blue-100 background. **No Confirm button. No markdown.**

### 4.4 Language State Tracking

The nudge needs to know the "previous" language. Since `useChat` manages messages in the frontend, the route needs to receive language history. Pass `detectedLang?: 'vi' | 'en'` in the request body, or infer from the conversation. The route compares `body.detectedLang` with the new detection result.

**Simpler approach:** The route always runs `detectLanguage()` on the full conversation. If it detects a switch from the previous detection, it returns a nudge. The previous language is implicit — we only need the current one. If the last 2 user messages differ in language, trigger the nudge.

---

## 5. Rate Limiting — `@upstash/ratelimit`

### 5.1 Package Addition

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 5.2 Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

Free tier: 10,000 requests/day. Sufficient for Phase 5.

### 5.3 Route Integration Pattern

```ts
// src/app/api/ai-chatbot/route.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests / minute
  analytics: true,
})

export async function POST(request: Request) {
  // Rate limit key: per authenticated user
  const authCtx = await auth()
  const { userId } = authCtx
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success, remaining, reset } = await ratelimit.limit(userId)
  if (!success) {
    return NextResponse.json(
      {
        reply: "You're sending messages too quickly. Please wait a moment and try again.",
        type: 'nudge',
      },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(reset) } }
    )
  }

  // ... rest of route
}
```

### 5.4 Redis Initialization

```ts
// src/lib/ratelimit.ts — new file
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

Or use `Redis.fromEnv()` which reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically from `process.env`.

### 5.5 Key Decision: Per-User vs Per-IP

D-08 says rate limiting is per request = 1 unit. The key should be `userId` (authenticated users). Falls back to IP for unauthenticated requests (though the route returns 401 before reaching rate limiting, so this is safe).

---

## 6. English Time Parsing — System Prompt Update

### 6.1 Changes to `systemPrompt.ts`

Add English time expression rules to the `TIME CONVENTIONS` section:

```ts
// In buildSystemPrompt(), after Vietnamese rules, add:

## TIME CONVENTIONS — English (Phase 5 Addition)

When a user writes in English, interpret these expressions:
- "tomorrow at 9am" → next day's 9:00 AM (540 minutes from midnight)
- "next Thursday" → the upcoming Thursday's date
- "this weekend" → Saturday of the current week
- "in 2 hours" → current time + 2 hours
- "next week" → Monday of next week
- "at noon" → 12:00 PM (720 minutes)
- "at midnight" → 12:00 AM (0 minutes)

Always interpret relative dates from the current server date (UTC+7).
For ambiguous times (e.g., "9am" without a date), use today by default if
the user hasn't specified otherwise, or ask for clarification.
```

### 6.2 Claude's Capability

Claude (the model used) already handles English natural language. The system prompt additions serve as explicit rules to ensure consistent interpretation, especially for Vietnamese-dominant training data edge cases.

---

## 7. Inline Entity Reference — System Prompt Update

### 7.1 Changes to `systemPrompt.ts`

Add a new section to the system prompt:

```ts
## INLINE ENTITY REFERENCES

When listing items (contracts or sessions) for the user, always number them
using [1], [2], [3] markers so the user can refer back to them:

"[1] PT Contract — 10 sessions — 1,500,000 VND — ACTIVE"
"[2] Rehab Contract — 20 sessions — 2,000,000 VND — CUSTOMER_PAID"

When the user says "the second one", "cái thứ 2", "hợp đồng kia", or
"that contract", resolve the reference against the most recent list in the
conversation:

- "the second one" / "cái thứ 2" → item labeled [2]
- "that one" / "cái đó" → the last item in the most recent list
- "hợp đồng kia" / "that contract" → the last contract mentioned
- "buổi tập đó" / "that session" → the last session mentioned

Always resolve ambiguity by asking "Which [entity] do you mean?" rather
than guessing.
```

This is purely prompt engineering — no code changes needed.

---

## 8. UI State Machine

### 8.1 Loading Indicator States

| State | Condition | Label | Dots |
|-------|-----------|-------|------|
| Idle | No request | Hidden | — |
| Tool Loop Running | `isLoading === true`, no content yet | "GoChul is thinking…" | 3 coral dots (existing) |
| Streaming Active | `isLoading === true`, content streaming | "Responding…" | 3 coral dots |
| Stream Complete | `isLoading === false` | Hidden | — |

**Implementation in `LoadingIndicator.tsx`:**
The component currently shows only State 1. Phase 5 adds State 2:

```tsx
// LoadingIndicator.tsx — Phase 5
interface LoadingIndicatorProps {
  label?: 'thinking' | 'responding'  // default: 'thinking'
}
```

Or infer from `isLoading && existingContentLength > 0`. The cleanest approach: pass `phase: 'thinking' | 'responding'` prop from the parent.

**Integration with `useChat`:**
`useChat`'s `isLoading` is `true` from the moment the request is sent until the stream completes. The transition from "thinking" to "responding" happens when the first token arrives. This requires knowing when streaming starts. Options:
1. Track `hasReceivedFirstChunk` in the component (infer from `messages` length > 0).
2. Pass `phase` from `AIChatbotModal` (which has access to both `isLoading` and message count).
3. The `useChat` `status` return value (`'submitted' | 'streaming' | 'ready' | 'error'`) indicates the streaming state.

**Recommendation:** Use `status === 'streaming'` (from `useChat`) to detect streaming active state. Pass to `LoadingIndicator`.

### 8.2 Streaming Cursor

Appended as last child of the last assistant bubble during `status === 'streaming'`:

```tsx
// Inside MessageBubble, when isStreaming:
<span
  className="inline-block w-2 h-4 bg-[--color-cta] rounded-sm ml-1"
  style={{ animation: 'chatbot-cursor-blink 1s step-end infinite' }}
  aria-hidden="true"
/>
```

CSS keyframe added to `globals.css`:
```css
@keyframes chatbot-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### 8.3 Bubble Type → Message Mapping

Since `useChat` manages messages, the `type` field (warning/nudge) must be passed through. AI SDK data stream supports custom data via `appendMessageData`. For Phase 5's simple approach, the route returns a JSON response for non-streaming types (proposal, warning, nudge) and a streaming response for text. Alternatively, use `useChat`'s `body` parameter to send `type` alongside each message, or use the `metadata` field on UIMessage.

**Recommended:** For warning/nudge bubbles, return JSON (non-streaming) with `type: 'warning'/'nudge'`. The `useChat` `onFinish` callback can inspect the response and push a manually constructed message with the correct type. This avoids protocol complexity.

```ts
// In useChat options:
onFinish(message) {
  // message is the final assistant UIMessage
}
```

But `onFinish` doesn't give us the raw JSON `type` field from the non-streaming response. Better approach: handle warning/nudge responses differently:

```ts
// MessageInput.tsx
const { messages, isLoading, append, ... } = useChat({
  api: '/api/ai-chatbot',
  onResponse(response) {
    // Check for our custom Content-Type or header
    if (response.headers.get('X-Chatbot-Type') === 'warning') {
      // Handle warning specially
    }
  }
})
```

**Simplest approach:** Always stream. For warning/nudge, stream the bubble text with a special prefix that the frontend can parse:

```
[data-stream]:{"type":"warning","suggestions":["9:00 AM","10:00 AM"]}
[data-stream]:{"type":"nudge","detectedLang":"en"}
```

The frontend's `useChat` `onChunk` or a custom parse layer handles this. But this adds complexity.

**Recommended for Phase 5:** Use non-streaming JSON for all non-text types (proposal, warning, nudge). Only use streaming for plain text responses. This is the cleanest approach and matches the existing Phase 3/4 pattern.

```ts
// route.ts
if (responseType === 'text') {
  return streamingResponse(botReply)
}
return NextResponse.json({ reply: botReply, type: responseType, ... })
```

In `MessageInput.tsx`, `useChat` defaults to `fetch` which handles both. The `onFinish` callback for JSON responses would fire with the parsed message. But `useChat` expects a streaming response for the `messages` state to update.

**The actual `useChat` behavior for non-streaming responses:**
`useChat` calls `fetch('/api/ai-chatbot', ...)` and reads `response.json()`. The message is added to the `messages` array. For non-streaming responses, `isLoading` goes false and the message appears. The `type` field is NOT part of the AI SDK message shape — it needs to be injected.

**Solution:** Extend the `useChat` message with custom metadata. One pattern:
```ts
// Route returns: { reply, type, id }
// Client sends: custom id prefix
// useChat's messages include our custom data
```

Or simpler: use the AI SDK's `data` feature:
```ts
// Route:
return result.toDataStreamResponse({ data: { type: 'warning', suggestions } })

// Client:
const { messages } = useChat({ ... })
// messages[messages.length - 1].data contains our type
```

The `toDataStreamResponse({ data })` sends custom data alongside the stream. `useChat` exposes this via `messages[].data`.

**Recommendation:** Use `toDataStreamResponse({ data: { type, suggestions } })` for streaming text responses with metadata. For non-text (proposal, warning, nudge), return a non-streaming `NextResponse.json` — and handle them as a special case by using `sendMessage` with `experimental_attachments` or a custom `onFinish` that reads the response headers.

Actually, the cleanest approach given the complexity: **Return all responses as streaming** using a manual `ReadableStream` that encodes the response type in the first chunk:

```ts
// route.ts — all responses stream
const encoder = new TextEncoder()
const stream = new ReadableStream({
  start(controller) {
    // First chunk: metadata
    controller.enqueue(encoder.encode(
      `0:${JSON.stringify({ type: responseType, suggestions: suggestions ?? [] })}\n`
    ))
    // Following chunks: text (for text type) or empty
    if (responseType === 'text') {
      for (const chunk of chunkText(botReply)) {
        controller.enqueue(encoder.encode(
          `0:${JSON.stringify({ type: 'text', textDelta: chunk })}\n`
        ))
      }
    }
    controller.close()
  }
})
return new Response(stream, {
  headers: { 'Content-Type': 'text/plain' }
})
```

This encodes both the type metadata and text deltas using the AI SDK's text chunk format. The frontend's `useChat` reads these chunks and assembles the message. The `type` field is accessible via the assembled message's metadata.

**Planning recommendation:** Defer the exact streaming protocol to the executor. The research finding is: **we need to encode type metadata alongside text chunks using the AI SDK data stream format**. The simplest working implementation is the manual `ReadableStream` approach described above.

---

## 9. File Changes Summary

### 9.1 New Files

| File | Purpose |
|------|---------|
| `src/lib/ratelimit.ts` | Upstash Redis + Ratelimit initialization |
| `src/app/api/ai-chatbot/route.ts` (modified) | Add rate limiting, streaming Response, warning/nudge types |

### 9.2 Modified Files

| File | Changes |
|------|---------|
| `src/app/api/ai-chatbot/route.ts` | Rate limiting middleware, streaming Response, warning/nudge detection |
| `src/lib/ai/anthropicService.ts` | Add `get_occupied_time_slots` dispatcher; keep `callClaudeWithTools` as-is |
| `src/lib/ai/toolDefinitions.ts` | Add `get_occupied_time_slots` tool definition |
| `src/lib/ai/systemPrompt.ts` | Add English time rules + inline entity reference section |
| `src/components/chatbot/MessageBubble.tsx` | Add `'warning'` and `'nudge'` variants |
| `src/components/chatbot/MessageInput.tsx` | Replace fetch + Zustand with `useChat` hook |
| `src/components/chatbot/MessageList.tsx` | Consume `useChat` messages directly |
| `src/components/chatbot/LoadingIndicator.tsx` | Add streaming-active state + label swap |
| `src/components/chatbot/AIChatbotModal.tsx` | Remove `clearMessages` on close; add `AIProvider` |
| `src/store/useAIChatbotStore.ts` | Remove messages/isLoading/addMessage/setLoading; keep isOpen/setOpen |
| `src/app/globals.css` | Add `chatbot-cursor-blink` keyframe |

### 9.3 No Changes Needed

- `FloatingFAB.tsx` — no visual changes per UI spec
- `src/lib/ai/formatters.ts` — may need a `formatConflictMessage()` helper if needed, but optional
- `docs/FEAT_AIBOT.txt` — update if behavior changes (language nudge, availability check)

---

## 10. Testing Considerations

### 10.1 Streaming Test
- Send a message → verify tokens appear progressively
- Verify cursor disappears when stream completes
- Verify "GoChul is thinking…" → "Responding…" transition

### 10.2 Warning Bubble Test
- Book a slot that conflicts → verify amber warning bubble
- Select an alternative from the list → verify normal confirmation bubble

### 10.3 Language Nudge Test
- Write in Vietnamese → switch to English mid-conversation → verify blue nudge bubble
- Verify bot continues in English after nudge

### 10.4 Rate Limiting Test
- Send 20+ rapid requests → verify 429 response with user-friendly message
- Verify rate limit resets after the window

### 10.5 `useChat` Migration Test
- Open modal → send message → verify stream works
- Close modal → reopen → verify greeting shown (messages cleared)
- Confirm button (proposal) → verify `append` sends correctly

### 10.6 Entity Reference Test
- Ask for contract list → say "cái thứ 2" → verify correct contract resolved

---

## 11. Open Questions for Planning

These are resolved by the research above but flagged for the planner's awareness:

| # | Question | Resolution | Notes |
|---|----------|-----------|-------|
| 1 | Two LLM calls (tool loop + streaming) or one? | Accept two calls OR use manual `ReadableStream` for pre-computed text | Manual stream avoids second call; recommended |
| 2 | How to pass `type: 'warning'/'nudge'` through `useChat`? | Use AI SDK data stream metadata or non-streaming JSON fallback | See §8.3 |
| 3 | Where to put `AIProvider` wrapper? | `MainLayout.tsx` wrapping `<AIChatbotModal />` | Or inside `AIChatbotModal` if no other chatbot pages |
| 4 | Does `getOccupiedTimeSlots` need a new API route? | No — `GET /api/history/getAll` with filters suffices | Dispatcher filters client-side |
| 5 | Does Phase 4 `callClaudeWithTools` change? | No structural changes | Only the call site in route.ts changes |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Double LLM call overhead (tool loop + streamText) | Medium | Latency | Use manual `ReadableStream` for pre-computed text; no second call |
| `useChat` + Zustand conflict during migration | Medium | UX bug | Remove Zustand message state before deploying; thorough QA |
| Rate limit false positives (same user, multiple tabs) | Low | UX annoyance | 20 req/min is generous; userId key is correct |
| Warning bubble re-renders during streaming | Low | Visual glitch | Warning responses are non-streaming (JSON); only text responses stream |
| `prefers-reduced-motion` not respected | Low | Accessibility | Add media query override for cursor blink animation |

---

## 13. Key Documentation Links

- [Vercel AI SDK — `createAnthropic`](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) — Custom baseURL + API key configuration
- [Vercel AI SDK — `streamText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) — Server-side streaming utility
- [Vercel AI SDK — `useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) — Client-side streaming hook
- [Vercel AI SDK — `toDataStreamResponse`](https://ai-sdk.dev/docs/ai-sdk-core/streaming) — Streaming response helper
- [@upstash/ratelimit](https://upstash.com/docs/ratelimit) — Redis-based rate limiting for Next.js
- [AI SDK GitHub](https://github.com/vercel/ai) — `packages/anthropic` and `packages/react`

---

*Research complete. Ready for planning.*
