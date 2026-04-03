# Pitfalls Research

**Domain:** AI Chatbot Feature — GoChul Fitness (Next.js 16, TypeScript, Anthropic SDK, Clerk Auth, InstantDB)
**Researched:** 2026-04-04
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: AI Calls GoChul Fitness API Endpoints Without Permission Scoping

**What goes wrong:**
The AI model is given the full list of API endpoints and decides which to call based on user intent. Without strict scoping, a CUSTOMER asking to "list all contracts" could have the AI call `/api/contract/getAll` — an endpoint that returns all contracts in the system (including other customers' data), because the AI doesn't know that `getAll` returns everything, not just the current user's data. ADMIN-level endpoints could be invoked by any authenticated user if the AI is not explicitly told which role maps to which permissions. The result: unauthorized data disclosure or privilege escalation via natural-language instruction.

**Why it happens:**
The AI receives a system prompt describing all endpoints and their allowed roles, but the model cannot reliably enforce server-side RBAC logic from a prompt description alone. The assumption that "the API layer will handle permissions" is only true if every route correctly validates the caller's role. The codebase already has known RBAC inconsistencies (C7 — `roleCheck.ts` is unused; role checks are inlined with varying patterns). If even one route has a missing or buggy role check, the AI can exploit it. Additionally, passing a Clerk session token server-side does not automatically scope InstantDB queries to the user — the `INSTANTDB_ADMIN_TOKEN` is used for all operations (C2).

**How to avoid:**
1. **Route-level:** Treat every AI-callable endpoint as if it has no permission guard. Audit each route the AI is permitted to call and confirm it validates `role` from the Clerk session before any data access. Prefer endpoints that scope data by `userId`/`clerk_id` (e.g., `/api/contract/getAll?mine=true`) rather than endpoints that return global data.
2. **System prompt:** Explicitly list per-role permitted actions in the AI system prompt (not just endpoint names) so the model self-restricts before it even decides which endpoint to call.
3. **Parameter allowlist:** The AI should only pass parameters defined in the endpoint's schema — not arbitrary fields from the conversation. Reject unexpected parameters server-side.
4. **Read-only by default:** Default AI behavior to read-only operations unless the user explicitly requests a write action, and require at least one additional confirmation step for destructive actions (cancel, delete).

**Warning signs:**
- AI returns data belonging to another user or role — caught in first QA pass
- System prompt does not enumerate role-to-action mappings
- API route lacks an explicit `role` check (grep for `role ===` and compare against `roleCheck.ts`)
- `INSTANTDB_ADMIN_TOKEN` is used without a `clerk_id` filter in the query `where` clause

**Phase to address:**
**Phase 1 — Foundation** (Architecture & Security). Must be resolved before any API integration work begins.

---

### Pitfall 2: Unbounded Parameter Gathering Loops

**What goes wrong:**
The AI loops to collect missing required parameters (e.g., contract type, customer ID, date, trainer) until all fields are satisfied. Without strict termination rules, the loop either (a) never exits because the AI keeps asking re-phrased versions of the same question, frustrating the user; or (b) exits prematurely with partial data, then calls the API with undefined/null parameters, causing 400 errors or wrong records. In the worst case, the AI fills in missing parameters with hallucinated values ("I'll use your last contract's customer ID") rather than asking.

**Why it happens:**
The AI's objective is to complete the user's request, and if the user never provides a required field, the model may hallucinate a plausible value rather than give up. The loop termination condition is typically "all parameters satisfied" — but the definition of "satisfied" is fuzzy when the AI can substitute defaults. Additionally, the CONCERNS.md documents known race conditions in concurrent booking (C5, C6) — parameter gathering loops that span multiple API calls (e.g., first look up a customer ID, then create a session) compound those race windows.

**How to avoid:**
1. **Explicit parameter contract:** Define a strict schema per intent — required vs. optional fields, max attempts before giving up, and a final "I couldn't gather" response template.
2. **Required-field validation:** Before calling the API, the server-side handler validates that all required fields are present. If not, return a structured error the UI displays, not a raw API error to the user.
3. **No hallucinated defaults:** System prompt must explicitly forbid the AI from inventing user data (IDs, dates, names). The only valid source of data is the conversation history or an explicit API lookup.
4. **Loop depth limit:** Cap the number of follow-up questions per parameter (e.g., 3 attempts) and surface a clear failure message: "I need [field] to do this — could you provide it?"
5. **Cancellation path:** Always allow the user to type "cancel" or "never mind" to exit the loop cleanly.

**Warning signs:**
- AI response contains a value the user never mentioned (hallucination signal)
- Conversation thread exceeds 8–10 turns without resolution
- API call returns 400 with "missing required field" error — indicates premature call
- No "cancel" path visible in conversation flow

**Phase to address:**
**Phase 2 — Core Integration** (Parameter inference loop implementation). Design the loop schema before writing any loop logic.

---

### Pitfall 3: Vietnamese Time Inference Collapses Under Ambiguity

**What goes wrong:**
The AI is instructed to infer time windows from Vietnamese natural language ("sáng mai", "chiều thứ 6", "tối nay"). When inference is wrong, sessions are created for the wrong day or time. For example, if a user says "sáng mai" on a Thursday and the server's `now()` is Friday, the AI might interpret "tomorrow" as Saturday. Or "chiều" (afternoon) may be interpreted as 12:00–17:59 instead of the gym's actual business hours, leading to sessions booked outside operating hours. Time zone handling is also a risk — the server uses UTC `now()` but users think in Vietnam Time (UTC+7), and the AI does not consistently account for this.

**Why it happens:**
Vietnamese time expressions are relative and context-dependent. "Ngày mai" (tomorrow) requires knowing what "today" is — which depends on the server's clock, not the client's. The PROBLEM.md specifies time windows (morning = 0:00–11:59, afternoon = 12:00–14:59, evening = 15:00–17:59, night = 18:00–23:59), but these windows are gym-specific business logic that must be explicitly encoded — not inferred by the AI from natural language. The AI's base training data reflects general time conventions, not GoChul Fitness-specific windows.

**How to avoid:**
1. **Encode time windows in the system prompt as strict rules**, not examples: "Morning = 00:00–11:59, Afternoon = 12:00–14:59, Evening = 15:00–17:59, Night = 18:00–23:59. All times in Vietnam Time (UTC+7). Server time is the source of truth for 'today'."
2. **Server-side time resolution:** Do not rely on the AI to convert Vietnamese relative dates to ISO timestamps. After the AI extracts the user's intent and rough time reference, the server should resolve the actual timestamp using a date library (e.g., `date-fns`, `Temporal`) with the gym's timezone config. The AI's role is to extract the *intent* (create session) and *relative reference* (sáng thứ 6), not to compute the final timestamp.
3. **Confirmation before API call:** Before calling the API, the bot responds with a structured confirmation: "Create a session for [customer] with [trainer] at [date] [time] — is that correct?" The user must confirm before the write operation executes.
4. **Operating hours validation:** The server must validate that the resolved time falls within the gym's operating hours and reject out-of-hours requests with a clear message.
5. **Edge case list:** Document and test all ambiguous Vietnamese time expressions: "sáng nay" vs "sáng mai", "tuần sau", "thứ 2 tuần này", "cuối tuần".

**Warning signs:**
- Sessions created on the wrong day — caught when trainer checks their schedule
- AI responds with a time that conflicts with gym operating hours
- "sáng" or "chiều" used without the exact window definition in the system prompt
- No server-side timezone handling — AI doing all time math

**Phase to address:**
**Phase 2 — Core Integration** (Vietnamese time inference). System prompt rules + server-side resolution must be in place before parameter gathering loop testing begins.

---

### Pitfall 4: Floating Modal UI Bleeds State Into Pages and Breaks Accessibility

**What goes wrong:**
The floating action button (FAB) + modal overlay renders on top of every page. Without proper boundary management, the modal's React context and animation state leak into the underlying page's React tree, causing subtle bugs: TanStack Query caches from the modal's API calls bleed into the page's query cache; a page with an open modal that navigates (via Next.js link) keeps the modal mounted in the background; keyboard focus traps fail on certain pages, trapping users; screen readers announce the modal but then resume reading the page behind it. On mobile, the modal may cover critical UI elements with no close affordance.

**Why it happens:**
Next.js 16 App Router uses React's concurrent features — navigating away from a page does not unmount the previous page's components immediately if something (like a portal-rendered modal) holds a reference to the old tree. The modal uses `createPortal` to render into `document.body`, which is correct, but if the modal's state is managed by a context provider that wraps the entire app (e.g., a chatbot provider in `layout.tsx`), that provider stays mounted across navigations. The FAB button must also be accessible — a `button` with `aria-label`, keyboard operable, and visually persistent without obscuring content.

**How to avoid:**
1. **Isolate chatbot state:** The chatbot provider should be as close to the modal as possible — not wrapping the entire app. Prefer a lightweight client-side component rendered in a portal, with state scoped to the modal itself. Use `useState` for open/close rather than a global context unless sharing state across multiple entry points.
2. **Focus management:** Implement `useEffect` to trap focus inside the modal when open (`aria-modal="true"`, `role="dialog"`). On close, return focus to the FAB button. Handle `Escape` key to close.
3. **Route change listener:** Listen to Next.js router events (`usePathname` or `useSearchParams`) — if the route changes while the modal is open, close the modal automatically.
4. **Z-index layering:** Ensure the modal's z-index is above all page content but below any full-screen overlays (e.g., image lightboxes). The FAB button should have a fixed position with consistent z-index.
5. **Accessibility audit:** Test with VoiceOver/NVDA — modal must be announced on open, and focus must be trapped. The FAB button must have a visible focus ring.

**Warning signs:**
- Modal stays open after Next.js navigation (check with router-based navigation tests)
- TanStack Query cache keys appear in browser DevTools with chatbot-related data
- Focus visibly moves behind the modal when opened
- No `aria-modal` attribute on the modal container

**Phase to address:**
**Phase 1 — Foundation** (FAB + modal UI). UI isolation and accessibility must be designed upfront, not retrofitted after the feature works.

---

### Pitfall 5: Auth Token Passed to AI or Mismanaged in Server-Side Route

**What goes wrong:**
The chatbot's server-side route (the Next.js API route that calls the Anthropic SDK) needs the user's Clerk session token to make authenticated API calls on behalf of the user. Two failure modes:
(a) **Token leaked to AI:** The Clerk session token (or Clerk secret key) is included in the messages sent to the AI model, either in the system prompt or in user messages. The AI could theoretically echo it back or be tricked into disclosing it via prompt injection. More critically, the token is now in a third-party system's logs.
(b) **Token not forwarded:** The server-side route calls the GoChul Fitness API without passing the Clerk session token, so the API route falls back to the `INSTANTDB_ADMIN_TOKEN` (C2) — running with full admin privileges for what should be a scoped user operation.
(c) **Token stored or logged:** The server-side route logs the request or stores it, inadvertently persisting the user's auth token.

**Why it happens:**
The typical Next.js API route pattern (`const { userId } = await auth()`) works for routes that call Clerk directly, but the chatbot server route calls the Anthropic SDK — which is a separate API call. Developers often concatenate the Clerk session token into the request headers sent to GoChul Fitness API routes, and if that token ends up in the Anthropic API call (because the AI system prompt contains the token for "context"), it leaks. The codebase also has a known issue (C2) where `INSTANTDB_ADMIN_TOKEN` is used for all operations — without forwarding the user's token, every chatbot API operation runs as admin.

**How to avoid:**
1. **Never send tokens to the AI model:** The Anthropic API call should contain no user credentials, session tokens, or secret keys. The AI receives only: conversation history, system prompt (endpoint list + role rules + time rules), and resolved parameters.
2. **Forward Clerk token to GoChul Fitness API routes:** In the server-side chatbot route, obtain the session token via `const { userId, getToken } = await auth()` and forward `Authorization: Bearer <token>` to downstream GoChul API routes. This ensures RBAC is enforced at the target route level.
3. **Use short-lived tokens:** Clerk's `getToken({ template: 'gochul-fitness' })` issues short-lived tokens scoped to the app. Use this instead of raw Clerk session tokens.
4. **No logging of tokens:** Audit `console.log` statements in the chatbot server route. Ensure no request/response objects are logged that might contain the auth header.
5. **Separate concerns:** The chatbot route authenticates the user (via Clerk), resolves the AI parameters, calls Anthropic, then calls the GoChul API — with the user's token forwarded. Never combine these steps in a way that bleeds credentials.

**Warning signs:**
- `Authorization` header appears in any Anthropic API call payload (search for `getToken`, `Authorization` near Anthropic call sites)
- `console.log` or `console.error` in the chatbot API route logs request objects
- GoChul API routes called without `Authorization` header — requests run as INSTANTDB_ADMIN_TOKEN
- System prompt contains any Clerk key or token value

**Phase to address:**
**Phase 1 — Foundation** (Architecture & Security). Auth token architecture must be designed before the chatbot API route is implemented.

---

### Pitfall 6: AI Hallucinates API Endpoints or Invalid Parameter Combinations

**What goes wrong:**
The AI is given a list of endpoints and their parameters in the system prompt. It may invent endpoint names that don't exist (e.g., `/api/contract/search` or `/api/session/create`) and attempt to call them. Even when calling a real endpoint, it may pass invalid parameter combinations — e.g., setting `status: 'ACTIVE'` on a newly created contract (invalid lifecycle transition), or passing `credits: 0` when the API requires a positive integer. The GoChul Fitness API routes use `INSTANTDB_ADMIN_TOKEN` with no parameter validation depth, so invalid writes succeed or fail with cryptic database errors.

**Why it happens:**
LLMs hallucinate, especially under prompt injection or when given long lists of available tools. The more endpoints and parameters listed in the system prompt, the higher the chance of a hallucinated call. Additionally, GoChul Fitness contract and session lifecycles have specific state transition rules (NEWLY_CREATED → ACTIVE → EXPIRED/CANCELED; NEWLY_CREATED → CHECKED_IN/CANCELED/EXPIRED) that are enforced at the API route level — but the AI has no intrinsic knowledge of these rules unless explicitly encoded in the system prompt.

**How to avoid:**
1. **Strict endpoint allowlist in system prompt:** Only list endpoints the AI is actually permitted to call. Include exact HTTP method, exact path, and required parameters. Do not include endpoints that exist in the codebase but should not be accessible via the chatbot.
2. **Lifecycle rules in system prompt:** Encode state transition rules explicitly: "Contracts start in NEWLY_CREATED status and transition to ACTIVE when the start_date is reached. A session status can only transition to CHECKED_IN when both customer and staff have checked in."
3. **Server-side parameter validation:** The chatbot server-side handler should validate the resolved parameters against the endpoint's schema before making the API call. Reject invalid combinations with a structured error, not a raw API error.
4. **Dry-run option:** For write operations, the bot should first describe the action it will take (endpoint, method, parameters) and wait for user confirmation before executing.

**Warning signs:**
- API route receives a request with an unknown endpoint path
- Invalid status transition in API route logs
- Parameters passed that don't match the schema (e.g., wrong type, missing required field)
- AI response says "I've created your session" but the API returned an error

**Phase to address:**
**Phase 2 — Core Integration** (API integration + parameter validation). Endpoint allowlist and lifecycle rules must be in the system prompt before any integration testing.

---

### Pitfall 7: Multi-turn Conversation Context Bleeds Across Sessions

**What goes wrong:**
The chatbot's conversation history is stored in React state (in-memory) and cleared on modal close (per the out-of-scope note). However, the AI model receives prior conversation turns as `messages` history. If the chatbot API route passes the full message history to the Anthropic API on every request, a user who opened the modal, partially set up a contract, then closed the modal (history cleared) — but the session token was somehow retained or the message history was stored server-side — could result in context carryover. More subtly: if the modal reopens and the frontend re-sends a cached message history, or if the AI system prompt is built by concatenating previous responses, data from one conversation can bleed into another.

**Why it happens:**
The project spec says "Chat history cleared on modal close" — but if the implementation stores history server-side (e.g., to resume long conversations), it may persist beyond the modal session. Additionally, Next.js React Server Components and client component hydration can cause the message state to briefly outlive the modal's unmount. If the chatbot provider wraps the layout, the provider instance persists across modal close/open cycles, and message arrays defined outside the component scope could persist.

**How to avoid:**
1. **Client-side only state:** Store message history in `useState` inside the modal component. Do not lift it to a provider or context. On modal close (`onOpenChange(false)`), reset the state.
2. **No server-side conversation persistence:** The chatbot API route should be stateless — it receives the current message + the conversation history (from the client), processes it, and returns a response. The server should not store conversation history.
3. **Conversation window limit:** Cap the number of messages sent to the AI model (e.g., last 20 turns) to avoid token limit issues and reduce the surface area for context bleed.
4. **User ID in API call:** Include the Clerk `userId` in the API request so the server can associate the conversation with a user, even if the frontend clears history. This is also needed for rate limiting per user.

**Warning signs:**
- Conversation history persists across modal close/open cycles in the UI
- Chatbot API route has a database write or session storage operation
- `messages` array sent to Anthropic grows unbounded between turns
- No `userId` in chatbot API request payload

**Phase to address:**
**Phase 1 — Foundation** (FAB + modal UI). State management architecture must be defined alongside the modal implementation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `INSTANTDB_ADMIN_TOKEN` for all chatbot API calls | Simpler auth, no per-user token forwarding | Runs every operation as admin; any AI error has max blast radius (C2) | Never — always forward the user's Clerk token |
| Skip parameter validation on the server side | Faster initial implementation | AI passes invalid params → 400/500 errors surface to user | Never — server must validate all AI-resolved parameters |
| Send full conversation history to AI on every request | Better context for the model | Token cost grows, latency increases, context contamination risk | Only if window is capped (last N turns) |
| Hardcode time window rules in system prompt only | Quick to iterate on prompt | Rules drift out of sync with business logic; no test coverage | Only acceptable in Phase 1, must be codified in server logic by Phase 2 |
| Skip accessibility on modal (no focus trap, no ARIA) | Faster initial UI | Blocks keyboard users, fails WCAG, blocks screen readers | Never — FAB and modal are core UX; accessibility is non-negotiable |
| Store conversation history server-side to resume sessions | Users can pick up where they left off | Complexity: need auth, encryption, retention policy; spec explicitly excludes this | Never — per project spec, chat history is cleared on close |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Anthropic SDK → GoChul API | Passing Clerk token to Anthropic call | Anthropic receives only messages + system prompt. Clerk token forwarded only to GoChul API routes. |
| Clerk auth → chatbot API route | Using `auth()` without `getToken()` for downstream calls | Use `const token = await getToken({ template: 'gochul-fitness' })` to get a scoped short-lived token for forwarding |
| InstantDB → AI-sourced writes | Using `INSTANTDB_ADMIN_TOKEN` for writes initiated by AI | Forward user's Clerk token so InstantDB queries are scoped; admin token only for non-user-specific operations |
| AI → Vietnamese time | AI computes timestamps itself | AI extracts intent + relative reference; server resolves to UTC+7 timestamp using a date library |
| AI → parameter resolution | AI fills missing params with hallucinated defaults | System prompt forbids defaults; server validates required fields before API call |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded message history sent to AI | Token count grows with each turn; API cost doubles every N turns; eventual 4096/8192 token overflow | Cap at last 20 messages; summarize older turns if needed | Chat sessions longer than ~15 turns |
| AI calls GoChul `getAll` endpoints for every lookup | Each AI lookup fetches thousands of records; InstantDB query cost + AI parsing time | Use scoped lookups (by `userId`, `contractId`); AI should call targeted endpoints, not `getAll` | More than 5 lookups per conversation |
| Modal component re-renders on every route change | FAB or modal blinks/flickers on navigation; React DevTools shows excessive renders | Isolate chatbot component; memoize FAB button; use `useCallback` for handlers | Frequent navigators; pages with frequent data refresh |
| AI makes sequential API calls in a loop (parameter gathering) | Each missing parameter = 1 API call to AI + 1 round trip; 5 missing params = 10 round trips | Batch parameter requests: ask for all missing fields in one response | Users with complex requests (e.g., "create a contract") |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Clerk token forwarded to Anthropic | Token logged by Anthropic or its proxy; exposed in server logs | Never include `Authorization` headers or tokens in any Anthropic API call payload |
| AI receives `INSTANTDB_ADMIN_TOKEN` | Full database write access via prompt injection or hallucination | Token stays server-side only; never in system prompt or messages |
| AI calls ADMIN-only endpoints for CUSTOMER users | Privilege escalation via natural language | System prompt enumerates per-role allowed actions; API route enforces role check |
| No rate limiting on chatbot API route | User or external actor spams AI calls → cost explosion | Add per-user rate limit: max N AI calls per minute (e.g., `@upstash/ratelimit`) |
| Conversation history stored server-side without encryption | User's gym data (contracts, sessions) persisted in plaintext logs | Do not persist conversations server-side; keep stateless per spec |
| AI prompt injection from user input | Malicious user embeds instructions in their message to override the AI's behavior | Sanitize user input; use strict output validation schema for AI responses |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| AI asks for parameters one at a time in a loop | Tedious — user must answer 6+ questions before anything happens | Ask for all missing parameters in one concise message: "I need a few details: [customer name], [contract type], and [start date]." |
| No visible confirmation before a write action | User doesn't know the bot is about to modify their data | Structured summary before every write: "I'll create a PT contract for [Name] starting [Date]. Confirm?" with Yes/Cancel buttons |
| Error messages surface raw API errors | Cryptic: "400 Bad Request: undefined is not a valid status" | Map API errors to user-friendly messages: "I couldn't create the session — the trainer is already booked at that time." |
| Chatbot modal blocks the entire page with no close affordance | User feels trapped; cannot interact with the page | Always show a close button (×) in the modal header; Escape key closes; click-outside closes |
| AI responds in a different language than the user | Confusing if user wrote in Vietnamese but AI responds in English | Detect and match the user's language; system prompt instructs AI to respond in the same language as the user's last message |
| No loading indicator during AI processing | User doesn't know if the bot is thinking or stuck | Show a typing indicator ("...") while waiting for the AI response; show inline loading during API calls |
| AI creates a session without checking trainer availability | Double-booking the trainer (also: known race condition C5 in codebase) | Before creating, call `getOccupiedTimeSlots` for the trainer on the target date; surface conflicts to the user |

---

## "Looks Done But Isn't" Checklist

- [ ] **API integration:** Endpoint allowlist exists in system prompt — verify by grepping for all `/api/` paths in the prompt; compare against actual route files
- [ ] **RBAC scoping:** AI cannot access ADMIN-only endpoints when logged in as CUSTOMER — test by prompting as CUSTOMER with admin intent
- [ ] **Parameter loop:** Bot gives up after N attempts with a clear message — test with deliberately missing required fields
- [ ] **Vietnamese time:** "sáng thứ 6" resolves to correct date/time in Vietnam Time — test all four time windows + relative references
- [ ] **Modal accessibility:** Focus trapped in modal when open; Escape closes; FAB focusable — test with keyboard + VoiceOver
- [ ] **Auth token:** Clerk token never appears in Anthropic API call — audit network tab + server logs
- [ ] **Confirmation step:** Write operations (create, update, cancel) require user confirmation before execution — test every write action
- [ ] **Rate limiting:** Chatbot API route has per-user rate limits — verify 429 returned after threshold
- [ ] **Session token forwarding:** GoChul API routes receive `Authorization` header from chatbot — verify with mock or logs
- [ ] **No conversation persistence:** Chat history cleared on modal close — verify in React DevTools that state resets

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AI called wrong endpoint / invalid params | MEDIUM | API returns error → surface user-friendly message → bot asks user to rephrase; no data written |
| Vietnamese time miscalculated | MEDIUM | Session created at wrong time → STAFF can update or cancel; add explicit time confirmation step to prevent |
| Auth token leaked to AI | HIGH | Rotate the Clerk token immediately; audit all Anthropic logs for the token; review access logs |
| Modal breaks page navigation (stays open) | LOW | Force close on route change; add `useEffect` on `usePathname`; fix in next patch release |
| Race condition in concurrent booking (C5/C6) | HIGH | Already a known issue in codebase; chatbot makes it worse by increasing booking rate; prioritize fix in Phase 3 |
| AI hallucinates endpoint | MEDIUM | API returns 404; surface error; update system prompt to remove hallucinated endpoint; add server-side route allowlist validation |
| Prompt injection | HIGH | If user input overrides AI behavior, audit what data the AI accessed; revoke any tokens; review logs; update input sanitization |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| P1 — Unscoped API calls | Phase 1: Architecture & Security | RBAC test: CUSTOMER cannot access STAFF/ADMIN endpoints via chatbot |
| P2 — Unbounded parameter loops | Phase 2: Core Integration | Test: missing params → capped follow-up → clear failure message |
| P3 — Vietnamese time ambiguity | Phase 2: Core Integration | Test: "sáng thứ 6" → correct UTC+7 timestamp; operating hours validation |
| P4 — Modal state bleed | Phase 1: Foundation | Test: navigate while modal open → modal closes; React DevTools shows clean unmount |
| P5 — Auth token mismanagement | Phase 1: Architecture & Security | Audit: `Authorization` header absent from Anthropic network calls |
| P6 — Hallucinated endpoints/params | Phase 2: Core Integration | Test: prompt for non-existent endpoint → graceful error; invalid params → validation error |
| P7 — Context bleed across sessions | Phase 1: Foundation | Test: close modal → reopen → conversation starts fresh |

---

## Sources

- GoChul Fitness codebase — CONCERNS.md (C1–C26, April 2026)
- GoChul Fitness — PROJECT.md (AI chatbot spec, April 2026)
- GoChul Fitness — PROBLEM.md (Vietnamese time inference rules, session/contract lifecycle)
- Anthropic developer documentation — tool use, prompt engineering best practices
- Clerk authentication docs — `getToken()` usage, short-lived tokens
- Next.js 16 App Router — portal behavior, client/server component boundaries
- OWASP API Security Top 10 — prompt injection, auth token handling
- WebAIM accessibility checklist — modal focus management, ARIA roles

---
*Pitfalls research for: GoChul Fitness AI Chatbot Feature*
*Researched: 2026-04-04*
