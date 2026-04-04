---
gsd_phase_version: 1.0
phase: 3
slug: 03-wire-api-route-to-client
status: draft
wave: 1
depends_on: []
requirements:
  - THRD-03
  - THRD-04
  - API-01
  - API-02
  - API-03
  - API-04
  - API-05
  - API-06
  - API-07
  - API-08
  - API-09
  - API-10
files_modified:
  - src/store/useAIChatbotStore.ts
  - src/components/chatbot/MessageBubble.tsx
  - src/components/chatbot/MessageInput.tsx
  - src/app/api/ai-chatbot/route.ts
autonomous: true
---

# Phase 3 — Wire API Route to Client

**Goal:** Connect the client shell to the API route. Verify Clerk cookie forwarding works end-to-end. Non-streaming responses only.

---

## must_haves (goal-backward verification)

1. Sending a message in the modal triggers a `POST /api/ai-chatbot` fetch with the full conversation history in the request body
2. The bot's response appears as a bubble in the thread within 5 seconds (Phase 1 placeholder AI response)
3. The `isLoading` spinner is visible during the fetch and disappears after the response is rendered
4. The Clerk session cookie is forwarded correctly — the API route authenticates as the logged-in user (response includes the correct role)
5. A second message in the same session is sent alongside the first message in the request body (multi-turn context verified)
6. Error responses from the API render as error-style bubbles (red bg, red text, AlertCircle icon) inside the thread without crashing it

---

## Wave 1 — Add `type` to store + error bubble variant (parallel)

### Task 1 — Extend ChatMessage type with `type?: 'normal' | 'error'`

**<read_first>**
- `src/store/useAIChatbotStore.ts` — current store interface to modify
</read_first>

**<acceptance_criteria>**
- `grep "type?: 'normal' | 'error'" src/store/useAIChatbotStore.ts` returns the line
- `grep "export interface ChatMessage" src/store/useAIChatbotStore.ts` returns the full interface declaration (5 fields total)
- `npx tsc --noEmit` exits 0
</acceptance_criteria>

**<action>**
In `src/store/useAIChatbotStore.ts`, add `type?: 'normal' | 'error'` to the exported `ChatMessage` interface:

```typescript
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  type?: 'normal' | 'error'   // ← Phase 3: optional error flag
}
```

The `type` field is optional so the store is backward-compatible with all Phase 2 `addMessage` calls (they omit `type`, defaulting to `undefined` which renders as a normal bubble).
</action>

---

### Task 2 — Add error bubble variant to MessageBubble

**<read_first>**
- `src/components/chatbot/MessageBubble.tsx` — current bubble component
- `src/lib/utils.ts` — `cn()` utility
</read_first>

**<acceptance_criteria>**
- `grep "AlertCircle" src/components/chatbot/MessageBubble.tsx` returns the import and JSX usage
- `grep "bg-red-50 text-red-700" src/components/chatbot/MessageBubble.tsx` returns the error bubble class
- `grep "bg-red-100" src/components/chatbot/MessageBubble.tsx` returns the error avatar background
- `grep "text-red-500" src/components/chatbot/MessageBubble.tsx` returns the error icon color
- `grep "isError" src/components/chatbot/MessageBubble.tsx` returns ≥4 occurrences
- `grep "<span>{content}</span>" src/components/chatbot/MessageBubble.tsx` returns the plain-text error render (no ReactMarkdown)
- `npx tsc --noEmit` exits 0
</acceptance_criteria>

**<action>**
In `src/components/chatbot/MessageBubble.tsx`:

1. Add `AlertCircle` to the `lucide-react` import (keep existing `Bot`):
```typescript
import { Bot, AlertCircle } from 'lucide-react'
```

2. Add the error detection constant after existing declarations:
```typescript
const isError = message.type === 'error'
```

3. Replace the bot bubble block (the branch with `aria-label="AI Assistant response"`) with a conditional render. The bot avatar section becomes:
```typescript
{/* Bot avatar */}
<div
  className={cn(
    'size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
    isError ? 'bg-red-100' : 'bg-[var(--color-cta)]'
  )}
  aria-hidden="true"
>
  {isError ? (
    <AlertCircle className="h-4 w-4 text-red-500" />
  ) : (
    <Bot className="h-4 w-4 text-white" />
  )}
</div>
```

4. The bot bubble content div becomes:
```typescript
<div
  className={cn(
    'max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed',
    isError
      ? 'bg-red-50 text-red-700'
      : 'bg-muted text-foreground [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_thead]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1'
  )}
>
  {isError ? (
    <span>{content}</span>
  ) : (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  )}
</div>
```

The user bubble (right-aligned, coral) is unchanged.
</action>

---

## Wave 2 — Wire MessageInput fetch + add `type` to route response (sequential, runs after Wave 1)

### Task 3 — Replace MessageInput fake stub with real fetch + add `type` to route response

#### Part A — Wire MessageInput to POST /api/ai-chatbot

**<read_first>**
- `src/components/chatbot/MessageInput.tsx` — current input component
</read_first>

**<acceptance_criteria>**
- `grep "const res = await fetch" src/components/chatbot/MessageInput.tsx` returns the fetch call
- `grep "'Content-Type': 'application/json'" src/components/chatbot/MessageInput.tsx` returns the headers
- `grep "POST.*ai-chatbot\|method: 'POST'" src/components/chatbot/MessageInput.tsx` returns the method + path
- `grep "messages: conversationHistory" src/components/chatbot/MessageInput.tsx` returns the body field
- `grep "!res.ok || data.type === 'error'" src/components/chatbot/MessageInput.tsx` returns the HTTP-then-type check
- `grep "isSubmittingRef" src/components/chatbot/MessageInput.tsx` returns ≥3 occurrences (useRef, guard, finally reset)
- `grep "type: 'error'" src/components/chatbot/MessageInput.tsx` returns ≥2 occurrences (both error branches)
- `grep "Connection error" src/components/chatbot/MessageInput.tsx` returns the network error message
- `grep "finally" src/components/chatbot/MessageInput.tsx` returns `setLoading(false)` in finally + `isSubmittingRef.current = false`
- `npx tsc --noEmit` exits 0
</acceptance_criteria>

**<action>**
In `src/components/chatbot/MessageInput.tsx`:

1. Add `useRef` to the React import:
```typescript
import { useState, useRef } from 'react'
```

2. Destructure `messages` from the store alongside existing helpers:
```typescript
const { messages, isLoading, addMessage, setLoading } = useAIChatbotStore()
```

3. Add `isSubmittingRef` below `const [input, setInput] = useState('')`:
```typescript
const isSubmittingRef = useRef(false)
```

4. Replace the entire `handleSubmit` function body (keep `handleKeyDown` and JSX return unchanged):

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

    addMessage({ role: 'user', content: userMessage })
    setLoading(true)
    setInput('')

    try {
      const res = await fetch('/api/ai-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          messages: conversationHistory,
        }),
      })

      const data = await res.json()

      // Always check HTTP status BEFORE data.type — HTTP errors (502, 500)
      // do not include the 'type' field; they only include 'error'.
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

`handleKeyDown` and the JSX return are unchanged from Phase 2.
</action>

#### Part B — Add `type: 'text'` to route success response

**<read_first>**
- `src/app/api/ai-chatbot/route.ts` — current route handler
</read_first>

**<acceptance_criteria>**
- `grep "type: 'text' as const" src/app/api/ai-chatbot/route.ts` returns the type field in the response object
- `grep "reply: botReply" src/app/api/ai-chatbot/route.ts` returns the reply field (still present)
- `grep "messages:" src/app/api/ai-chatbot/route.ts` returns the messages array (still present)
- `grep "role: userRole" src/app/api/ai-chatbot/route.ts` returns the role field (still present)
- `grep "type: 'text'" src/app/api/ai-chatbot/route.ts` returns exactly one occurrence
- `npx tsc --noEmit` exits 0
</acceptance_criteria>

**<action>**
In `src/app/api/ai-chatbot/route.ts`, update the final `return NextResponse.json({...})` block by adding `type: 'text' as const`:

```typescript
  return NextResponse.json({
    reply: botReply,
    type: 'text' as const,       // ← Phase 3: type discriminator for client
    role: userRole,
    messages: [
      ...(body.messages ?? []),
      { role: 'user' as const, content: body.message },
      { role: 'assistant' as const, content: botReply },
    ],
  })
```

Update the file header comment to reflect Phase 3:
Change `Phase 3: Accepts messages[] array, returns bot response.` to `Phase 3: Accepts messages[] array, returns type + bot response.`
</action>

---

## Verification

After all tasks, run:
```bash
npx tsc --noEmit
```
Expected: exit code 0 with no errors.