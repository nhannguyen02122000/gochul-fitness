# GoChul Fitness AI Chatbot — Roadmap v1.0

**Created:** 2026-04-04
**Version:** 1.0
**Status:** Not started

---

## Phase Overview

| # | Name | Goal | Requirements | Success Criteria | UI |
|---|------|------|-------------|-----------------|----|
| 1 | Skeleton & Architecture | Establish the server-side API route, tool definitions, and auth security foundation | API-11, API-12 | 7 criteria | no |
| 2 | Client Shell | Build the FAB + modal UI, message thread, and Zustand store in isolation | CHAT-01–06, THRD-01–07 | 6 criteria | yes | ✅ Complete (2026-04-04) |
| 3 | Wire API Route to Client | Connect the UI to the API route; verify Clerk cookie forwarding | THRD-03, THRD-04, API-01–10 | 5 criteria | yes |
| 4 | Multi-Turn + Tool-Use Loop | Implement the full AI logic: parameter loop, Vietnamese time inference, structured results, error handling | LOOP-01–05, TIME-01–05, ERR-01–04, THRD-05–07 | 7 criteria | no |
| 5 | Polish | Add streaming, follow-up entity references, availability check, English time parsing | (v2 deliverables, no v1 requirements) | 6 criteria | yes |

---

## Phase 1: Skeleton & Architecture

**Goal:** Establish the server-side API route, tool definitions, and auth security foundation. No AI logic or UI code.

### Deliverables

- `/api/ai-chatbot/route.ts` — Next.js Route Handler with Clerk `auth()` → `userId` → `getUserSetting()` → role; hardcoded system prompt (no tool-use loop yet); returns a placeholder response
- `toolDefinitions.ts` — complete `TOOL_DEFINITIONS` constant with all endpoint schemas (`GET /api/contract/getAll`, `POST /api/contract/create`, `POST /api/contract/updateStatus`, `POST /api/contract/update`, `POST /api/contract/delete`, `GET /api/history/getAll`, `POST /api/history/create`, `POST /api/history/update`, `POST /api/history/updateStatus`, `POST /api/history/updateNote`); per-role action scoping in comments
- `anthropicService.ts` — `@anthropic-ai/sdk` client wrapper using `CLAUDE_API_KEY`, `CLAUDE_BASE_URL`, `MODEL_NAME`
- Verify Clerk session cookie forwarding from API route → GoChul API routes works with a single curl test

### Requirements Covered

| ID | Requirement |
|----|-------------|
| API-11 | Bot respects role permissions — API calls fail with permission error if user lacks access |
| API-12 | Bot calls are authenticated with the current user's Clerk session token (server-side) |

### Success Criteria

1. `POST /api/ai-chatbot` with a valid Clerk session returns HTTP 200 and a non-empty JSON body; without a session it returns HTTP 401
2. The route handler correctly resolves the user's role (ADMIN / STAFF / CUSTOMER) from `getUserSetting()`
3. The `TOOL_DEFINITIONS` constant contains all 10 GoChul API endpoints with correct request/response schemas
4. A curl test hitting the route with a forwarded Clerk token successfully calls one GoChul API endpoint and returns the response (auth forwarding verified)
5. The system prompt generated for the AI includes the user's role context and all tool definitions
6. No Clerk session tokens appear in any `console.log` output or error traces in the route handler
7. The route handler is `server-only` (not imported by any client component) — verified by TypeScript build

---

## Phase 2: Client Shell

**Goal:** Build the FAB + modal UI, message thread, and Zustand store in complete isolation with no AI logic. A fake "thinking" state is sufficient for testing.

**Status:** ✅ Complete (2026-04-04) — 10 tasks, 10 commits

### Deliverables

- `FloatingFAB.tsx` — bottom-right fixed floating action button; visible on all pages; opens modal on click
- `AIChatbotModal.tsx` — portal-based overlay (`createPortal` to `document.body`); closes on X button, Escape key, backdrop click; focus trap; `aria-modal`
- `useAIChatbotStore.ts` — Zustand store: `messages[]`, `isLoading`, `isOpen`, `addMessage`, `setLoading`, `setOpen`, `clearMessages`; no persistence middleware
- `MessageList.tsx` — scrollable message list; auto-scrolls to bottom on new messages
- `MessageBubble.tsx` — renders user and bot messages; bot messages support markdown (bold, lists, tables) via `react-markdown`
- `MessageInput.tsx` — text input; Enter key + send button to submit; disabled while loading
- `LoadingIndicator.tsx` — spinner / "..." shown while bot is processing
- Modal closes automatically on route change (via `usePathname` listener)

### Requirements Covered

| ID | Requirement |
|----|-------------|
| CHAT-01 | User can see a floating action button (FAB) on all pages in the bottom-right corner |
| CHAT-02 | User can click the FAB to open an AI chatbot modal overlay |
| CHAT-03 | User can close the chatbot modal (X button, Escape key, backdrop click) |
| CHAT-04 | Chat modal renders on top of all page content (portal/z-index) |
| CHAT-05 | Chat modal is accessible (ARIA labels, focus trap, keyboard navigation) |
| CHAT-06 | Chat state (messages, open/closed) is cleared when modal closes |
| THRD-01 | User can type and send a message in the chat input |
| THRD-02 | User can see their own messages displayed in the thread |
| THRD-07 | Conversation history is maintained within a chat session (multi-turn) |

### Success Criteria

1. FAB is visible on all app pages (layout-level placement) and never obscured by other UI elements
2. Modal opens on FAB click and closes via X button, Escape key, and backdrop click — all three paths work
3. A test message typed in the input appears in the thread as a user bubble immediately on send
4. Zustand store is empty (`messages = []`) after modal is closed and reopened
5. Keyboard focus is trapped inside the open modal; Tab cycles within modal; first focusable element receives focus on open
6. The component tree renders without errors in a full Next.js build (TypeScript strict mode)

---

## Phase 3: Wire API Route to Client

**Goal:** Connect the client shell to the API route. Verify Clerk cookie forwarding works end-to-end. Non-streaming responses only.

### Deliverables

- Update `MessageInput.tsx` to `POST /api/ai-chatbot` on submit with the full `messages[]` array in the request body
- Render the API response as a bot `MessageBubble` in the thread
- Show `LoadingIndicator` while awaiting the response; hide on receipt
- Conversation context (all prior messages) sent in each request to maintain multi-turn state
- Error states surfaced as bot error bubbles (without crashing the thread)
- The route handler updated to accept `messages[]` and return a plain JSON response (not streaming)

### Requirements Covered

| ID | Requirement |
|----|-------------|
| THRD-03 | Bot responses are streamed (or shown progressively) in the thread |
| THRD-04 | User can see a loading indicator while the bot is "thinking" |
| API-01 | Bot can call `GET /api/contract/getAll` based on user intent |
| API-02 | Bot can call `POST /api/contract/create` to create contracts (ADMIN/STAFF) |
| API-03 | Bot can call `POST /api/contract/updateStatus` to update contract status |
| API-04 | Bot can call `POST /api/contract/update` to update contract fields (ADMIN) |
| API-05 | Bot can call `POST /api/contract/delete` to cancel contracts (ADMIN) |
| API-06 | Bot can call `GET /api/history/getAll` to list sessions |
| API-07 | Bot can call `POST /api/history/create` to book sessions |
| API-08 | Bot can call `POST /api/history/update` to update session date/time |
| API-09 | Bot can call `POST /api/history/updateStatus` to check-in or cancel sessions |
| API-10 | Bot can call `POST /api/history/updateNote` to add notes to sessions |

### Success Criteria

1. Sending a message in the modal triggers a `POST /api/ai-chatbot` fetch with the full conversation history
2. The bot's response appears as a bubble in the thread within 5 seconds for a simple query (no AI logic yet — route returns placeholder)
3. The `isLoading` spinner is visible during the fetch and disappears after the response is rendered
4. The Clerk session cookie is forwarded correctly: the API route authenticates as the logged-in user (verified by returning the user's role in the response)
5. A second message in the same session is sent alongside the first message in the request body (multi-turn context verified)

---

## Phase 4: Multi-Turn + Tool-Use Loop

**Goal:** Implement the full AI logic — parameter gathering loop, Vietnamese time inference, structured result display, and error translation. This is the core value phase.

### Deliverables

- Inject `TOOL_DEFINITIONS` into `anthropic.messages.create()` tool-use; execute tools via `executeTool()` calling GoChul API routes with forwarded Clerk token
- Implement tool-use loop: `messages.create()` → execute tools → re-call with results → repeat until `stop_reason === 'end_turn'` or `MAX_TOOL_ITERATIONS === 10`
- Vietnamese time-window rules encoded in system prompt (strict format per `FEAT_AIBOT.txt`): sáng → 00:00–11:59, chiều → 12:00–14:59, tối → 15:00–17:59, đêm → 18:00–23:59 UTC+7
- Relative date rules: "hôm nay" → today, "ngày mai" → tomorrow, "thứ X" → next occurrence of that weekday
- Structured result cards: formatted summaries (contract details, session info) not raw API text — built server-side in `executeTool()` result formatter
- API error → user-friendly message mapping: permission errors, validation errors, rate-limit errors each mapped to Vietnamese/English friendly messages matching the user's language
- One retry on failed API calls before surfacing the error
- Bot confirms write operations with the user before executing `POST`/`DELETE` calls

### Requirements Covered

| ID | Requirement |
|----|-------------|
| LOOP-01 | Bot asks follow-up questions when required API parameters are missing |
| LOOP-02 | Bot loops until all required parameters are collected before calling API |
| LOOP-03 | Bot confirms the action with the user before executing write operations |
| LOOP-04 | Bot handles ambiguous inputs gracefully (asks for clarification) |
| LOOP-05 | Tool-use loop is capped at 10 iterations to prevent runaway calls |
| TIME-01 | Bot correctly maps "sáng" → 0:00–11:59, "chiều" → 12:00–14:59, "tối" → 15:00–17:59, "đêm" → 18:00–23:59 |
| TIME-02 | Bot correctly converts 24h time to 12h format (e.g., "13:00" → "1:00 chiều") |
| TIME-03 | Bot infers relative dates: "hôm nay" → today, "ngày mai" → tomorrow, "thứ X" → next occurrence |
| TIME-04 | Bot correctly infers remaining time anchors from a single anchor (e.g., user says "thứ 6" → bot infers the upcoming Friday's date) |
| TIME-05 | Bot supports both English and Vietnamese time expressions |
| ERR-01 | Bot displays permission errors in Vietnamese or English (matching user language) |
| ERR-02 | Bot displays API errors in a user-friendly format (not raw error messages) |
| ERR-03 | Bot retries failed API calls once before surfacing the error to the user |
| ERR-04 | Bot gracefully handles rate-limit errors with a retry suggestion |
| THRD-05 | Bot message contains structured result cards (not raw API text) |
| THRD-06 | Bot messages support markdown formatting (tables, bold, lists) |

### Success Criteria

1. A CUSTOMER sends "liệt kê hợp đồng của tôi" — bot calls `GET /api/contract/getAll`, returns a formatted contract list card
2. An ADMIN sends "tạo hợp đồng mới" with no parameters — bot asks for required fields one by one until all are collected, then asks for confirmation before calling `POST /api/contract/create`
3. A STAFF sends "đặt lịch tập vào sáng mai 9h" — bot resolves "sáng mai 9h" to a UTC+7 timestamp and books the session via `POST /api/history/create`
4. A CUSTOMER attempts an admin-only action — bot returns a Vietnamese/English permission error matching the user's language, not a raw 403
5. A session creation fails with a rate-limit error — bot displays a friendly message and suggests retrying in 30 seconds
6. The tool-use loop reaches 10 iterations without completing and stops, returning a graceful "could not complete" message
7. A user sends "hủy cái thứ 2" after a prior turn listing sessions — bot correctly resolves the reference and cancels the correct session

---

## Phase 5: Polish

**Goal:** Complete the feature for a production-quality v1 launch. No new v1 requirements — all items are enhancements.

### Deliverables

- **Streaming responses** — Replace non-streaming `POST` with `ReadableStream` + `useChat` `stream` prop from the Vercel AI SDK (`ai`) for token-by-token rendering
- **Inline entity references** — Bot assigns stable identifiers to list items ("[1]", "[2]"); subsequent turns resolve "cái thứ 2", "hợp đồng kia" to the correct entity via conversation history
- **Time slot availability check** — Before booking, call `GET /api/schedule/getOccupiedTimeSlots`; surface conflicts; suggest nearest available slot
- **English time parsing** — "tomorrow at 9am", "next Thursday", "this weekend" alongside Vietnamese expressions
- **Rate limiting** — `@upstash/ratelimit` on `/api/ai-chatbot` (e.g., 20 requests/minute per user)
- **Cross-language nudge** — Detect mid-conversation language switch and prompt the user to confirm language preference

### Success Criteria

1. Bot responses render token-by-token (streaming) with no visible lag or flickering
2. "cái thứ 2" in turn N+1 resolves to the second item listed in turn N
3. Booking a conflicting time slot surfaces a warning with the next available slot suggestion
4. "book me in for tomorrow 9am" (English) is correctly resolved to a UTC+7 timestamp
5. Exceeding 20 requests/minute returns HTTP 429 with a friendly rate-limit message
6. Switching from Vietnamese to English mid-conversation triggers a "Switching to English?" prompt

---

## Dependencies

```
Phase 1  (server foundation)
    │
    ├── Phase 2  (client shell — parallel if team allows)
    │
    └── Phase 3  (wire UI to API — requires Phase 1)
              │
              └── Phase 4  (AI logic — requires Phase 3)
                      │
                      └── Phase 5  (polish)
```

**Phases 1 and 2 can run in parallel** — Phase 1 is pure server-side API route work; Phase 2 is pure client-side UI shell. Neither depends on the other.

**Phase 3 is the gate before Phase 4** — Clerk cookie forwarding from a server-side `fetch` inside a Next.js Route Handler must be verified before adding loop complexity.

---

## Coverage Summary

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 1 | API-11, API-12 | 2 |
| Phase 2 | CHAT-01–06, THRD-01, THRD-02, THRD-07 | 9 |
| Phase 3 | THRD-03, THRD-04, API-01–10 | 12 |
| Phase 4 | LOOP-01–05, TIME-01–05, ERR-01–04, THRD-05, THRD-06 | 16 |
| Phase 5 | (v2 enhancements only) | 0 |
| **Total v1** | | **32** |

**100% coverage** — all 32 v1 requirements mapped to exactly one phase.

---

*Roadmap created: 2026-04-04*
*Version: 1.0*
