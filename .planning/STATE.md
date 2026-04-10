---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: complete
last_updated: "2026-04-10T00:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 5
---

# GoChul Fitness AI Chatbot — State

**Updated:** 2026-04-04
**Version:** 1.0

---

## Current Position

Phase: 05
Plan: Not started

**Phase 1** — Complete ✓
**Phase 2** — Complete ✓ (10 tasks, 10 commits)
**Phase 3** — Complete ✓ (3 tasks, 5 commits)
**Phase 5** — Complete ✓ (10 tasks, 7 commits)

---

## Phase

**Phase 5** — Complete ✓

---

## Phase Status

| Phase | Name | Status | Started | Completed | Notes |
|-------|------|--------|---------|-----------|-------|
| 1 | Skeleton & Architecture | Complete ✓ | — | 2026-04-04 | — |
| 2 | Client Shell | **Complete ✓** | — | 2026-04-04 | 10 tasks, 10 commits |
| 3 | Wire API Route to Client | **Complete ✓** | — | 2026-04-04 | 3 tasks, 5 commits |
| 4 | Multi-Turn + Tool-Use Loop | **Complete ✓** | — | 2026-04-04 | 9 tasks |
| 5 | Polish | **Complete ✓** | — | 2026-04-04 | 10 tasks, 7 commits |

---

## Requirement Coverage

| Phase | Coverage | Notes |
|-------|----------|-------|
| Phase 1 | API-11, API-12 | 2 requirements |
| Phase 2 | CHAT-01–06, THRD-01, THRD-02, THRD-07 | **9 requirements — Complete ✓** |
| Phase 3 | THRD-03, THRD-04, API-01–10 | **12 requirements — Complete ✓** |
| Phase 4 | LOOP-01–05, TIME-01–05, ERR-01–04, THRD-05, THRD-06 | 16 requirements |
| Phase 5 | (v2 enhancements) | 0 v1 requirements |

**Total v1 coverage:** 32 / 32 requirements ✅ — Milestone v1.0 COMPLETE

---

## Decisions Made (Phase 5)

| # | Decision | Rationale |
|---|----------|-----------|
| D-17 | `textToStream()` with 10-char chunks in AI SDK data stream format | Compatible with useChat fetch transport; smooth streaming feel |
| D-18 | `AIProvider` wraps `MessageInput` inside `AIChatbotModal` | Keeps useChat context scoped to modal lifecycle; no parent-level context needed |
| D-19 | Rate limit 429 returns `type: 'nudge'` | Hint for client to render friendly error as nudge bubble (same as language switch) |
| D-20 | Language switch detection on last two user messages only | Avoids false positives from older conversation history |
| D-21 | `detectLanguage()` from last two user messages → nudge bubble | Language switch yields inline warning bubble, not blocking the conversation |

---

## Decisions Made (Phase 4)

| # | Decision | Rationale |
|---|----------|-----------|
| D-11 | `callClaudeWithTools()` in `anthropicService.ts` — loop lives in the AI service file, not route.ts | Keeps route.ts clean, makes AI logic reusable |
| D-12 | `CallResult = { type: 'text' } \| { type: 'proposal' }` return type | Discriminator pattern lets route.ts return the correct JSON `type` field |
| D-13 | Two-step confirm-then-execute via `CONFIRMED:` prefix | Proposed as a bubble with Confirm button → user confirms → second API call sends `CONFIRMED` |
| D-14 | `translateError()` with static bilingual map | Predictable, zero AI hallucination risk for error messages |
| D-15 | Retry loop `for (attempt < 2)` in `executeTool()` | Simple; retries once on any transient failure; ERR-03 satisfied |
| D-16 | `detectLanguage()` via Vietnamese character regex on last user message | No ML, no external lib, fast and deterministic |

---

## Decisions Made (Phase 2)

| # | Decision | Rationale |
|---|----------|-----------|
| D-01 | FAB hides via `return null` when `isOpen=true` | Cleaner than CSS `pointer-events-none opacity-0`; spec explicitly says not just hidden |
| D-02 | Inline `<style>` for CSS keyframes | Tailwind v4 animation APIs unverified; inline style is safe and isolated |
| D-03 | `showCloseButton={false}` with custom X button | Required for compact header design per UI spec |
| D-04 | Bot avatar uses `Bot` icon (lucide) | More consistent with project icon standard than text "G" |
| D-05 | `@anthropic-ai/sdk` installed as prerequisite | Fixed pre-existing Phase 1 TS build error; needed for Phase 3 |

---

## Decisions Made (Phase 3)

| # | Decision | Rationale |
|---|----------|-----------|
| D-06 | `type` field on `ChatMessage` is optional (`type?: 'normal' | 'error'`) | Backward-compatible with all Phase 2 `addMessage` calls that omit it |
| D-07 | Check `!res.ok` BEFORE `data.type === 'error'` | HTTP error responses (502, 500) don't include `type` — only `error` field |
| D-08 | `isSubmittingRef` (ref, not state) for double-submit guard | Synchronous guard — state is async, ref is synchronous; prevents race between clicks |
| D-09 | `setLoading(false)` in `finally` block | Guaranteed cleanup even if `addMessage` throws (defensive) |
| D-10 | Error bubbles use plain `<span>` not `ReactMarkdown` | Prevents markdown injection in error content per D-02 |

---

## Key Files Created / Modified

| File | Phase | Purpose |
|------|-------|---------|
| `src/store/useAIChatbotStore.ts` | 2→3 | Zustand store: messages, isLoading, isOpen + actions; Phase 3 adds `type?: 'error'` to ChatMessage |
| `src/components/chatbot/LoadingIndicator.tsx` | 2 | Three-dot bounce animation |
| `src/components/chatbot/MessageBubble.tsx` | 2→3 | User/bot bubbles with markdown; Phase 3 adds error variant |
| `src/components/chatbot/MessageInput.tsx` | 2→3 | Text input + send button; Phase 3 wires real fetch call |
| `src/components/chatbot/MessageList.tsx` | 2 | Scrollable thread + auto-scroll |
| `src/components/chatbot/FloatingFAB.tsx` | 2 | 56px coral FAB, bottom-right |
| `src/components/chatbot/AIChatbotModal.tsx` | 2 | Dialog overlay with custom sizing |
| `src/components/layout/MainLayout.tsx` | 2 | Integrated chatbot components |
| `src/app/api/ai-chatbot/route.ts` | 1→4 | API route handler; Phase 4 replaces placeholder with `callClaudeWithTools` |
| `src/lib/ai/anthropicService.ts` | 1→5 | AI service: Phase 1 placeholder; Phase 4 adds `callClaudeWithTools`; Phase 5 adds `get_occupied_time_slots` dispatcher |
| `src/lib/ai/formatters.ts` | 4 | Server-side markdown formatters for contract/session results and error translation |
| `src/lib/ai/streamUtils.ts` | 5 | NEW — `textToStream()` ReadableStream in AI SDK data stream format |
| `src/lib/ratelimit.ts` | 5 | NEW — Upstash `Ratelimit` singleton (20 req/min per userId) |

---

## Open Items

- Phase 1: Verify Clerk session cookie forwarding from API route → GoChul API routes (curl test) — still open
- Phase 4: Implement tool-use loop with `TOOL_DEFINITIONS` + `executeTool()` calls (PLAN.md created)
- Phase 4: Codify Vietnamese time expression test harness before integration
- Phase 4: Investigate `getOccupiedTimeSlots` + `history/create` race condition (C5, C6 in CONCERNS.md)

---

## Phase 2 Git Commits

```
3d65743 chore(chatbot): install zustand remark-gfm @anthropic-ai/sdk
ab721c4 feat(chatbot): add Zustand store for chat state
04e5378 feat(chatbot): add LoadingIndicator component
84d4a32 feat(chatbot): add MessageBubble component
02c75ab feat(chatbot): add MessageInput component
162b7bf feat(chatbot): add MessageList component
e8b59e4 feat(chatbot): add FloatingFAB component
adc059e feat(chatbot): add AIChatbotModal component
27e0827 feat(chatbot): integrate FAB and modal into MainLayout
43a35f7 docs(phase-2): add Phase 2 Client Shell summary
```

## Phase 3 Git Commits

```
f99610d feat(chatbot): add type field to API route response
b377584 feat(chatbot): wire MessageInput to POST /api/ai-chatbot
6d6db4f feat(chatbot): add error bubble variant to MessageBubble
a370c8b feat(chatbot): add type field to ChatMessage for error bubble support
```

## Phase 5 Git Commits

```
c48a487 chore(chatbot): install ai @ai-sdk/react @upstash/ratelimit @upstash/redis
24a7404 feat(chatbot): add get_occupied_time_slots tool, dispatcher, and system prompt rules
ea3e343 feat(chatbot): add Upstash rate limiter and AI SDK streaming utilities
7bd0072 feat(chatbot): overhaul route handler with rate limiting, streaming, language nudge
38122a3 feat(chatbot): slim Zustand store and migrate MessageInput to useChat
8a06c9d feat(chatbot): update MessageList to useChat props and add AIProvider to modal
52d2c0e feat(chatbot): add warning/nudge bubble variants, streaming cursor, phase-aware loading
```

---

*State last updated: 2026-04-04 after Phase 5 completion*
