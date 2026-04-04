# Phase 5: Polish - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the chatbot for a production-quality v1 launch. No new v1 requirements — all deliverables are enhancements. The phase covers: streaming token-by-token rendering, inline entity reference resolution, time slot availability checking, English time parsing, rate limiting, and cross-language detection.

Requirements covered: v2 enhancements (HIST-01 partial, AVLB-01, AVLB-02, FALL-01 partial, STRM-01)

</domain>

<decisions>
## Implementation Decisions

### Streaming Implementation
- **D-01:** Use the **Vercel AI SDK** (`ai` package) for streaming. Install `@ai-sdk/anthropic` as the provider. This replaces the existing `fetch POST + await res.json()` pattern.
- **D-02:** **Replace Zustand** (`useAIChatbotStore`) with `useChat` hook as the primary message state manager. The `useChat` hook manages `messages[]`, `isLoading`, `input`, `setInput`, `handleSubmit`. Remove Zustand dependency from the chatbot component tree. Keep Zustand only for modal open/close state if needed.
- **D-03:** **Stream final output only** — the tool-use loop (`callClaudeWithTools()`) runs to completion server-side (no partial output visible to user). The final text is streamed token-by-token to the client. Confirms/proposals stop and wait for user input. This is simpler than progressive streaming and avoids protocol complexity.

### Inline Entity References
- **D-04:** Reference resolution is **AI prompt-driven** — the system prompt instructs Claude to assign `[1]`, `[2]` labels to list items, and to resolve references like "cái thứ 2", "hợp đồng kia", "the second one" from the conversation history. No new API routes, no server-side session store, no client-side ID injection.

### Availability Check
- **D-05:** Add `getOccupiedTimeSlots` as a **separate tool** in `TOOL_DEFINITIONS` (Phase 5 additions). The tool is called by Claude as a preliminary step before `create_session`. It is not automatically injected by `executeTool()` — Claude decides to call it when the user wants to book.
- **D-06:** When availability check reveals a conflict, the bot **surfaces alternatives inline** — a warning message bubble that says "That slot conflicts with an existing booking. Suggested alternatives: [slot A], [slot B]." The AI proposes options rather than returning a confirmation-style button. The user then picks from alternatives.

### English Time Parsing
- **D-07:** English time expressions are handled by the **system prompt** — extend the existing `buildSystemPrompt()` time rules to cover English patterns: "tomorrow at 9am", "next Thursday", "this weekend", "in 2 hours". No new libraries. Claude already handles English.

### Rate Limiting
- **D-08:** Rate limiting scoped **per request** to `/api/ai-chatbot` — 1 request = 1 unit. Tool calls inside the loop do not count separately. e.g., 20 requests/minute per user. A confirm+execute message counts as 1.
- **D-09:** Use **`@upstash/ratelimit` + `@upstash/redis`** as the rate limit backend. Requires Upstash account (free tier covers 10k req/day). Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to environment. Rate limiter initialized in route.ts with `Ratelimit` class.

### Cross-Language Nudge
- **D-10:** When a **mid-conversation language switch** is detected (via existing `detectLanguage()` from Phase 4), the bot sends an **inline warning bubble** with no buttons: "I noticed you switched language. I'll respond in [detected language]." The conversation continues without interruption.

### Claude's Discretion
- Exact `useChat` integration points — which components consume `useChat` hooks vs which still use local state
- Exact streaming UI behavior during the "thinking" phase (blank until loop finishes vs a "Running tools..." intermediate state)
- Exact Upstash rate limit key strategy (per userId vs per IP)
- Exact message bubble styling for the language nudge (same as error bubble? neutral style?)
- Whether to add `getOccupiedTimeSlots` tool to Phase 5 `TOOL_DEFINITIONS` only, or update the existing tool file

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI/Backend (Phase 1, Phase 3, Phase 4)
- `src/app/api/ai-chatbot/route.ts` — Phase 4 route: accepts `messages[]`, returns `{ reply, type, role, messages }`. **Phase 5: Add streaming Response + rate limiting.**
- `src/lib/ai/anthropicService.ts` — Phase 4: `callClaudeWithTools()`, `executeTool()`, `detectLanguage()`. **Phase 5: Add streaming wrapper + update tool dispatch.**
- `src/lib/ai/systemPrompt.ts` — System prompt builder. Phase 5: add English time rules + inline entity reference instructions.
- `src/lib/ai/toolDefinitions.ts` — All 10 tools. Phase 5: add `getOccupiedTimeSlots` tool.
- `src/lib/ai/formatters.ts` — Result formatters (Phase 4). May need update for availability conflict messages.

### Client side (Phase 2, Phase 3)
- `src/store/useAIChatbotStore.ts` — Zustand store. Phase 5: remove message/loading state, keep modal state only.
- `src/components/chatbot/MessageInput.tsx` — Phase 3 fetch wiring. Phase 5: replace with `useChat` hook from `ai/react`.
- `src/components/chatbot/MessageList.tsx` — Renders messages. Phase 5: consume `useChat` messages instead of Zustand.
- `src/components/chatbot/MessageBubble.tsx` — Renders markdown bubbles. Phase 5: add language-nudge variant + conflict/warning variant.

### Feature spec
- `docs/FEAT_AIBOT.txt` — Feature spec: chatbot behavior, Vietnamese time rules, API routing logic
- `docs/PROGRAM.md` — GoChul API structure, RBAC matrix, contract/session lifecycle
- `docs/SCHEDULE.md` — Schedule/slot API (if it exists — for `getOccupiedTimeSlots` tool definition)

### Prior phases (decisions carried forward)
- `.planning/phases/01-skeleton-architecture/01-CONTEXT.md` — D-01: Clerk JWT template `'gochul-fitness'`, D-02: hybrid role permissions
- `.planning/phases/03-wire-api-route-to-client/03-CONTEXT.md` — D-01: full history round-trip, D-06: typed API response
- `.planning/phases/04-multi-turn-tool-use-loop/04-CONTEXT.md` — D-01: `callClaudeWithTools()` in `anthropicService.ts`, D-03: two-step confirm, D-04: `type: 'proposal'` discriminator, D-06: markdown tables for results
- `.planning/ROADMAP.md` §Phase 5 — Deliverables, success criteria

### Existing codebase
- `.planning/codebase/CONVENTIONS.md` — Hook patterns, component conventions
- `.planning/codebase/ARCHITECTURE.md` — App structure, data flow

### Tech approach
- [Vercel AI SDK — useChat](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat) — streaming hook API
- [Vercel AI SDK — streamText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text) — server-side streaming
- [@upstash/ratelimit](https://upstash.com/docs/ratelimit) — Redis-based rate limiting

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `detectLanguage()` — already in `anthropicService.ts`, Phase 4 implementation (Vietnamese diacritics regex)
- `TOOL_DEFINITIONS` — already defined with all 10 tools; Phase 5 adds `getOccupiedTimeSlots`
- `buildSystemPrompt()` — already assembles the system prompt; Phase 5 adds English time rules + entity reference instructions
- `react-markdown` + `remark-gfm` — already wired in `MessageBubble.tsx`
- `MessageBubble.tsx` — already handles normal and error bubbles; Phase 5 adds language-nudge and conflict/warning variants
- `callClaudeWithTools()` — already runs the full loop; Phase 5 wraps with streaming

### Established Patterns
- Route handler: `auth()` → resolve role → build context → call AI function → return JSON
- Clerk token: `getToken({ template: 'gochul-fitness' })` for API forwarding
- Error handling: try/catch in route, typed error responses
- Package.json: no `@ai-sdk/` or `ai` packages yet — Phase 5 adds them

### Integration Points
- `route.ts` — add streaming Response + `@upstash/ratelimit` middleware
- `anthropicService.ts` — add `streamClaudeWithTools()` streaming variant
- `toolDefinitions.ts` — add `getOccupiedTimeSlots` tool definition
- `systemPrompt.ts` — add English time parsing rules + inline entity reference instructions
- `MessageInput.tsx` — replace fetch with `useChat` hook
- `MessageList.tsx` — consume `useChat` messages directly
- `useAIChatbotStore.ts` — remove messages/loading state; keep isOpen/modal state
</code_context>

<specifics>
## Specific Ideas

- The `useChat` hook from `ai/react` should replace the Zustand store for message state
- The streaming approach: route runs the full `callClaudeWithTools()` loop, then pipes the resulting text through `StreamingText` from `@ai-sdk/anthropic` or formats it as a plain text `ReadableStream`
- `getOccupiedTimeSlots` tool should take `trainer_id` and `date` as input, return a list of occupied time ranges
- Conflict warning bubble should use a distinct style (amber `--color-warning`) from the normal bot bubble
- Language nudge bubble should be a one-time inline message, not blocking — conversation continues immediately after

</specifics>

<deferred>
## Deferred Ideas

None — all 4 discussion areas covered their respective scope items.

</deferred>

---

*Phase: 05-polish*
*Context gathered: 2026-04-04*
