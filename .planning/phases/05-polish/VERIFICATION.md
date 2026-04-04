# Phase 5 Verification — Polish

**Phase:** 05-polish
**Verified:** 2026-04-04
**Goal:** Complete the feature for a production-quality v1 launch. No new v1 requirements — all items are enhancements.
**Requirements:** NONE (Phase 5 has 0 v1 requirements per ROADMAP.md — all items are v2 enhancements)

---

## Must-Haves Status

All 6 must-haves are **VERIFIED ✅**.

### 1. Bot responses stream token-by-token with no double LLM call

**File:** `src/app/api/ai-chatbot/route.ts` (line 205–213)

```
const stream = textToStream(botReply)
return new Response(stream, { ... })
```

`callClaudeWithTools()` runs to completion server-side (single LLM call). The pre-computed `botReply` string is then converted to a `ReadableStream` via `textToStream()` in `src/lib/ai/streamUtils.ts`, which chunks it and encodes it in AI SDK data stream format (`0:{JSON.stringify({type:'text',textDelta:chunk})}`). `useChat` consumes this streaming `Response`. No second LLM invocation occurs.

**Evidence:**
- `route.ts` line 173: `callResult = await callClaudeWithTools({ ... })` — completes before streaming starts
- `route.ts` line 206: `const stream = textToStream(botReply)` — post-computation streaming
- `streamUtils.ts` line 29–54: `textToStream()` with AI SDK data stream format

---

### 2. "cái thứ 2" resolves to correct entity via prompt instructions

**File:** `src/lib/ai/systemPrompt.ts` (lines 120–137)

The `## INLINE ENTITY REFERENCES (Phase 5)` section instructs the model to:
- Always number list items with `[1]`, `[2]`, `[3]` markers
- Map `"the second one" / "cái thứ 2"` → item labeled `[2]`
- Map `"that one" / "cái đó"` → last item in the most recent list
- Map `"hợp đồng kia" / "that contract"` → last contract mentioned
- Map `"buổi tập đó" / "that session"` → last session mentioned

**Evidence:**
- `systemPrompt.ts` line 128: `'"the second one" / "cái thứ 2" → item labeled [2]'`
- `systemPrompt.ts` lines 122–137: full inline entity reference section

---

### 3. Warning bubble renders amber when slot conflict detected

**File:** `src/components/chatbot/MessageBubble.tsx` (lines 21–23, 44–45, 74, 80–81)

When `message.type === 'warning'`:
- Avatar background: `bg-[var(--color-warning)]` (amber/orange)
- Icon: `AlertTriangle` from lucide-react
- Bubble classes: `bg-[var(--color-warning-bg)] text-[#7A3E00] border-l-2 border-[var(--color-warning)]`
- Content: rendered with `ReactMarkdown` (markdown enabled for warnings)

**Evidence:**
- `MessageBubble.tsx` line 22: `const isWarning = type === 'warning'`
- `MessageBubble.tsx` line 44–45: amber avatar with `AlertTriangle`
- `MessageBubble.tsx` line 74: `{isWarning && <AlertTriangle ... />}`
- `MessageBubble.tsx` lines 80–81: `bg-[var(--color-warning-bg)]` + `border-l-2 border-[var(--color-warning)]`

---

### 4. Nudge bubble renders blue when language switch detected

**File:** `src/components/chatbot/MessageBubble.tsx` (lines 23, 46–47, 75, 82–83)
**File:** `src/app/api/ai-chatbot/route.ts` (lines 144–168)

When `message.type === 'nudge'`:
- Avatar background: `bg-blue-100`
- Icon: `Languages` from lucide-react
- Bubble classes: `bg-blue-50 text-blue-700`
- Content: plain `<span>` (no markdown, no confirm button)

Language switch is detected server-side in `route.ts`:
- Compares `detectLanguage()` of the last two user messages
- When different: returns `{ reply: nudgeText, type: 'nudge', ... }`
- Nudge text: `"I noticed you switched language. I'll respond in ${detectedLabel}."`

**Evidence:**
- `MessageBubble.tsx` line 23: `const isNudge = type === 'nudge'`
- `MessageBubble.tsx` lines 75, 82–83: blue styles + `Languages` icon
- `route.ts` lines 144–168: full language switch detection + nudge response
- `route.ts` line 155: `"I noticed you switched language. I'll respond in ${detectedLabel}."`

---

### 5. Rate limit returns HTTP 429 with user-friendly message

**File:** `src/app/api/ai-chatbot/route.ts` (lines 44–60)
**File:** `src/lib/ratelimit.ts`

`ratelimit.limit(userId)` is called before any processing. On failure:
- HTTP status: `429`
- Body: `{ error: "You're sending messages too quickly. Please wait a moment and try again.", type: 'nudge' }`
- Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

Rate limiter configured at `src/lib/ratelimit.ts`:
- 20 requests per minute, per authenticated userId (`Ratelimit.slidingWindow(20, '1 m')`)
- Uses `@upstash/ratelimit` + `@upstash/redis`

**Evidence:**
- `route.ts` line 45: `const { success: rateOk, remaining, reset } = await ratelimit.limit(userId)`
- `route.ts` line 46: `if (!rateOk)` check
- `route.ts` lines 47–59: 429 response with friendly message + headers
- `ratelimit.ts` line 17–21: `new Ratelimit({ limiter: Ratelimit.slidingWindow(20, '1 m'), ... })`

---

### 6. All Zustand message/loading state replaced by useChat

**Files:** `src/store/useAIChatbotStore.ts`, `src/components/chatbot/MessageInput.tsx`, `src/components/chatbot/MessageList.tsx`, `src/components/chatbot/AIChatbotModal.tsx`

`useAIChatbotStore` now only exports `isOpen` and `setOpen`. All message and loading state has been removed:
- Store: `AIChatbotStore` interface has exactly 2 fields (line 5–7)
- Removed exports: `messages`, `isLoading`, `addMessage`, `setLoading`, `clearMessages`

`MessageInput.tsx` uses `useChat` from `'ai/react'` (lines 3, 18–28):
- Destructures: `messages`, `input`, `setInput`, `handleSubmit`, `isLoading`, `status`, `append`
- Does NOT import anything Zustand-message-related
- Passes all 4 props to `MessageList`: `messages`, `isLoading`, `status`, `onConfirm`
- Confirm flow: `append({ role: 'user', content: 'CONFIRMED' })` (line 36)

`MessageList.tsx` accepts `messages`, `isLoading`, `status` as props (not from Zustand):
- Props interface: `messages: UIMessage[]`, `isLoading: boolean`, `status: 'submitted' | 'streaming' | 'ready' | 'error'`
- Imports `UIMessage` from `'ai'` (line 4)
- Does NOT import from `useAIChatbotStore`

`AIChatbotModal.tsx`:
- Imports `AIProvider` from `'@ai-sdk/react'` (line 5)
- Wraps `<MessageInput />` with `<AIProvider>` (lines 75–77)
- Removes `clearMessages` from close handler (line 25: `setOpen(false)` only)

**Evidence:**
- `useAIChatbotStore.ts` lines 5–10: store with only `isOpen` + `setOpen`
- `MessageInput.tsx` lines 18–28: `const { messages, input, setInput, handleSubmit, isLoading, status, append } = useChat({ api: '/api/ai-chatbot' })`
- `MessageInput.tsx` line 36: `append({ role: 'user', content: 'CONFIRMED' })`
- `MessageList.tsx` lines 11–14: props interface with `UIMessage[]`
- `MessageList.tsx` line 4: `import type { UIMessage } from 'ai'`
- `AIChatbotModal.tsx` line 5: `import { AIProvider } from '@ai-sdk/react'`
- `AIChatbotModal.tsx` lines 75–77: `<AIProvider><MessageInput /></AIProvider>`

---

## Additional Verification Checklist

| Item | Status | Location |
|---|---|---|
| `TOOL_DEFINITIONS` has 11 items | ✅ | `toolDefinitions.ts` line 512 |
| `case 'get_occupied_time_slots':` in dispatcher | ✅ | `anthropicService.ts` line 285 |
| `systemPrompt.ts` has English time rules | ✅ | `systemPrompt.ts` lines 104–118 |
| `systemPrompt.ts` has entity reference rules | ✅ | `systemPrompt.ts` lines 120–137 |
| `useAIChatbotStore` exports only `isOpen`/`setOpen` | ✅ | `useAIChatbotStore.ts` lines 5–15 |
| `MessageInput.tsx` imports `useChat` from `'ai/react'` | ✅ | `MessageInput.tsx` line 3 |
| `MessageInput.tsx` calls `append({ role: 'user', content: 'CONFIRMED' })` | ✅ | `MessageInput.tsx` line 36 |
| `MessageList.tsx` accepts `messages`, `isLoading`, `status` as props | ✅ | `MessageList.tsx` lines 11–14 |
| `MessageList.tsx` passes `phase`/`hasContent` to LoadingIndicator | ✅ | `MessageList.tsx` lines 81–84 |
| `MessageList.tsx` passes `isStreaming` to MessageBubble | ✅ | `MessageList.tsx` line 75 |
| `AIChatbotModal.tsx` wraps with `<AIProvider>` | ✅ | `AIChatbotModal.tsx` lines 75–77 |
| `AIChatbotModal.tsx` removes `clearMessages` from close | ✅ | `AIChatbotModal.tsx` line 25 |
| `MessageBubble.tsx` renders amber warning with `AlertTriangle` | ✅ | `MessageBubble.tsx` lines 74, 80–81 |
| `MessageBubble.tsx` renders blue nudge with `Languages` | ✅ | `MessageBubble.tsx` lines 75, 82–83 |
| `MessageBubble.tsx` renders streaming cursor when `isStreaming === true` | ✅ | `MessageBubble.tsx` lines 101–107 |
| `LoadingIndicator.tsx` shows "GoChul is thinking…" when `hasContent === false` | ✅ | `LoadingIndicator.tsx` line 14 |
| `LoadingIndicator.tsx` shows "Responding…" when `hasContent === true` | ✅ | `LoadingIndicator.tsx` line 14 |
| `globals.css` contains `chatbot-cursor-blink` keyframe | ✅ | `globals.css` line 202 |
| `globals.css` contains `prefers-reduced-motion` media query | ✅ | `globals.css` lines 207–211 |
| `src/lib/ratelimit.ts` exists and exports `ratelimit` | ✅ | `ratelimit.ts` lines 17–21 |
| `src/lib/ai/streamUtils.ts` exists and exports `textToStream` | ✅ | `streamUtils.ts` line 29 |
| `route.ts` imports and calls `ratelimit.limit(userId)` | ✅ | `route.ts` lines 20, 45 |
| `route.ts` imports and uses `textToStream` | ✅ | `route.ts` lines 21, 206 |
| `route.ts` imports and uses `detectLanguage` | ✅ | `route.ts` lines 18, 147–150 |
| `route.ts` returns streaming `Response` for text type | ✅ | `route.ts` lines 206–213 |
| `route.ts` returns `NextResponse.json` for `proposal` type | ✅ | `route.ts` lines 196–203 |
| Packages installed: `ai`, `@ai-sdk/react`, `@upstash/ratelimit`, `@upstash/redis` | ✅ | `package.json` lines 14, 23–24, 26 |

---

## Phase 5 — All Must-Haves: PASS ✅

**Result:** Phase 5 goal achieved. All 6 must-haves verified against the actual codebase. No v1 requirements for this phase — all items are v2 enhancements (STRM-01, AVLB-01, AVLB-02 per ROADMAP.md) and are confirmed implemented.

**Verified by:** Claude Sonnet 4.6
**Date:** 2026-04-04
