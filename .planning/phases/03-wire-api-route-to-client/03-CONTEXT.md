# Phase 3: Wire API Route to Client - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the Phase 2 client shell (FAB + modal + Zustand store) to the Phase 1 API route (`/api/ai-chatbot`). Wire `MessageInput` to POST the conversation to the API, render the response in the thread, and handle error states. The Phase 1 placeholder response is used — no AI logic yet (that lands in Phase 4).

Requirements covered: THRD-03, THRD-04, API-01–10

</domain>

<decisions>
## Implementation Decisions

### API Payload & Multi-Turn Architecture
- **D-01:** Full history round-trip — client sends `{ message: string, messages: Array<{ role: 'user'|'assistant', content: string }> }` in each POST. The `messages[]` field carries the full conversation context. API echoes back `{ reply, messages: [..., new assistant reply] }`. Client replaces its store with the API response (or appends the new reply to the existing array).

### Error Display in Thread
- **D-02:** Inline error bubble — errors from failed API calls are shown as styled bot message bubbles inside the thread. This keeps the thread as the single source of truth and makes errors recoverable (user can retry without losing history).
- **D-03:** Error bubble style — left-aligned, muted background (like normal bot bubbles), but with an `AlertCircle` or `XCircle` icon from lucide-react, red/orange text, and no markdown rendering.

### Greeting / Empty State
- **D-04:** Generic greeting for Phase 3 — `"Hi! I'm your GoChul assistant. Ask me about your contracts or training sessions."` (already in `MessageList.tsx`). Role-specific greetings (e.g., ADMIN sees "Bạn có quyền quản trị. Bạn cần hỗ trợ gì?") land in Phase 4.

### Bot Response Rendering
- **D-05:** Markdown rendering for all bot replies — `MessageBubble` uses `react-markdown` + `remark-gfm` for assistant messages (already wired from Phase 2). Apply it to all replies including the Phase 3 placeholder.

### API Response Type
- **D-06:** Typed response — API route returns `{ reply: string, type: 'text' | 'error', role: string }`. Client reads `type` to decide: `'text'` → normal bot bubble; `'error'` → error-style bubble. This avoids relying on HTTP status for client-side rendering logic.

### Verification Approach
- **D-07:** Manual verification only for Phase 3. No automated Playwright test in this phase. Test manually: open chatbot → send message → see bot reply bubble → see loading spinner during fetch → see empty state on modal close/reopen.

### Claude's Discretion
- Exact Tailwind classes for error bubble (icon color, text color, background shade)
- Whether to replace the store's `messages[]` entirely or append to it (both equivalent — Phase 2 store is already append-based)
- Whether `AIChatRequestBody` should validate `messages[]` item shape (type narrowing)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 artifacts (client connects to these)
- `src/app/api/ai-chatbot/route.ts` — Phase 1 route: accepts `{ message, messages? }`, already returns `{ reply, role, messages[] }`. Update to add `type` field and pass `messages[]` to `callClaudePlaceholder()`.
- `src/lib/ai/anthropicService.ts` — Phase 1 placeholder: `callClaudePlaceholder(systemPrompt, userMessage)` → single-turn only. Phase 3: update to accept `messages[]`.
- `src/lib/ai/systemPrompt.ts` — System prompt builder (Phase 1 output)
- `src/lib/ai/toolDefinitions.ts` — Tool definitions (Phase 1 output)

### Phase 2 artifacts (client side — wired in this phase)
- `src/store/useAIChatbotStore.ts` — Zustand store: `messages[]`, `isLoading`, `addMessage`, `setLoading` — already wired to UI
- `src/components/chatbot/MessageInput.tsx` — Phase 2: `handleSubmit` calls `addMessage` + `setLoading`. **Phase 3: Replace body with `fetch('/api/ai-chatbot', { method: 'POST', body: JSON.stringify({ message, messages }) })`**
- `src/components/chatbot/MessageList.tsx` — Phase 2: renders `messages[]` as bubbles + `LoadingIndicator`. Phase 3: no structural changes needed.
- `src/components/chatbot/MessageBubble.tsx` — Phase 2: bot bubbles use `react-markdown`. Add error-style variant.

### Phase 1 context decisions (carry forward)
- `docs/FEAT_AIBOT.txt` — Feature spec (tool routing, Vietnamese time rules)
- `docs/PROGRAM.md` — GoChul API structure, RBAC matrix
- `.planning/phases/01-skeleton-architecture/01-CONTEXT.md` — D-01: Clerk JWT template `'gochul-fitness'`, D-02: hybrid role permissions

### Existing codebase
- `src/components/ui/dialog.tsx` — `@base-ui/react` dialog primitives (Phase 2 uses this)
- `.planning/codebase/CONVENTIONS.md` — Hook patterns, component conventions
- `.planning/ROADMAP.md` §Phase 3 — Deliverables, success criteria, requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/useAIChatbotStore.ts` — Already wired: `addMessage({ role: 'user', content })` + `setLoading(true)` in MessageInput; `messages.map(...)` in MessageList
- `src/components/chatbot/MessageBubble.tsx` — Already has `react-markdown` for bot messages. Error variant needs a new class/style.
- `lucide-react` — `AlertCircle`, `XCircle`, `X`, `Send`, `Bot` all available

### Established Patterns
- Fetch calls: `const res = await fetch(url, { method, headers, body })` then `await res.json()`
- Mutation pattern: `onSuccess: () => queryClient.invalidateQueries(...)` but for chatbot, direct store updates
- Error handling: `try/catch` in route handler, `catch` in client fetch

### Integration Points
- `MessageInput.tsx` — Primary wiring point: replace fake loading (Phase 2) with real fetch
- `MessageBubble.tsx` — Add error variant: `type: 'error'` shows error icon + red text
- `AIChatbotModal.tsx` — Already wraps `MessageList` + `MessageInput`. No structural changes needed.
- `MainLayout.tsx` — Phase 2 already integrated `<FloatingFAB>` + `<AIChatbotModal>`. No changes needed.
</code_context>

<specifics>
## Specific Ideas

- The placeholder AI response in Phase 1 may return markdown-formatted text (since the Phase 1 system prompt asks it to be helpful). Render it with `react-markdown` even in Phase 3.
- The greeting in `MessageList.tsx` is currently hardcoded as `const GREETING = "Hi! I'm your GoChul assistant. Ask me about your contracts or training sessions."` — this stays for Phase 3.
- The placeholder `callClaudePlaceholder` already returns plain string — no changes needed to `anthropicService.ts` for Phase 3 wiring.
- Route's current `return NextResponse.json({ reply, role, messages })` — needs `type` field added.

</specifics>

<deferred>
## Deferred Ideas

### Bot response type expansion (Phase 4+)
- When the tool-use loop is live (Phase 4), the API will return structured types beyond `text | error` — e.g., `contract_list`, `session_booking`, `confirmation` cards. These will be Phase 4 decisions.

### Role-specific greetings (Phase 4)
- ADMIN: "Bạn có quyền quản trị. Bạn cần hỗ trợ gì?" / "You have admin access. What do you need?"
- STAFF: Similar but scoped to staff permissions
- CUSTOMER: Generic customer-facing greeting
- The store or route would need to know the user's role at render time

### Playwright integration test (Phase 4)
- Manual verification in Phase 3. Add automated E2E test in Phase 4 once AI logic is real.

### Streaming (Phase 5 / v2)
- Non-streaming for now. Streaming (token-by-token) is Phase 5.

</deferred>

---

*Phase: 03-wire-api-route-to-client*
*Context gathered: 2026-04-04*
