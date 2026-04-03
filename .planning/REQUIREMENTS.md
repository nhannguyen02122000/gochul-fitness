# Requirements: GoChul Fitness AI Chatbot

**Defined:** 2026-04-04
**Core Value:** Users can manage their gym contracts and training sessions through natural conversation in English or Vietnamese, with zero manual UI navigation.

## v1 Requirements

### Chat UI

- [ ] **CHAT-01**: User can see a floating action button (FAB) on all pages in the bottom-right corner
- [ ] **CHAT-02**: User can click the FAB to open an AI chatbot modal overlay
- [ ] **CHAT-03**: User can close the chatbot modal (X button, Escape key, backdrop click)
- [ ] **CHAT-04**: Chat modal renders on top of all page content (portal/z-index)
- [ ] **CHAT-05**: Chat modal is accessible (ARIA labels, focus trap, keyboard navigation)
- [ ] **CHAT-06**: Chat state (messages, open/closed) is cleared when modal closes

### Message Thread

- [ ] **THRD-01**: User can type and send a message in the chat input
- [ ] **THRD-02**: User can see their own messages displayed in the thread
- [ ] **THRD-03**: Bot responses are streamed (or shown progressively) in the thread
- [ ] **THRD-04**: User can see a loading indicator while the bot is "thinking"
- [ ] **THRD-05**: Bot message contains structured result cards (not raw API text)
- [ ] **THRD-06**: Bot messages support markdown formatting (tables, bold, lists)
- [ ] **THRD-07**: Conversation history is maintained within a chat session (multi-turn)

### API Integration

- [ ] **API-01**: Bot can call `GET /api/contract/getAll` based on user intent
- [ ] **API-02**: Bot can call `POST /api/contract/create` to create contracts (ADMIN/STAFF)
- [ ] **API-03**: Bot can call `POST /api/contract/updateStatus` to update contract status
- [ ] **API-04**: Bot can call `POST /api/contract/update` to update contract fields (ADMIN)
- [ ] **API-05**: Bot can call `POST /api/contract/delete` to cancel contracts (ADMIN)
- [ ] **API-06**: Bot can call `GET /api/history/getAll` to list sessions
- [ ] **API-07**: Bot can call `POST /api/history/create` to book sessions
- [ ] **API-08**: Bot can call `POST /api/history/update` to update session date/time
- [ ] **API-09**: Bot can call `POST /api/history/updateStatus` to check-in or cancel sessions
- [ ] **API-10**: Bot can call `POST /api/history/updateNote` to add notes to sessions
- [ ] **API-11**: Bot respects role permissions — API calls fail with permission error if user lacks access
- [ ] **API-12**: Bot calls are authenticated with the current user's Clerk session token (server-side)

### Parameter Inference Loop

- [ ] **LOOP-01**: Bot asks follow-up questions when required API parameters are missing
- [ ] **LOOP-02**: Bot loops until all required parameters are collected before calling API
- [ ] **LOOP-03**: Bot confirms the action with the user before executing write operations
- [ ] **LOOP-04**: Bot handles ambiguous inputs gracefully (asks for clarification)
- [ ] **LOOP-05**: Tool-use loop is capped at 10 iterations to prevent runaway calls

### Vietnamese Time Inference

- [ ] **TIME-01**: Bot correctly maps "sáng" → 0:00–11:59, "chiều" → 12:00–14:59, "tối" → 15:00–17:59, "đêm" → 18:00–23:59
- [ ] **TIME-02**: Bot correctly converts 24h time to 12h format (e.g., "13:00" → "1:00 chiều")
- [ ] **TIME-03**: Bot infers relative dates: "hôm nay" → today, "ngày mai" → tomorrow, "thứ X" → next occurrence
- [ ] **TIME-04**: Bot correctly infers remaining time anchors from a single anchor (e.g., user says "thứ 6" → bot infers the upcoming Friday's date)
- [ ] **TIME-05**: Bot supports both English and Vietnamese time expressions

### Error Handling

- [ ] **ERR-01**: Bot displays permission errors in Vietnamese or English (matching user language)
- [ ] **ERR-02**: Bot displays API errors in a user-friendly format (not raw error messages)
- [ ] **ERR-03**: Bot retries failed API calls once before surfacing the error to the user
- [ ] **ERR-04**: Bot gracefully handles rate-limit errors with a retry suggestion

## v2 Requirements

### Chat History

- **HIST-01**: Chat history is persisted across sessions (stored per user in InstantDB)
- **HIST-02**: User can search past conversations

### Streaming

- **STRM-01**: Bot responses are streamed token-by-token for a more responsive feel

### Availability Check

- **AVLB-01**: Before booking a session, bot checks trainer availability via `getOccupiedTimeSlots` and suggests available slots
- **AVLB-02**: Bot warns user if a requested time slot conflicts with existing bookings

### Fallback

- **FALL-01**: Bot can suggest a direct link to the relevant page if it cannot complete an action via chat

## Out of Scope

| Feature | Reason |
|---------|--------|
| Voice input/output | Out of scope per PROJECT.md — text only |
| Chat history persistence (v1) | Cleared on modal close; privacy and XSS risk |
| AI fitness coaching / advice | Not the chatbot's purpose — it executes app operations only |
| Unlimited API call chains per message | Rate limit risk and user comprehension; cap at 2–3 per message |
| Natural language SQL / DB access | Blast radius too large on top of existing RBAC layer |
| Streaming (v1) | Non-streaming MVP first; streaming in v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHAT-01 | Phase 2 — Client Shell | Pending |
| CHAT-02 | Phase 2 — Client Shell | Pending |
| CHAT-03 | Phase 2 — Client Shell | Pending |
| CHAT-04 | Phase 2 — Client Shell | Pending |
| CHAT-05 | Phase 2 — Client Shell | Pending |
| CHAT-06 | Phase 2 — Client Shell | Pending |
| THRD-01 | Phase 2 — Client Shell | Pending |
| THRD-02 | Phase 2 — Client Shell | Pending |
| THRD-03 | Phase 3 — Wire API Route to Client | Pending |
| THRD-04 | Phase 3 — Wire API Route to Client | Pending |
| THRD-05 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| THRD-06 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| THRD-07 | Phase 2 — Client Shell | Pending |
| API-01 | Phase 3 — Wire API Route to Client | Pending |
| API-02 | Phase 3 — Wire API Route to Client | Pending |
| API-03 | Phase 3 — Wire API Route to Client | Pending |
| API-04 | Phase 3 — Wire API Route to Client | Pending |
| API-05 | Phase 3 — Wire API Route to Client | Pending |
| API-06 | Phase 3 — Wire API Route to Client | Pending |
| API-07 | Phase 3 — Wire API Route to Client | Pending |
| API-08 | Phase 3 — Wire API Route to Client | Pending |
| API-09 | Phase 3 — Wire API Route to Client | Pending |
| API-10 | Phase 3 — Wire API Route to Client | Pending |
| API-11 | Phase 1 — Skeleton & Architecture | Pending |
| API-12 | Phase 1 — Skeleton & Architecture | Pending |
| LOOP-01 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| LOOP-02 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| LOOP-03 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| LOOP-04 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| LOOP-05 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| TIME-01 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| TIME-02 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| TIME-03 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| TIME-04 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| TIME-05 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| ERR-01 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| ERR-02 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| ERR-03 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |
| ERR-04 | Phase 4 — Multi-Turn + Tool-Use Loop | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32 ✓
- Unmapped: 0 ✓

---

*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after roadmap creation*
