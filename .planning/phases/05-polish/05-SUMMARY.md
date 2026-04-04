---
phase: 05-polish
plan: 1
subsystem: ui, api, infra
tags: [ai-sdk, upstash, ratelimit, streaming, usechat, zustand, typescript]

# Dependency graph
requires:
  - phase: 04-polish-multi-turn
    provides: >
      callClaudeWithTools(), executeTool(), detectLanguage(), TOOL_DEFINITIONS (10 tools),
      buildSystemPrompt(), formatters (translateError, formatContractList, formatSessionList)
provides:
  - ai SDK streaming: token-by-token bot responses via textToStream() ReadableStream + useChat
  - get_occupied_time_slots: tool #11 + dispatcher for trainer availability checking
  - Upstash rate limiting: 20 req/min per userId on /api/ai-chatbot → HTTP 429
  - Language nudge: detectLanguage() mid-conversation language switch → type: 'nudge' bubble
  - useChat migration: Zustand messages/loading removed; useChat manages all chat state
  - Inline entity references: [1]/[2] numbering + "cái thứ 2" resolution rules in system prompt
  - English time parsing: "tomorrow at 9am", "next Thursday" rules in system prompt
  - UI polish: amber warning bubble (AlertTriangle), blue nudge bubble (Languages), streaming cursor
affects:
  - Phase 5 plan 2 (if any)
  - Any future chatbot streaming or rate-limiting work

# Tech tracking
tech-stack:
  added: [ai, @ai-sdk/react, @upstash/ratelimit, @upstash/redis]
  patterns:
    - AI SDK data stream format: `0:${JSON.stringify({ type: 'text', textDelta })}\n`
    - useChat (ai/react) replaces Zustand for all message/loading state
    - AIProvider wrapper pattern for useChat context
    - Upstash Ratelimit.slidingWindow(20, '1 m') per userId
    - Bilingual textToStream() chunking (10-char chunks) for smooth streaming
    - Status-aware LoadingIndicator: 'thinking' vs 'responding' + hasContent flag

key-files:
  created:
    - src/lib/ratelimit.ts — Upstash Ratelimit singleton (20 req/min)
    - src/lib/ai/streamUtils.ts — textToStream() ReadableStream in AI SDK format
  modified:
    - src/app/api/ai-chatbot/route.ts — rate limit, streaming Response, language nudge
    - src/lib/ai/anthropicService.ts — get_occupied_time_slots dispatcher
    - src/lib/ai/toolDefinitions.ts — get_occupied_time_slots (tool #11)
    - src/lib/ai/systemPrompt.ts — English time parsing + inline entity reference rules
    - src/store/useAIChatbotStore.ts — slimmed to isOpen/setOpen only
    - src/components/chatbot/MessageInput.tsx — useChat migration
    - src/components/chatbot/MessageList.tsx — useChat props + status/phase
    - src/components/chatbot/AIChatbotModal.tsx — AIProvider wrapper
    - src/components/chatbot/MessageBubble.tsx — warning/nudge variants + streaming cursor
    - src/components/chatbot/LoadingIndicator.tsx — phase-aware labels
    - src/app/globals.css — chatbot-cursor-blink keyframe

key-decisions:
  - "Upstash Redis rate limiting (20 req/min per userId) — fast, serverless-compatible, zero setup"
  - "textToStream() with 10-char chunks in AI SDK data stream format — compatible with useChat"
  - "useChat replaces Zustand for all chat state — cleaner, AI SDK manages streaming natively"
  - "AIProvider wraps MessageInput inside modal — useChat context scoped to modal"
  - "detectLanguage() language switch → nudge bubble (type: 'nudge') returned as NextResponse.json"
  - "Rate limit returns HTTP 429 with friendly message + type: 'nudge' hint for client"

patterns-established:
  - "AI SDK streaming pattern: server pre-computes full reply → textToStream() → streaming Response"
  - "Upstash rate limit guard in route handler before any processing"
  - "Language detection on last two user messages only (not full history)"

requirements-completed: []  # Phase 5 is v2 polish — no v1 requirements

# Metrics
duration: ~8min
completed: 2026-04-04
---

# Phase 5: Polish Summary

**Production-quality chatbot: streaming token-by-token rendering, Upstash rate limiting, language nudge, useChat migration, warning/nudge bubbles, and get_occupied_time_slots tool**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-04T14:31:00Z
- **Completed:** 2026-04-04T14:39:00Z
- **Tasks:** 10 (Wave 1: 1, Wave 2: 6, Wave 3: 4, Wave 4: 3 — some combined)
- **Files modified:** 13 files (4 new, 9 modified)

## Accomplishments

- **Streaming via AI SDK**: Bot responses stream token-by-token using `textToStream()` in AI SDK data stream format; `useChat` handles buffering and rendering natively
- **Rate limiting**: Upstash `Ratelimit.slidingWindow(20, '1 m')` on all `/api/ai-chatbot` requests; HTTP 429 with friendly message when exceeded
- **Language nudge**: Mid-conversation language switch detected via `detectLanguage()` on last two user messages → `type: 'nudge'` bubble returned
- **useChat migration**: Zustand `messages`/`isLoading`/`addMessage`/`setLoading`/`clearMessages` fully removed; `useChat` manages all chat state
- **get_occupied_time_slots tool**: Tool definition #11 + dispatcher for trainer availability checking before booking
- **Inline entity references**: System prompt instructs AI to number list items [1]/[2]/[3]; "cái thứ 2", "that one" rules added
- **English time parsing**: "tomorrow at 9am", "next Thursday", "at noon" rules added alongside existing Vietnamese rules
- **Warning + nudge bubbles**: Amber warning bubble with `AlertTriangle` icon; blue nudge bubble with `Languages` icon
- **Streaming cursor**: Blinking `chatbot-cursor-blink` cursor appears in last assistant bubble during active stream
- **Phase-aware LoadingIndicator**: "GoChul is thinking..." (initial) vs "Responding..." (streaming active)

## Task Commits

Each task was committed atomically:

1. **Wave 1: Install packages** — `c48a487` (chore)
2. **Wave 2 W2-T1/W2-T2/W2-T3: Tool definition, dispatcher, system prompt** — `24a7404` (feat)
3. **Wave 2 W2-T4/W2-T5: Ratelimit lib, streamUtils** — `ea3e343` (feat)
4. **Wave 2 W2-T6: Route handler overhaul** — `7bd0072` (feat)
5. **Wave 3 W3-T1/W3-T2: Zustand slim + MessageInput useChat** — `38122a3` (feat)
6. **Wave 3 W3-T3/W3-T4: MessageList useChat props + AIProvider** — `8a06c9d` (feat)
7. **Wave 4 W4-T1/W4-T2/W4-T3: Bubbles, LoadingIndicator, CSS** — `52d2c0e` (feat)

**Plan metadata:** `52d2c0e` (feat: final wave 4 commit)

## Files Created/Modified

- `src/lib/ratelimit.ts` — Upstash `Ratelimit` singleton (20 req/min per userId)
- `src/lib/ai/streamUtils.ts` — `textToStream()` → `ReadableStream` in AI SDK format
- `src/lib/ai/toolDefinitions.ts` — `get_occupied_time_slots` tool + added to `TOOL_DEFINITIONS` (11 items)
- `src/lib/ai/anthropicService.ts` — `case 'get_occupied_time_slots':` dispatcher
- `src/lib/ai/systemPrompt.ts` — English time parsing + inline entity reference sections
- `src/app/api/ai-chatbot/route.ts` — Rate limit, streaming Response, language nudge
- `src/store/useAIChatbotStore.ts` — Slimmed to `isOpen`/`setOpen`; `ChatMessage` type preserved
- `src/components/chatbot/MessageInput.tsx` — `useChat` replaces Zustand wiring
- `src/components/chatbot/MessageList.tsx` — Props from `useChat`; passes `phase`/`hasContent`/`isStreaming`
- `src/components/chatbot/AIChatbotModal.tsx` — `AIProvider` wrapper; removed `clearMessages`
- `src/components/chatbot/MessageBubble.tsx` — Warning/nudge variants + streaming cursor
- `src/components/chatbot/LoadingIndicator.tsx` — Phase-aware labels
- `src/app/globals.css` — `@keyframes chatbot-cursor-blink` + reduced-motion override

## Decisions Made

- **Upstash over local in-memory rate limit**: Works across Next.js serverless instances (Vercel/other)
- **`textToStream()` with 10-char chunks**: Smooth streaming feel without overhead; compatible with useChat fetch transport
- **`AIProvider` wraps `MessageInput` inside modal**: Keeps useChat context scoped to the modal lifecycle; no parent-level context needed
- **Language switch detection on last two messages only**: Avoids false positives from older conversation history
- **Rate limit 429 returns `type: 'nudge'`**: Hint for client to render the friendly error as a nudge bubble (same treatment as language switch)

## Deviations from Plan

**None — plan executed exactly as written.**

All 10 tasks implemented in the order and structure specified. Wave 2 combined W2-T1/W2-T2/W2-T3 into a single commit and W2-T4/W2-T5 into another for efficiency.

## Issues Encountered

None — plan was well-specified and all required file contents were provided inline.

## User Setup Required

**External services require manual configuration.** See [05-polish-USER-SETUP.md](./05-polish-USER-SETUP.md) for:

- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST token
- Environment variables required for `@upstash/redis` to connect

## Next Phase Readiness

Phase 5 is the final planned phase. All chatbot functionality (streaming, rate limiting, language support, entity references, availability checking) is complete.

Remaining open items from earlier phases:
- **Phase 1**: Verify Clerk session cookie forwarding from API route → GoChul API routes (curl test) — still open
- **Phase 4**: Verify tool-use loop end-to-end (all 16 v1 requirements from Phase 4)
- **Phase 4**: Codify Vietnamese time expression test harness before integration

---

*Phase: 05-polish*
*Completed: 2026-04-04*
