---
phase: 5
slug: polish
status: draft
wave: 1 of 4
depends_on: []
files_modified:
  - src/app/api/ai-chatbot/route.ts
  - src/lib/ai/anthropicService.ts
  - src/lib/ai/toolDefinitions.ts
  - src/lib/ai/systemPrompt.ts
  - src/lib/ai/streamUtils.ts
  - src/lib/ratelimit.ts
  - src/components/chatbot/MessageInput.tsx
  - src/components/chatbot/MessageList.tsx
  - src/components/chatbot/MessageBubble.tsx
  - src/components/chatbot/LoadingIndicator.tsx
  - src/components/chatbot/AIChatbotModal.tsx
  - src/store/useAIChatbotStore.ts
  - src/app/globals.css
requirements: []
autonomous: false
must_haves:
  - Bot responses stream token-by-token with no double LLM call
  - "cái thứ 2" resolves to correct entity via prompt instructions
  - Warning bubble renders amber when slot conflict detected
  - Nudge bubble renders blue when language switch detected
  - Rate limit returns HTTP 429 with user-friendly message
  - All Zustand message/loading state replaced by useChat
---

# Phase 5: Polish — Implementation Plan

## Overview

Phase 5 adds production-quality enhancements: streaming token-by-token rendering, inline entity reference resolution, availability checking, English time parsing, rate limiting, and cross-language nudge. No new v1 requirements.

**Key decisions carried forward:**
- D-03: Stream final output only — `callClaudeWithTools()` runs to completion server-side; only the final text is streamed (no double LLM call)
- D-02: Replace Zustand message/loading state with `useChat` from `@ai-sdk/react`
- D-04: Entity reference resolution via system prompt instructions (no new API routes)
- D-05: `get_occupied_time_slots` added as a separate tool in `TOOL_DEFINITIONS`
- D-08: Rate limiting via `@upstash/ratelimit` + `@upstash/redis` (20 req/min per userId)
- D-10: Language switch nudge via inline warning bubble (no buttons)

---

## Wave 1 — Packages

### W1-T1: Install Phase 5 packages

**Read first:** `package.json`

**Action:**
```bash
npm install ai @ai-sdk/react @upstash/ratelimit @upstash/redis
```

**Acceptance criteria:**
- `package.json` contains `"ai": ` with any version
- `package.json` contains `"@ai-sdk/react": ` with any version
- `package.json` contains `"@upstash/ratelimit": ` with any version
- `package.json` contains `"@upstash/redis": ` with any version
- `node_modules/ai` directory exists (packages installed)

---

## Wave 2 — Server-Side Infrastructure

### W2-T1: Add `get_occupied_time_slots` tool definition

**Read first:** `src/lib/ai/toolDefinitions.ts`

**Action:** Append the following `get_occupied_time_slots` tool export and add it to `TOOL_DEFINITIONS` array (add as item 11):

```ts
// ─────────────────────────────────────────────────────────────────────────────
// 11. get_occupied_time_slots (Phase 5)
// ─────────────────────────────────────────────────────────────────────────────
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

And update `TOOL_DEFINITIONS`:
```ts
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
  // Phase 5 additions:
  get_occupied_time_slots,  // ← ADD THIS
]
```

**Acceptance criteria:**
- `toolDefinitions.ts` exports `get_occupied_time_slots`
- `TOOL_DEFINITIONS` array has 11 items (was 10)
- `toolDefinitions.ts` contains the string `'get_occupied_time_slots'`

---

### W2-T2: Add `get_occupied_time_slots` dispatcher

**Read first:** `src/lib/ai/anthropicService.ts`

**Action:** Add a new case to the `dispatchTool()` switch inside `executeTool()`. After the `default: throw new Error(...)` line, add:

```ts
    case 'get_occupied_time_slots': {
      // Fetch non-canceled sessions for this trainer on this date
      const dayStart = new Date(Number(input.date)).setHours(0, 0, 0, 0)
      const dayEnd = new Date(Number(input.date)).setHours(23, 59, 59, 999)
      const params = new URLSearchParams({
        teach_by: String(input.trainer_id),
        start_date: String(dayStart),
        end_date: String(dayEnd),
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

Also ensure `detectLanguage` is exported (it already is — verify it has `export` keyword).

**Acceptance criteria:**
- `anthropicService.ts` contains `case 'get_occupied_time_slots':`
- `anthropicService.ts` exports `detectLanguage`
- `dispatchTool` function handles all 11 tool names without throwing "Unknown tool"

---

### W2-T3: Add English time parsing + entity reference rules to system prompt

**Read first:** `src/lib/ai/systemPrompt.ts`

**Action:** In `buildSystemPrompt()`, find the `## TIME CONVENTIONS (Vietnam / UTC+7)` section. After the line `Convert 24h time to 12-hour format...`, add:

```
## TIME CONVENTIONS — English (Phase 5 Addition)

When a user writes in English, interpret these expressions:
- "tomorrow at 9am" → next day's 9:00 AM (540 minutes from midnight)
- "next Thursday" → the upcoming Thursday's date
- "this weekend" → Saturday of the current week
- "in 2 hours" → current time + 2 hours
- "next week" → Monday of next week
- "at noon" → 12:00 PM (720 minutes)
- "at midnight" → 12:00 AM (0 minutes)
- "this Monday" / "this Friday" → the Monday/Friday of the current week

Always interpret relative dates from the current server date (UTC+7).
For ambiguous times (e.g., "9am" without a date), use today if the user hasn't
specified otherwise, or ask for clarification.
```

Also add a new section after `## BEHAVIOR RULES`:

```
## INLINE ENTITY REFERENCES (Phase 5)

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

**Acceptance criteria:**
- `systemPrompt.ts` contains `"tomorrow at 9am" → next day's 9:00 AM`
- `systemPrompt.ts` contains `"cái thứ 2" → item labeled [2]"`
- `systemPrompt.ts` contains `"inline entity reference" section heading

---

### W2-T4: Add Upstash rate limit library

**Read first:** (new file — no read required)

**Action:** Create `src/lib/ratelimit.ts`:

```ts
/**
 * Upstash Redis + Ratelimit initialization for the AI chatbot.
 * Phase 5: Rate limiting on POST /api/ai-chatbot (20 req/min per userId).
 * @file src/lib/ratelimit.ts
 */

import 'server-only'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiter: 20 requests per minute, per authenticated userId.
 * Falls back to IP for unauthenticated requests (route returns 401 before
 * reaching this, so this is a safety net only).
 */
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
})
```

**Acceptance criteria:**
- `src/lib/ratelimit.ts` exists
- `src/lib/ratelimit.ts` exports `ratelimit`
- File contains `'server-only'`
- File contains `Ratelimit.slidingWindow(20, '1 m')`

---

### W2-T5: Create streaming utility helper

**Read first:** (new file)

**Action:** Create `src/lib/ai/streamUtils.ts`:

```ts
/**
 * Server-side streaming utilities for the AI chatbot.
 * Phase 5: Converts pre-computed text into AI SDK data stream format
 * so useChat can consume it as a streaming Response.
 * @file src/lib/ai/streamUtils.ts
 */

import 'server-only'

/**
 * Chunks a string into small pieces for smooth streaming.
 */
function chunkText(text: string, chunkSize = 10): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Creates a ReadableStream in AI SDK data stream format.
 * Format: `0:${JSON.stringify({ type: 'text', textDelta: chunk })}\n`
 * This is consumed by useChat's fetch transport.
 *
 * @param text - The pre-computed bot reply from callClaudeWithTools()
 * @param metadata - Optional metadata to include alongside the text
 */
export function textToStream(
  text: string,
  metadata?: Record<string, unknown>
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      // Send metadata as first chunk if provided
      if (metadata) {
        controller.enqueue(
          encoder.encode(`0:${JSON.stringify(metadata)}\n`)
        )
      }
    },
    pull(controller) {
      const chunks = chunkText(text)
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`0:${JSON.stringify({ type: 'text', textDelta: chunk })}\n`)
        )
      }
      controller.close()
    },
  })
}
```

**Acceptance criteria:**
- `src/lib/ai/streamUtils.ts` exists
- Exports `textToStream`
- Contains `ReadableStream` creation
- Contains AI SDK data stream format (`type: 'text', textDelta:`)

---

### W2-T6: Add rate limiting + streaming + language nudge to route handler

**Read first:** `src/app/api/ai-chatbot/route.ts`

**Action:** The route handler is overhauled. The complete new file content is:

```ts
/**
 * POST /api/ai-chatbot — GoChul Fitness AI Chatbot route handler.
 *
 * Phase 1: Verifies auth, resolves role, builds system prompt.
 * Phase 3: Accepts messages[] array, returns type + bot response.
 * Phase 4: Implements tool-use loop.
 * Phase 5: Adds rate limiting, streaming Response, and language nudge.
 *
 * @file src/app/api/ai-chatbot/route.ts
 */

import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/lib/ai/systemPrompt'
import { callClaudeWithTools, detectLanguage } from '@/lib/ai/anthropicService'
import { requireRole } from '@/lib/roleCheck'
import { ratelimit } from '@/lib/ratelimit'
import { textToStream } from '@/lib/ai/streamUtils'
import type { Role } from '@/app/type/api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AIChatRequestBody = {
  message: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(request: Request) {
  // ── 1. Authenticate ─────────────────────────────────────────────────────────
  const authCtx = await auth()
  const { userId } = authCtx

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized — please sign in to use the chatbot' },
      { status: 401 }
    )
  }

  // ── 2. Rate limiting (Phase 5) ───────────────────────────────────────────────
  const { success: rateOk, remaining, reset } = await ratelimit.limit(userId)
  if (!rateOk) {
    return NextResponse.json(
      {
        error: "You're sending messages too quickly. Please wait a moment and try again.",
        type: 'nudge',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      }
    )
  }

  // ── 3. Parse request body ────────────────────────────────────────────────────
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

  // ── 4. Resolve user role ─────────────────────────────────────────────────────
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

  // ── 5. Get Clerk token for API forwarding ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clerkToken: string | null = await authCtx.getToken({ template: 'gochul-fitness' })

  // ── 6. Build system prompt ───────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    role: userRole,
    userName,
    userInstantId,
  })

  // ── 7. Build conversation messages ───────────────────────────────────────────
  const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(body.messages ?? []),
    { role: 'user', content: body.message },
  ]

  // ── 8. Language switch detection (Phase 5) ───────────────────────────────────
  const userMessages = conversationMessages.filter(m => m.role === 'user')
  const lastTwoUsers = userMessages.slice(-2)
  const langSwitched =
    lastTwoUsers.length >= 2 &&
    detectLanguage([lastTwoUsers[lastTwoUsers.length - 2]]) !==
      detectLanguage([lastTwoUsers[lastTwoUsers.length - 1]])

  if (langSwitched) {
    const currentLang = detectLanguage([lastTwoUsers[lastTwoUsers.length - 1]])
    const detectedLabel = currentLang === 'vi' ? 'Vietnamese' : 'English'
    const nudgeText = `I noticed you switched language. I'll respond in ${detectedLabel}.`
    const nudgeMessages = [
      ...(body.messages ?? []),
      { role: 'user', content: body.message },
      { role: 'assistant', content: nudgeText },
    ]
    // Stream nudge as a non-streaming JSON response (small message, no streaming needed)
    return NextResponse.json({
      reply: nudgeText,
      type: 'nudge' as const,
      detectedLang: currentLang,
      messages: nudgeMessages,
    })
  }

  // ── 9. Call Claude with tool-use loop ───────────────────────────────────────
  let callResult: { type: 'text' | 'proposal'; text: string }
  try {
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

  // ── 10. Return response ──────────────────────────────────────────────────────
  if (responseType === 'proposal') {
    return NextResponse.json({
      reply: botReply,
      type: 'proposal' as const,
      role: userRole,
      messages: finalMessages,
    })
  }

  // Stream text response using AI SDK data stream format (Phase 5)
  const stream = textToStream(botReply)
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(reset),
    },
  })
}
```

**Acceptance criteria:**
- `route.ts` imports `ratelimit` from `@/lib/ratelimit`
- `route.ts` imports `textToStream` from `@/lib/ai/streamUtils`
- `route.ts` imports `detectLanguage` from `@/lib/ai/anthropicService`
- `route.ts` calls `ratelimit.limit(userId)` before processing
- `route.ts` returns HTTP 429 with friendly message when rate limited
- `route.ts` detects language switch and returns `type: 'nudge'` nudge bubble
- `route.ts` returns a streaming `Response` (not `NextResponse.json`) for text responses
- `route.ts` contains "I noticed you switched language"
- `route.ts` returns JSON `NextResponse.json` for `proposal` type

---

## Wave 3 — Client State Migration

### W3-T1: Slim Zustand store (remove messages/loading)

**Read first:** `src/store/useAIChatbotStore.ts`

**Action:** Replace the entire store with:

```ts
'use client'

import { create } from 'zustand'

interface AIChatbotStore {
  isOpen: boolean
  setOpen: (v: boolean) => void
  // REMOVED in Phase 5 (migrated to useChat from ai/react):
  // messages, isLoading, addMessage, setLoading, clearMessages
}

export const useAIChatbotStore = create<AIChatbotStore>((set) => ({
  isOpen: false,
  setOpen: (v) => set({ isOpen: v }),
}))

// Keep ChatMessage type for backwards compatibility (used by MessageBubble props)
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** Phase 3+: 'normal' | 'error'; Phase 5 adds: 'proposal' | 'warning' | 'nudge' */
  type?: 'normal' | 'error' | 'proposal' | 'warning' | 'nudge'
}
```

**Acceptance criteria:**
- `useAIChatbotStore.ts` does NOT export `messages`, `isLoading`, `addMessage`, `setLoading`, `clearMessages`
- `useAIChatbotStore.ts` exports only `isOpen` and `setOpen`
- `AIChatbotStore` interface has exactly 2 fields
- `ChatMessage` type is exported for backwards compatibility

---

### W3-T2: Replace MessageInput Zustand wiring with useChat hook

**Read first:** `src/components/chatbot/MessageInput.tsx`

**Action:** Rewrite `MessageInput.tsx`:

```tsx
'use client'

import { useChat } from 'ai/react'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'
import MessageList from './MessageList'

interface MessageInputProps {
  onConfirm?: () => void
}

export default function MessageInput({ onConfirm }: MessageInputProps) {
  // Keep Zustand for modal open/close tracking only
  useAIChatbotStore()

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    status,
    append,
  } = useChat({
    api: '/api/ai-chatbot',
  })

  // Confirm flow: called when user clicks "Confirm" on a proposal bubble.
  // Uses useChat's append() to inject the CONFIRMED message into the stream.
  const handleConfirm = () => {
    if (isLoading) return
    const lastBotMsg = messages[messages.length - 1]
    if (!lastBotMsg) return
    append({ role: 'user', content: 'CONFIRMED' })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <>
      <MessageList
        messages={messages}
        isLoading={isLoading}
        status={status}
        onConfirm={handleConfirm}
      />
      <div className="flex items-center gap-2 px-4 py-3 border-t bg-background">
        <Input
          aria-label="Chat message"
          placeholder="Ask about your contracts or training sessions..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className={cn(
            'h-9 rounded-full bg-muted/50 border-input flex-1 text-sm',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
          disabled={isLoading}
          className={cn(
            'size-8 rounded-full flex items-center justify-center shrink-0',
            'bg-[var(--color-cta)] text-white',
            'transition-colors hover:bg-[var(--color-cta-hover)]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-cta)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
```

**Acceptance criteria:**
- `MessageInput.tsx` imports `useChat` from `'ai/react'`
- `MessageInput.tsx` imports `append` from `useChat`
- `MessageInput.tsx` does NOT import `addMessage`, `setLoading`, `isLoading` from Zustand
- `MessageInput.tsx` does NOT import `messages` from Zustand
- `MessageInput.tsx` passes `messages`, `isLoading`, `status` as props to `MessageList`
- `MessageInput.tsx` calls `append({ role: 'user', content: 'CONFIRMED' })` for confirm
- `handleSubmit` is called on Enter key and button click

---

### W3-T3: Update MessageList to consume useChat props

**Read first:** `src/components/chatbot/MessageList.tsx`

**Action:** Replace `MessageList.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import MessageBubble from './MessageBubble'
import LoadingIndicator from './LoadingIndicator'

const GREETING = "Hi! I'm your GoChul assistant. Ask me about your contracts or training sessions."

interface MessageListProps {
  messages: UIMessage[]
  isLoading: boolean
  status: 'submitted' | 'streaming' | 'ready' | 'error'
  onConfirm?: () => void
}

export default function MessageList({
  messages,
  isLoading,
  status,
  onConfirm,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const hasMessages = messages.length > 0
  const isStreaming = status === 'streaming'
  const lastMsg = messages[messages.length - 1]
  const showCursor = isStreaming && lastMsg?.role === 'assistant'

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {!hasMessages && (
        <MessageBubble
          message={{
            id: 'greeting',
            role: 'assistant',
            content: GREETING,
            timestamp: 0,
          }}
          onConfirm={undefined}
          isStreaming={false}
        />
      )}

      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1
        const msgType = (msg as any).type as 'normal' | 'error' | 'proposal' | 'warning' | 'nudge' | undefined

        return (
          <MessageBubble
            key={msg.id}
            message={{
              id: String(msg.id),
              role: msg.role as 'user' | 'assistant',
              content: String(msg.content),
              timestamp: 0,
              type: msgType,
            }}
            onConfirm={
              msg.role === 'assistant' &&
              msgType === 'proposal' &&
              isLast &&
              onConfirm
                ? onConfirm
                : undefined
            }
            isStreaming={isLast && isStreaming}
          />
        )
      })}

      {isLoading && (
        <LoadingIndicator
          phase={isStreaming ? 'responding' : 'thinking'}
          hasContent={showCursor}
        />
      )}

      {/* Invisible anchor for scroll-into-view */}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  )
}
```

**Acceptance criteria:**
- `MessageList.tsx` imports `UIMessage` from `'ai'`
- `MessageList.tsx` does NOT import from `useAIChatbotStore`
- `MessageList.tsx` accepts `messages`, `isLoading`, `status` as props
- `MessageList.tsx` passes `phase` and `hasContent` to `LoadingIndicator`
- `MessageList.tsx` passes `isStreaming` to `MessageBubble`
- `MessageList.tsx` reads `type` from `(msg as any).type`

---

### W3-T4: Add AIProvider wrapper to AIChatbotModal

**Read first:** `src/components/chatbot/AIChatbotModal.tsx`

**Action:** Wrap the modal content with `AIProvider` from `@ai-sdk/react`. Remove `clearMessages` calls from `handleClose` and the `useEffect`:

```tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AIProvider } from '@ai-sdk/react'
import { XIcon, Bot } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'
import MessageInput from './MessageInput'

export default function AIChatbotModal() {
  const pathname = usePathname()
  const { isOpen, setOpen } = useAIChatbotStore()

  // Auto-close on route change (no longer clears messages — useChat manages state)
  useEffect(() => {
    if (isOpen) {
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          'fixed bottom-0 right-0 top-auto translate-x-0 translate-y-0',
          'w-full rounded-b-none rounded-t-2xl',
          'flex flex-col p-0 gap-0',
          'sm:rounded-2xl sm:bottom-6 sm:right-6 sm:top-auto sm:max-w-[400px] sm:h-[560px] sm:translate-x-0 sm:translate-y-0'
        )}
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 px-4 py-3 border-b shrink-0">
          {/* Bot avatar */}
          <div
            className="size-8 rounded-full bg-[var(--color-cta)] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Bot className="h-4 w-4 text-white" />
          </div>
          <DialogTitle id="ai-chatbot-title" className="text-base font-semibold leading-none">
            AI Assistant
          </DialogTitle>

          {/* Custom close button */}
          <button
            aria-label="Close chat"
            onClick={handleClose}
            className={cn(
              'absolute top-2 right-2',
              'size-7 rounded-[min(var(--radius-md),12px)]',
              'flex items-center justify-center',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* AI SDK provider wraps the chat components */}
        <AIProvider>
          <MessageInput />
        </AIProvider>
      </DialogContent>
    </Dialog>
  )
}
```

**Acceptance criteria:**
- `AIChatbotModal.tsx` imports `AIProvider` from `'@ai-sdk/react'`
- `AIChatbotModal.tsx` does NOT import `clearMessages` from Zustand
- `AIChatbotModal.tsx` wraps `<MessageInput />` with `<AIProvider>`
- `useEffect` on pathname change calls `setOpen(false)` only (no `clearMessages`)

---

## Wave 4 — UI Enhancements

### W4-T1: Add warning + nudge variants + streaming cursor to MessageBubble

**Read first:** `src/components/chatbot/MessageBubble.tsx`

**Action:** Update `MessageBubble.tsx` — add imports, update interface, and add variant rendering:

```tsx
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, AlertCircle, AlertTriangle, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/store/useAIChatbotStore'

interface MessageBubbleProps {
  message: ChatMessage
  onConfirm?: () => void
  /** Phase 5: true when this is the last assistant message and stream is active */
  isStreaming?: boolean
}

const markdownStyles =
  'text-sm leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_thead]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1'

export default function MessageBubble({ message, onConfirm, isStreaming = false }: MessageBubbleProps) {
  const { role, content, type } = message
  const isError = type === 'error'
  const isWarning = type === 'warning'
  const isNudge = type === 'nudge'

  // ── User bubble ──────────────────────────────────────────────────────────────
  if (role === 'user') {
    return (
      <div
        aria-label="User message"
        role="note"
        className={cn(
          'max-w-[75%] ml-auto flex flex-col items-end gap-1',
          'px-3 py-2 rounded-2xl rounded-br-md',
          'bg-[var(--color-cta)] text-white text-sm leading-relaxed',
          'animate-in slide-in-from-bottom-1 duration-200'
        )}
      >
        <span>{content}</span>
      </div>
    )
  }

  // ── Bot bubble variants ───────────────────────────────────────────────────────
  const avatarBg = isWarning
    ? 'bg-[var(--color-warning)]'
    : isNudge
    ? 'bg-blue-100'
    : isError
    ? 'bg-red-100'
    : 'bg-[var(--color-cta)]'

  const AvatarIcon = isWarning
    ? AlertTriangle
    : isNudge
    ? Languages
    : isError
    ? AlertCircle
    : Bot

  const iconColor = isWarning
    ? 'text-[var(--color-warning)]'
    : isNudge
    ? 'text-blue-700'
    : isError
    ? 'text-red-500'
    : 'text-white'

  const bubbleClasses = isWarning
    ? 'bg-[var(--color-warning-bg)] text-[#7A3E00] border-l-2 border-[var(--color-warning)] px-3 py-2 rounded-2xl rounded-bl-md'
    : isNudge
    ? 'bg-blue-50 text-blue-700 px-3 py-2 rounded-2xl rounded-bl-md text-[13px]'
    : isError
    ? 'bg-red-50 text-red-700 px-3 py-2 rounded-2xl rounded-bl-md'
    : 'bg-muted text-foreground px-3 py-2 rounded-2xl rounded-bl-md'

  return (
    <div
      aria-label={isWarning ? 'Availability warning' : isNudge ? 'Language notice' : 'AI Assistant response'}
      role="note"
      className="flex items-start gap-2 animate-in slide-in-from-bottom-1 duration-200"
    >
      {/* Bot avatar */}
      <div
        className={cn(
          'size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          avatarBg
        )}
        aria-hidden="true"
      >
        <AvatarIcon className="h-4 w-4" style={{ color: iconColor.startsWith('text-') ? undefined : iconColor } as React.CSSProperties} />
        {/* Fallback: use cn() for static icon colors */}
        {isWarning && <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />}
        {isNudge && !isWarning && <Languages className="h-4 w-4 text-blue-700" />}
        {!isWarning && !isNudge && isError && <AlertCircle className="h-4 w-4 text-red-500" />}
        {!isWarning && !isNudge && !isError && <Bot className="h-4 w-4 text-white" />}
      </div>

      <div className={cn('max-w-[75%] text-sm leading-relaxed', bubbleClasses)}>
        {isNudge ? (
          // Nudge: plain text, no markdown, no confirm button
          <span>{content}</span>
        ) : isError ? (
          // Error: plain text, no markdown
          <span>{content}</span>
        ) : (
          // Normal / proposal / warning: markdown + optional streaming cursor + optional confirm button
          <div className={cn(!isError && markdownStyles)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {/* Streaming cursor */}
            {isStreaming && (
              <span
                className="inline-block w-2 h-4 bg-[var(--color-cta)] rounded-sm ml-1 align-middle"
                style={{ animation: 'chatbot-cursor-blink 1s step-end infinite' }}
                aria-hidden="true"
              />
            )}
            {/* Confirm button for proposal */}
            {type === 'proposal' && onConfirm && (
              <button
                type="button"
                aria-label="Confirm action"
                onClick={onConfirm}
                className={cn(
                  'self-start h-8 px-4 rounded-full mt-2',
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
    </div>
  )
}
```

**Simplified avatar icon rendering (cleaner approach):**

Replace the avatar icon section with a cleaner conditional:

```tsx
      <div
        className={cn(
          'size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          avatarBg
        )}
        aria-hidden="true"
      >
        {isWarning && <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />}
        {isNudge && <Languages className="h-4 w-4 text-blue-700" />}
        {isError && !isWarning && !isNudge && <AlertCircle className="h-4 w-4 text-red-500" />}
        {!isWarning && !isNudge && !isError && <Bot className="h-4 w-4 text-white" />}
      </div>
```

**Acceptance criteria:**
- `MessageBubble.tsx` imports `AlertTriangle` from `lucide-react`
- `MessageBubble.tsx` imports `Languages` from `lucide-react`
- `MessageBubble.tsx` renders amber warning bubble with `bg-[var(--color-warning-bg)]` and `border-l-2 border-[var(--color-warning)]`
- `MessageBubble.tsx` renders blue nudge bubble with `bg-blue-50 text-blue-700`
- `MessageBubble.tsx` renders `AlertTriangle` icon for warning bubbles
- `MessageBubble.tsx` renders `Languages` icon for nudge bubbles
- `MessageBubble.tsx` accepts `isStreaming?: boolean` prop
- `MessageBubble.tsx` renders streaming cursor when `isStreaming === true`
- Warning bubble renders markdown via `ReactMarkdown`
- Nudge bubble renders plain `<span>` (no markdown)
- Proposal bubble renders Confirm button when `onConfirm` is provided

---

### W4-T2: Update LoadingIndicator with streaming state

**Read first:** `src/components/chatbot/LoadingIndicator.tsx`

**Action:** Replace the component:

```tsx
'use client'

interface LoadingIndicatorProps {
  /** 'thinking' = initial tool loop; 'responding' = streaming active */
  phase?: 'thinking' | 'responding'
  /** true when content has started appearing in the last assistant bubble */
  hasContent?: boolean
}

export default function LoadingIndicator({
  phase = 'thinking',
  hasContent = false,
}: LoadingIndicatorProps) {
  const label = hasContent ? 'Responding...' : 'GoChul is thinking...'

  return (
    <div
      className="flex items-center gap-1.5 px-4 py-2"
      aria-live="polite"
      aria-label={hasContent ? 'AI is responding' : 'AI is thinking'}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-cta)]"
          style={{
            animation: `chatbot-dot-bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{label}</span>
      <style>{`
        @keyframes chatbot-dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
```

**Acceptance criteria:**
- `LoadingIndicator.tsx` accepts `phase?: 'thinking' | 'responding'` prop
- `LoadingIndicator.tsx` accepts `hasContent?: boolean` prop
- When `hasContent === false`: label is "GoChul is thinking..."
- When `hasContent === true`: label is "Responding..."
- Dot bounce animation is unchanged

---

### W4-T3: Add streaming cursor keyframe to globals.css

**Read first:** `src/app/globals.css`

**Action:** Append to `globals.css`:

```css
/* Phase 5: Chatbot streaming cursor blink animation */
@keyframes chatbot-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  [style*="chatbot-cursor-blink"],
  .chatbot-cursor-blink {
    animation-duration: 0.01ms !important;
  }
}
```

**Acceptance criteria:**
- `globals.css` contains `chatbot-cursor-blink` keyframe definition
- `globals.css` contains `prefers-reduced-motion` media query override for cursor

---

## Verification Checklist

After all waves complete, verify:

- [ ] `POST /api/ai-chatbot` returns HTTP 200 with streaming `Response` for text type (use `curl -N` to see chunked output)
- [ ] Rate limiting: 20+ rapid requests returns HTTP 429 with friendly error message
- [ ] Language switch: Send Vietnamese message then English message → `type: 'nudge'` returned
- [ ] `TOOL_DEFINITIONS` has 11 items (added `get_occupied_time_slots`)
- [ ] `anthropicService.ts` contains `case 'get_occupied_time_slots':` dispatcher
- [ ] `systemPrompt.ts` contains English time rules (`"tomorrow at 9am"`) AND entity reference rules (`"cái thứ 2"`)
- [ ] `useAIChatbotStore` exports only `isOpen` and `setOpen` (messages/loading removed)
- [ ] `MessageInput.tsx` imports `useChat` from `'ai/react'`
- [ ] `MessageInput.tsx` calls `append({ role: 'user', content: 'CONFIRMED' })` for confirm
- [ ] `MessageList.tsx` accepts `messages`, `isLoading`, `status` as props (not Zustand)
- [ ] `AIChatbotModal.tsx` wraps `<MessageInput />` with `<AIProvider>`
- [ ] `AIChatbotModal.tsx` removes `clearMessages` from close handler
- [ ] `MessageBubble.tsx` renders `warning` type with amber styles and `AlertTriangle` icon
- [ ] `MessageBubble.tsx` renders `nudge` type with blue-50 bg and `Languages` icon
- [ ] `MessageBubble.tsx` renders streaming cursor when `isStreaming === true`
- [ ] `LoadingIndicator.tsx` shows "GoChul is thinking…" when `hasContent === false`
- [ ] `LoadingIndicator.tsx` shows "Responding…" when `hasContent === true`
- [ ] `globals.css` contains `chatbot-cursor-blink` keyframe
- [ ] `src/lib/ratelimit.ts` exists and exports `ratelimit`
- [ ] `src/lib/ai/streamUtils.ts` exists and exports `textToStream`
- [ ] `route.ts` imports and calls `ratelimit.limit(userId)`
- [ ] `route.ts` imports and uses `textToStream`
- [ ] `route.ts` imports and uses `detectLanguage`
- [ ] `route.ts` returns streaming `Response` for text type
- [ ] `route.ts` returns `NextResponse.json` for `proposal` type
- [ ] TypeScript build passes with no errors

---

*Plan created: 2026-04-04*
*Phase: 05-polish*
*Corrected: stale confirm flow snippet removed; useChat `append` used instead of raw fetch*
