# Phase 3: Wire API Route to Client - Research

**Researched:** 2026-04-04
**Domain:** Next.js App Router API integration, client-side fetch, error handling
**Confidence:** HIGH

## Summary

Phase 3 is a pure wiring task: connecting an existing client shell (Phase 2) to an existing API route (Phase 1). No external libraries need to be installed. No new patterns need to be discovered — the codebase already has well-established fetch patterns, error handling conventions, and Clerk auth patterns. The only real work is (1) writing the `POST /api/ai-chatbot` fetch call in `MessageInput`, (2) adding the `type` field to the route response, and (3) adding an error variant to `MessageBubble`.

The route already accepts `messages[]` in the request body (D-01 from CONTEXT.md) — it just wasn't wired client-side. The `anthropicService.ts` placeholder call works as-is. The `Zustand` store already has `addMessage`, `setLoading`, `clearMessages`. No architectural decisions are needed; all choices are locked in D-01 through D-07 of CONTEXT.md.

**Primary recommendation:** Three targeted edits: `MessageInput.tsx` (replace fake loading with `fetch`), `MessageBubble.tsx` (add error variant), `route.ts` (add `type: 'text' | 'error'` to response). Use `try/catch` with inline error bubble. No new files needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full history round-trip — client sends `{ message, messages[] }` → API returns `{ reply, type, role, messages[] }`. Client replaces store with API response or appends reply.
- **D-02:** Inline error bubble in thread — bot-style bubble with error styling (left-aligned, muted background, error icon from lucide-react, red/orange text, no markdown rendering).
- **D-03:** Generic greeting for Phase 3 (no role-specific greetings yet — those land Phase 4).
- **D-04:** Markdown rendering for all bot replies via `react-markdown` + `remark-gfm` (already wired in Phase 2 `MessageBubble`).
- **D-05:** API response typed as `{ reply, type: 'text' | 'error', role }`.
- **D-06:** Manual verification only — no Playwright in this phase.

### Claude's Discretion
- Exact Tailwind classes for error bubble (icon color, text color, background shade)
- Whether to replace store's `messages[]` entirely or append to it (both equivalent — Phase 2 store is already append-based)
- Whether `AIChatRequestBody` should validate `messages[]` item shape (type narrowing)

### Deferred Ideas (OUT OF SCOPE)
- Bot response type expansion (Phase 4+)
- Role-specific greetings (Phase 4)
- Playwright integration test (Phase 4)
- Streaming (Phase 5 / v2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THRD-03 | Bot responses streamed/shown progressively in thread | Phase 3 wires the fetch + response display. For Phase 3 placeholder, entire reply appears at once. Streaming lands in Phase 5. |
| THRD-04 | User can see a loading indicator while bot is "thinking" | `LoadingIndicator` already in `MessageList` (Phase 2). `isLoading` wired from store. Phase 3: `setLoading(true)` during fetch, `setLoading(false)` on response/error. |
| API-01 | Bot can call `GET /api/contract/getAll` | Phase 1 skeleton route exists. Phase 3 wiring enables future Phase 4 tool calls through the same route. |
| API-02–10 | Bot can call other GoChul API routes | Same as API-01 — Phase 3 enables the call chain that Phase 4 tool execution will use. |
| API-11 | Bot respects role permissions | Handled in Phase 1 route (already has `requireRole` check). Phase 3 wires access to it. |
| API-12 | Bot calls authenticated with Clerk token | Phase 1 route uses `auth()` (server-side). Clerk token forwarding verified in Phase 1. Phase 3 exposes this to client. |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Rule | Enforcement for Phase 3 |
|------|-------------------------|
| `export const dynamic = 'force-dynamic'` on all API routes | Already set in `route.ts`. No change needed. |
| Clerk server-side auth: `import { auth } from '@clerk/nextjs/server'` | Already used in `route.ts`. No change needed. |
| `cn()` for all class composition | Must use `cn()` in error bubble additions to `MessageBubble.tsx`. |
| CSS custom properties for colors | Error bubble must use `--color-warning` or semantic red tokens, not hardcoded hex. |
| JSDoc on exported utilities | If adding new helpers, add JSDoc. |
| TypeScript strict mode | Type `AIChatbotApiResponse` explicitly. |

---

## Standard Stack

### Core
No new packages. All required packages are already installed by Phase 2.

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@anthropic-ai/sdk` | installed | AI service client | ✅ Already used in `anthropicService.ts` |
| `zustand` | installed | Chat state management | ✅ Already used in `useAIChatbotStore.ts` |
| `react-markdown` | installed | Markdown rendering | ✅ Already used in `MessageBubble.tsx` |
| `remark-gfm` | installed | GFM (tables, strikethrough) | ✅ Already used in `MessageBubble.tsx` |
| `@clerk/nextjs` | 6.37.1 | Auth | ✅ Already used in `route.ts` |
| `lucide-react` | 0.577.0 | Icons | ✅ Already used in chatbot components |

**Installation:** No new packages needed. Confirm with:
```bash
npm install zustand react-markdown remark-gfm @anthropic-ai/sdk lucide-react
```

---

## Architecture Patterns

### Recommended Project Structure
No structural changes. All files already exist.

```
src/
├── app/api/ai-chatbot/
│   └── route.ts                    # MODIFY: add type field to response
├── components/chatbot/
│   ├── MessageInput.tsx            # MODIFY: replace fake with real fetch
│   ├── MessageBubble.tsx           # MODIFY: add error variant
│   ├── MessageList.tsx            # No changes needed
│   ├── LoadingIndicator.tsx       # No changes needed
│   ├── FloatingFAB.tsx            # No changes needed
│   └── AIChatbotModal.tsx         # No changes needed
├── store/
│   └── useAIChatbotStore.ts        # No structural changes needed
└── lib/ai/
    ├── anthropicService.ts         # MODIFY: pass messages[] to callClaude
    ├── systemPrompt.ts             # No changes needed
    └── toolDefinitions.ts          # No changes needed
```

### Pattern 1: Client → API Fetch with Error Handling

**What:** POST to `/api/ai-chatbot` with `{ message, messages[] }`, handle success and network errors inline in the thread.

**Why:** Matches the existing Zustand store pattern (Phase 2). Errors render as bot messages, not toast/popup. Keeps thread as single source of truth.

**Implementation:**
```typescript
// src/components/chatbot/MessageInput.tsx (handleSubmit)
const handleSubmit = async () => {
  const trimmed = input.trim()
  if (!trimmed || isLoading) return

  const userMessage = trimmed
  const conversationHistory = messages // from store

  addMessage({ role: 'user', content: userMessage })
  setLoading(true)
  setInput('')

  try {
    const res = await fetch('/api/ai-chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, messages: conversationHistory }),
    })

    const data = await res.json()

    if (!res.ok || data.type === 'error') {
      // Inline error bubble
      addMessage({ role: 'assistant', content: data.error ?? 'Something went wrong. Please try again.' })
    } else {
      // Normal reply
      addMessage({ role: 'assistant', content: data.reply })
    }
  } catch {
    // Network-level error
    addMessage({ role: 'assistant', content: 'Connection error. Please check your network and try again.' })
  } finally {
    setLoading(false)
  }
}
```

**Source:** Established fetch pattern from existing API routes. Error bubbles per D-02.

### Pattern 2: API Route Response with `type` Field

**What:** Route returns `{ reply, type: 'text' | 'error', role, messages[] }`. Client reads `type` to choose bubble variant.

**Current route response (Phase 1):**
```json
{ "reply": "...", "role": "CUSTOMER", "messages": [...] }
```

**Phase 3 update:**
```json
{ "reply": "...", "type": "text", "role": "CUSTOMER", "messages": [...] }
```

**Error case (HTTP 502):**
```json
{ "error": "AI service temporarily unavailable..." }
```

```typescript
// src/app/api/ai-chatbot/route.ts — update response block
return NextResponse.json({
  reply: botReply,
  type: 'text' as const,
  role: userRole,
  messages: [
    ...(body.messages ?? []),
    { role: 'user' as const, content: body.message },
    { role: 'assistant' as const, content: botReply },
  ],
})
```

### Pattern 3: Error Bubble Variant in MessageBubble

**What:** `MessageBubble` accepts a `type?: 'normal' | 'error'` prop. Error bubbles use `AlertCircle` icon + muted red/orange styling + no markdown.

**Implementation:**
```typescript
// src/components/chatbot/MessageBubble.tsx
interface MessageBubbleProps {
  message: ChatMessage
  variant?: 'normal' | 'error'
}

// Error bubble (left-aligned, muted bg, icon, no markdown)
<div className="flex items-start gap-2">
  <div className="size-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
    <AlertCircle className="h-4 w-4 text-red-500" />
  </div>
  <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md bg-red-50 text-red-700 text-sm">
    {content}
  </div>
</div>
```

**Tailwind colors:** Use `bg-red-50 text-red-700` per D-02 and CLAUDE.md status badge convention. `AlertCircle` from `lucide-react`.

### Pattern 4: Store Update Strategy

**What:** After receiving API response, append the assistant reply to the store's `messages[]`.

The Zustand store's `addMessage` already appends. The client does NOT replace the store's messages with the API's `messages[]` — that full-history pattern is the API's internal concern. The client just appends the reply:

```typescript
addMessage({ role: 'assistant', content: data.reply })
```

This matches the Phase 2 store's append-only design. D-01 confirms both approaches are equivalent; append is simpler.

### Anti-Patterns to Avoid
- **Do NOT** use `window.alert()` or `sonner` toast for API errors in the chatbot — D-02 mandates inline error bubbles in the thread.
- **Do NOT** clear the input before the fetch completes — Phase 2 already handles this by setting `input('')` before fetch. The UX is acceptable for Phase 3.
- **Do NOT** replace the entire `messages[]` store from the API response — causes potential race conditions if the user has sent multiple messages before a response arrives. Append only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation for message IDs | Custom ID function | `crypto.randomUUID()` | Already in Zustand store |
| Markdown rendering | Custom regex replacement | `react-markdown` + `remark-gfm` | Already installed and wired |
| Class composition | Template literals | `cn()` from `@/lib/utils` | Already available |
| Auto-scroll to bottom | `scrollTop = scrollHeight` | `bottomRef.current?.scrollIntoView()` | Already in `MessageList.tsx` |

---

## Common Pitfalls

### Pitfall 1: Unhandled fetch failure (network error)
**What goes wrong:** Network timeout or CORS error throws before `res.json()` — the error silently disappears, `isLoading` stays `true` forever, user sees no feedback.
**Why it happens:** `try/catch` missing `catch` block that handles non-HTTP errors (e.g., no internet, DNS failure).
**How to avoid:** Always wrap fetch in `try/catch`. In `catch`, call `addMessage({ role: 'assistant', content: '...' })` with error message, then `setLoading(false)`. Never leave `isLoading` stuck at `true`.
**Warning signs:** Loading indicator stays visible after send. Console shows `TypeError: Failed to fetch`.

### Pitfall 2: Multiple concurrent sends
**What goes wrong:** User clicks send twice rapidly — two fetches fire, two replies appear out of order, conversation state is corrupted.
**Why it happens:** `isLoading` check exists in `handleSubmit` but state update is async — between `if (!trimmed || isLoading) return` and `setLoading(true)`, a second click can slip through.
**How to avoid:** Use a ref (`isSubmittingRef`) to gate the handler synchronously. Or accept the risk for Phase 3 (low likelihood in manual testing).
```typescript
const isSubmittingRef = useRef(false)
// In handleSubmit:
if (isSubmittingRef.current || isLoading) return
isSubmittingRef.current = true
// At finally:
isSubmittingRef.current = false
```

### Pitfall 3: React StrictMode double-invocation (dev only)
**What goes wrong:** In Next.js dev mode with `reactStrictMode: true`, `handleSubmit` fires twice — two messages sent, two bot replies.
**Why it happens:** React StrictMode unmounts/remounts components in development.
**How to avoid:** The Zustand store's `addMessage` appends with unique `crypto.randomUUID()` IDs, so double-invocation creates duplicate but visually acceptable messages. Accept for Phase 3 since D-06 is manual verification.

### Pitfall 4: Error response shape mismatch
**What goes wrong:** API returns HTTP 502 `NextResponse.json({ error: '...' })` — client does `await res.json()` but `data.type` is `undefined`. Client incorrectly renders it as a normal reply.
**Why it happens:** HTTP error responses don't include the `type: 'text' | 'error'` field — they only have `error`.
**How to avoid:** Check `!res.ok` BEFORE checking `data.type`:
```typescript
if (!res.ok || data.type === 'error') {
  addMessage({ role: 'assistant', content: data.error ?? data.reply ?? '...' })
} else {
  addMessage({ role: 'assistant', content: data.reply })
}
```

### Pitfall 5: Markdown injection in error messages
**What goes wrong:** Error messages from the API contain markdown-like text (`_test_`, `**bold**`) that renders unexpectedly in `react-markdown`.
**Why it happens:** Error strings from the API are rendered through `ReactMarkdown` in `MessageBubble`.
**How to avoid:** Error bubbles should NOT render through `ReactMarkdown` — D-02 explicitly says "no markdown rendering" for error bubbles. The error variant in `MessageBubble` must render `{content}` as plain text.

---

## Code Examples

### Full MessageInput Fetch Integration
```typescript
// src/components/chatbot/MessageInput.tsx
'use client'

import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'

export default function MessageInput() {
  const [input, setInput] = useState('')
  const { messages, isLoading, addMessage, setLoading } = useAIChatbotStore()
  const isSubmittingRef = useRef(false)

  const handleSubmit = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || isSubmittingRef.current) return

    isSubmittingRef.current = true
    const userMessage = trimmed

    addMessage({ role: 'user', content: userMessage })
    setLoading(true)
    setInput('')

    try {
      const res = await fetch('/api/ai-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          messages: messages.map(({ role, content }) => ({ role, content })),
        }),
      })

      const data = await res.json()

      if (!res.ok || data.type === 'error') {
        addMessage({
          role: 'assistant',
          content: data.error ?? 'Something went wrong. Please try again.',
        })
      } else {
        addMessage({ role: 'assistant', content: data.reply })
      }
    } catch {
      addMessage({
        role: 'assistant',
        content: 'Connection error. Please check your network and try again.',
      })
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }

  // ... rest unchanged
}
```

### Error Bubble in MessageBubble
```typescript
// src/components/chatbot/MessageBubble.tsx — bot bubble section
import { Bot, AlertCircle } from 'lucide-react'

// Inside MessageBubble, after the user bubble:
const isError = message.type === 'error'

return (
  <div
    aria-label={isError ? 'Error message' : 'AI Assistant response'}
    role="note"
    className="flex items-start gap-2 animate-in slide-in-from-bottom-1 duration-200"
  >
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

    <div
      className={cn(
        'max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed',
        isError
          ? 'bg-red-50 text-red-700'
          : 'bg-muted text-foreground [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4',
        !isError && markdownStyles // Only apply markdown styles to normal replies
      )}
    >
      {isError ? (
        <span>{content}</span>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      )}
    </div>
  </div>
)
```

### Route Response with `type` Field
```typescript
// src/app/api/ai-chatbot/route.ts — response block (update existing)
return NextResponse.json({
  reply: botReply,
  type: 'text' as const,        // ← Phase 3: add type field
  role: userRole,
  messages: [
    ...(body.messages ?? []),
    { role: 'user' as const, content: body.message },
    { role: 'assistant' as const, content: botReply },
  ],
})
```

### Store Type Extension (for error type)
```typescript
// src/store/useAIChatbotStore.ts — extend ChatMessage interface
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  type?: 'normal' | 'error'   // ← Phase 3: optional error flag
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Toast/popup for bot errors | Inline error bubble in thread | Phase 3 decision (D-02) | Keeps thread as single source of truth |
| Single-turn only | Full history round-trip | Phase 3 decision (D-01) | Enables multi-turn conversation |
| Untyped API response | `{ reply, type, role }` typed response | Phase 3 decision (D-05) | Client can distinguish text vs error |

**Deprecated/outdated:** None relevant to Phase 3.

---

## Open Questions

1. **Should `messages[]` in the store include the greeting message?**
   - What we know: `GREETING` is rendered in `MessageList` as a special case (`id: 'greeting'`), not stored in `messages[]`. It's never sent to the API.
   - What's unclear: If the user sends a message after seeing the greeting, should the greeting appear as the first `messages[]` item sent to the API?
   - Recommendation: **No** — keep greeting as ephemeral UI element. API conversation starts with the user's first message. The `messages[]` sent to the API accumulates only user-assistant pairs.

2. **Should the Phase 3 placeholder bot reply also be stored in `messages[]`?**
   - What we know: After `addMessage({ role: 'assistant', content: data.reply })` is called, the reply is in the store. So yes, it will be in `messages[]`.
   - What's unclear: If the user sends a second message, should the first assistant reply be in `messages[]` sent to the API?
   - Recommendation: **Yes** — the Zustand `messages[]` IS the conversation history. `messages.map(({ role, content }) => ({ role, content }))` in `MessageInput` sends the full history. This is correct behavior per D-01.

---

## Environment Availability

> Step 2.6: SKIPPED — Phase 3 is purely code integration with no external tool dependencies. All required packages are already installed (verified via Phase 2 commit: `npm install zustand remark-gfm @anthropic-ai/sdk`).

---

## Validation Architecture

**nyquist_validation enabled** (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework
No test infrastructure detected in the project. Manual verification only (per D-06).

| Property | Value |
|----------|-------|
| Framework | None |
| Config file | None |
| Quick run command | N/A — manual |
| Full suite command | N/A — manual |

### Phase Requirements → Verification Map
| Req ID | Behavior | Test Type | Manual Verification Steps |
|--------|----------|-----------|--------------------------|
| THRD-03 | Bot reply displayed in thread | Manual | Open chatbot → send "Hello" → verify reply bubble appears |
| THRD-04 | Loading indicator shown during fetch | Manual | Send message → verify three-dot animation → verify it disappears after reply |
| API-01–10 | Route accepts POST and returns reply | Manual | `curl -X POST http://localhost:3000/api/ai-chatbot -H "Content-Type: application/json" -d '{"message":"Hi"}'` with auth cookie |
| API-11 | Role permissions enforced | Manual | Test with different role accounts (CUSTOMER vs ADMIN) |
| API-12 | Clerk session auth required | Manual | Clear cookies → try POST → expect 401 |
| — | Error bubble on network failure | Manual | Disconnect network → send message → verify error bubble appears |
| — | Modal close clears messages | Manual | Send messages → close modal → reopen → verify thread is empty |
| — | Input clears on send | Manual | Type message → send → verify input is empty |
| — | Enter key submits | Manual | Type message → press Enter → verify send behavior |

### Wave 0 Gaps
None — Phase 3 uses manual verification only (D-06). No test infrastructure to create.

---

## Sources

### Primary (HIGH confidence)
- Phase 1 `route.ts` — Already verified to accept `messages[]` and return `{ reply, role, messages[] }`
- Phase 2 `MessageInput.tsx` — Already has fake loading stub; `handleSubmit` structure confirmed
- Phase 2 `MessageBubble.tsx` — Already has `react-markdown` + `remarkGfm` wiring; `ChatMessage` interface confirmed
- Phase 2 `useAIChatbotStore.ts` — `addMessage`, `setLoading`, `messages` store interface confirmed
- CLAUDE.md — Project conventions (no new files, `cn()`, CSS tokens, Clerk auth pattern)
- `.claude/skills/clerk-nextjs-patterns/SKILL.md` — `await auth()` pattern, API route 401/403 convention

### Secondary (MEDIUM confidence)
- Clerk API routes reference (api-routes.md skill) — API route pattern confirmed via existing codebase routes
- Zustand docs — `create()` pattern confirmed via existing store implementation

### Tertiary (LOW confidence)
None required — phase is pure wiring of existing code with no external research needed.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all verified from Phase 2 commits
- Architecture: HIGH — all patterns derived from existing codebase; no new abstractions
- Pitfalls: HIGH — all pitfalls identified from established React/Next.js/fetch patterns

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days — stable domain)
