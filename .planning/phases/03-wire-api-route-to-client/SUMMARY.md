# Phase 3 — Wire API Route to Client: Summary

**Executed:** 2026-04-04
**Status:** ✅ Complete — 3 tasks, 5 commits

---

## What Was Done

Phase 3 connected the Phase 2 client shell (FAB + modal + Zustand store) to the Phase 1 API route (`POST /api/ai-chatbot`). The Phase 1 placeholder AI response is now live end-to-end. No AI logic yet — that lands in Phase 4.

### Tasks Executed

| Task | Description | Files Modified | Commit |
|------|-------------|---------------|--------|
| **T-01** | Extend `ChatMessage` interface with optional `type?: 'normal' \| 'error'` field | `src/store/useAIChatbotStore.ts` | `a370c8b` |
| **T-02** | Add error bubble variant to `MessageBubble` — `AlertCircle` icon + red styling + plain text (no markdown) | `src/components/chatbot/MessageBubble.tsx` | `6d6db4f` |
| **T-03 Part A** | Replace fake loading stub in `MessageInput` with real `fetch('/api/ai-chatbot', { method: 'POST', ... })` — sends full `messages[]` history, handles HTTP errors, `type: 'error'` responses, and network exceptions as inline error bubbles | `src/components/chatbot/MessageInput.tsx` | `b377584` |
| **T-03 Part B** | Add `type: 'text' as const` to API route success response — typed discriminator for client | `src/app/api/ai-chatbot/route.ts` | `f99610d` |

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D-01 | `type` field on `ChatMessage` is optional | Backward-compatible — all Phase 2 `addMessage` calls omit it, defaulting to normal bubble |
| D-02 | Check `!res.ok` BEFORE `data.type === 'error'` | HTTP error responses (502, 500) don't include `type` — they only include `error` |
| D-03 | `isSubmittingRef` (ref, not state) for double-submit guard | State updates are async; a ref provides synchronous guard preventing double-send |
| D-04 | `setLoading(false)` in `finally` block | Guaranteed cleanup even if `addMessage` throws |

---

## Validation

| Check | Command | Result |
|-------|---------|--------|
| TypeScript strict | `npx tsc --noEmit` | ✅ exit 0 |
| `type?: 'normal' \| 'error'` in store | `grep "type?: 'normal' \| 'error'" src/store/useAIChatbotStore.ts` | ✅ found |
| `AlertCircle` import | `grep "AlertCircle" src/components/chatbot/MessageBubble.tsx` | ✅ found |
| `bg-red-50 text-red-700` | `grep "bg-red-50 text-red-700" src/components/chatbot/MessageBubble.tsx` | ✅ found |
| `isError` derived constant | `grep "isError" src/components/chatbot/MessageBubble.tsx` | ✅ found |
| `POST.*ai-chatbot` | `grep "POST.*ai-chatbot\|method: 'POST'" src/components/chatbot/MessageInput.tsx` | ✅ found |
| `isSubmittingRef` guard | `grep "isSubmittingRef" src/components/chatbot/MessageInput.tsx` | ✅ found (≥3) |
| `type: 'text' as const` in route | `grep "type: 'text' as const" src/app/api/ai-chatbot/route.ts` | ✅ found |
| Conversation history sent | `grep "messages: conversationHistory" src/components/chatbot/MessageInput.tsx` | ✅ found |
| `finally` block with reset | `grep "finally" src/components/chatbot/MessageInput.tsx` | ✅ found |

---

## Files Modified

```
src/store/useAIChatbotStore.ts               [modified — T-01]
src/components/chatbot/MessageBubble.tsx      [modified — T-02]
src/components/chatbot/MessageInput.tsx       [modified — T-03 Part A]
src/app/api/ai-chatbot/route.ts              [modified — T-03 Part B]
```

## Git Commits

```
f99610d feat(chatbot): add type field to API route response
b377584 feat(chatbot): wire MessageInput to POST /api/ai-chatbot
6d6db4f feat(chatbot): add error bubble variant to MessageBubble
a370c8b feat(chatbot): add type field to ChatMessage for error bubble support
```

---

## What's Next (Phase 4)

Phase 4 implements the full AI logic:
- Inject `TOOL_DEFINITIONS` into `messages.create()` tool-use
- Execute tools via `executeTool()` calling GoChul API routes with Clerk token
- Vietnamese time inference (sáng → 00:00–11:59, chiều → 12:00–14:59, tối → 15:00–17:59, đêm → 18:00–23:59 UTC+7)
- Structured result cards instead of raw API text
- User-friendly error translation
- One retry on failed API calls

---

*Summary generated: 2026-04-04*
*Phase: 03-wire-api-route-to-client*
