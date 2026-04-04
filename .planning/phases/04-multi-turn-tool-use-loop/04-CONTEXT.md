# Phase 4: Multi-Turn + Tool-Use Loop - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the full AI logic: tool-use loop in the API route, Vietnamese time inference, structured result cards, and user-friendly error translation. The bot becomes genuinely useful — handling multi-turn parameter gathering, executing write operations with confirmation, and formatting results as readable markdown. Non-streaming only (streaming is Phase 5).

Requirements covered: LOOP-01–05, TIME-01–05, ERR-01–04, THRD-05, THRD-06

</domain>

<decisions>
## Implementation Decisions

### Tool-Use Loop Architecture
- **D-01:** Loop lives in `anthropicService.ts` — new `callClaudeWithTools()` function alongside existing `callClaudePlaceholder()`. Keeps route.ts clean and the AI logic reusable.
- **D-02:** `callClaudeWithTools()` signature: `({ messages, role, userName, userInstantId, clerkToken })` → `{ text: string, toolsUsed: ToolResult[], iterations: number }`. The route calls one function and gets the final text plus debug metadata.

### Confirmation Flow
- **D-03:** Two-step confirmation: AI proposes write action as a bot bubble with a "Confirm" button. User clicks Confirm → sends a special `CONFIRMED: <action>` message to the AI → AI executes the write tool → result shown in a new bubble. This separates "intent confirmation" from "final result" and avoids silent writes.
- **D-04:** Route returns `type: 'proposal'` in the response JSON for confirmation bubbles. Client detects `type === 'proposal'` and renders a `Confirm` button bubble. Button click sends `CONFIRMED: create_contract` as a user message. This keeps the client contract simple — `type` is the discriminator for all bubble variants.

### Structured Result Formatting
- **D-05:** Formatting happens server-side in `executeTool()` in `anthropicService.ts`. Raw API JSON goes through a formatter before being passed back to Claude and to the client. This gives the AI context-aware formatted results during the loop.
- **D-06:** Results formatted as markdown tables in bot bubbles. `react-markdown` + `remark-gfm` already wired in `MessageBubble.tsx` from Phase 2. Contract lists, session lists, and action confirmations all use markdown tables, bold headers, and bullet points.

### Claude's Discretion
- Exact prompt wording for the confirmation proposal (how to phrase "ready to execute?")
- Exact markdown table format for contracts vs. sessions (column set, header labels)
- Exact retry logic (how many retries, exponential backoff or fixed delay)
- How to format the "toolsUsed" debug metadata in the return object
- Whether `callClaudeWithTools()` uses `anthropicClient.messages.create()` streaming or non-streaming (Phase 4: non-streaming; streaming is Phase 5)
- Confirmation button UI styling (same as send button? different?)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI/Backend (Phase 1, Phase 3)
- `src/app/api/ai-chatbot/route.ts` — Phase 3 route: accepts `messages[]`, returns `{ reply, type, role, messages }`. **Phase 4: Replace `callClaudePlaceholder` with `callClaudeWithTools`**.
- `src/lib/ai/anthropicService.ts` — Phase 1 placeholder: `callClaudePlaceholder(systemPrompt, userMessage)`. **Phase 4: Add `callClaudeWithTools()` and `executeTool()`**.
- `src/lib/ai/systemPrompt.ts` — System prompt builder. Already has Vietnamese time rules and RBAC matrix. **Phase 4: Add confirmation instructions for the AI**.
- `src/lib/ai/toolDefinitions.ts` — All 10 tool definitions. Phase 4: `TOOL_DEFINITIONS` passed to `messages.create({ tools: TOOL_DEFINITIONS })`.

### Client side (Phase 2, Phase 3)
- `src/store/useAIChatbotStore.ts` — Zustand store: `addMessage`, `setLoading`. Phase 4: `addMessage` with `type: 'proposal'` for confirmation bubbles.
- `src/components/chatbot/MessageInput.tsx` — Phase 3 fetch wiring. Phase 4: detect `type === 'proposal'` in API response, render inline Confirm button.
- `src/components/chatbot/MessageBubble.tsx` — Already renders markdown. Phase 4: add proposal-style variant with Confirm button.
- `src/components/chatbot/MessageList.tsx` — Renders messages. Phase 4: no structural changes needed.

### Feature spec
- `docs/FEAT_AIBOT.txt` — Feature spec: chatbot behavior, Vietnamese time rules, API routing logic
- `docs/PROGRAM.md` — GoChul API structure, RBAC matrix, contract/session lifecycle

### Prior phases (decisions carried forward)
- `.planning/phases/01-skeleton-architecture/01-CONTEXT.md` — D-01: Clerk JWT template `'gochul-fitness'`, D-02: hybrid role permissions
- `.planning/phases/03-wire-api-route-to-client/03-CONTEXT.md` — D-01: full history round-trip, D-06: typed API response
- `.planning/ROADMAP.md` §Phase 4 — Deliverables, success criteria, requirements

### Existing codebase
- `.planning/codebase/CONVENTIONS.md` — Hook patterns, component conventions
- `.planning/codebase/ARCHITECTURE.md` — App structure, data flow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TOOL_DEFINITIONS` array — already defined with all 10 tools and RBAC scoping in comments
- `buildSystemPrompt()` — already includes Vietnamese time rules, role matrix, and behavior rules
- `react-markdown` + `remark-gfm` — already wired in `MessageBubble.tsx`
- `useAIChatbotStore` — `addMessage` already accepts `role` + `content`

### Established Patterns
- Route handler: `auth()` → resolve role → build context → call AI function → return JSON
- Clerk token: `getToken({ template: 'gochul-fitness' })` for API forwarding
- Error handling: try/catch in route, typed error responses

### Integration Points
- `anthropicService.ts` — add `callClaudeWithTools()` and `executeTool()` functions
- `route.ts` — replace `callClaudePlaceholder` call with `callClaudeWithTools` call
- `MessageBubble.tsx` — add proposal variant detection and Confirm button
- `MessageInput.tsx` — add `CONFIRMED:` message detection after fetch response
</code_context>

<specifics>
## Specific Ideas

- The "Confirm" button should look similar to the send button (coral) but labeled "Confirm"
- Confirmation bubble text should clearly state what action will be taken: "Create contract for [Customer Name], 10 sessions PT, 1,500,000 VND?"
- The `toolsUsed` metadata is useful for the executor for debuggability but not shown to the user
- The loop must stop at `MAX_TOOL_ITERATIONS = 10` and return a graceful "could not complete" message

</specifics>

<deferred>
## Deferred Ideas

### Streaming (Phase 5)
- Non-streaming for Phase 4. Streaming (token-by-token) is Phase 5.

### Inline entity references (Phase 5)
- "cái thứ 2" resolving to list items from prior turn. Requires the AI to assign stable IDs to list items.

### Rate limiting (Phase 5)
- `@upstash/ratelimit` on `/api/ai-chatbot`. Phase 4: no rate limiting.

### Cross-language nudge (Phase 5)
- Mid-conversation language switch detection.

### Availability check (Phase 5)
- `getOccupiedTimeSlots` call before booking.

</deferred>

---

*Phase: 04-multi-turn-tool-use-loop*
*Context gathered: 2026-04-04*
