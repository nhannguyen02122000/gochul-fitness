# Project Research Summary

**Project:** GoChul Fitness AI Chatbot
**Domain:** AI Chatbot — In-app conversational interface (multi-turn, role-aware, API-driven)
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

GoChul Fitness is building a floating AI assistant inside its gym management web app. Unlike generic SaaS support widgets (Intercom, Drift), this chatbot is an **operational tool** — it executes real actions inside the app (create contracts, book sessions, cancel bookings) via existing API endpoints, with Vietnamese language support and role-based permission scoping. The recommended stack uses `@anthropic-ai/sdk` for Claude tool-use, the Vercel AI SDK (`ai`) for streaming UI hooks, Zustand for in-memory message state, and framer-motion for modal animations — all running in a Next.js 16 API Route that keeps credentials server-side.

The highest risks are not technical complexity but behavioral: the AI must gather missing parameters without looping forever, correctly infer Vietnamese time windows (morning/afternoon/evening/night + relative days) into UTC+7 timestamps, and never expose Clerk session tokens to the AI model. These risks are **preventable** with upfront system prompt design, server-side time resolution, and strict auth token hygiene. The feature dependency graph is linear for the UI shell but branching for the tool-use loop — Phase 3 (wire API to client) is the critical integration point that must be verified before Phase 4 begins.

## Key Findings

### Recommended Stack

The AI chatbot sits on four net-new packages layered over GoChul Fitness's existing stack (Next.js 16, Clerk, InstantDB, Tailwind CSS 4, shadcn/ui). `@anthropic-ai/sdk@0.82.0` is the Claude client — already wired via existing env vars (`CLAUDE_API_KEY`, `CLAUDE_BASE_URL`, `MODEL_NAME`). The Vercel AI SDK (`ai@^6.0.145`) provides `useChat` / `streamText` — the standard for React chat UIs with built-in streaming, message state, and reload suppression. Zustand manages the in-memory message thread (no persistence; cleared on modal close). `framer-motion@^12.38.0` handles the FAB→modal choreographed animation. Existing packages (`sonner`, `react-markdown`, `date-fns`, `clsx`) are reused directly.

LangChain/LangGraph, third-party chatbot widgets (Intercom, Drift), Supabase Edge Functions, and local LLM (`ollama`) are explicitly rejected — they add cost, complexity, or security risk with zero upside for this single-user, single-API chatbot pattern.

**Core technologies:**
- **`@anthropic-ai/sdk`**: Claude API client with native tool-use and multi-turn history management — already configured in codebase
- **`ai` (Vercel AI SDK)**: Server-side LLM abstraction + `useChat` streaming hooks — eliminates ~300 lines of custom SSE/streaming logic
- **Zustand**: In-memory message store, scoped to modal lifecycle, no persistence — intentionally ephemeral per spec
- **`framer-motion`**: FAB→modal choreographed animation via `AnimatePresence` + `layoutId` — CSS transitions insufficient for this pattern

### Expected Features

The feature set splits into table stakes (required for any launch), differentiators (meaningful for a Vietnamese gym app), and anti-features (commonly requested, deliberately excluded).

**Must have (table stakes):**
- Floating FAB + modal shell — persistent entry point from any page; must not obscure key UI
- Message thread + input — scrollable conversation; Enter key + send button
- API call execution — bot must actually execute actions (create/update/cancel contracts and sessions), not just talk
- Parameter prompting loop — the core mechanic; bot gathers missing fields over turns without hallucinating defaults
- Permission-aware routing — bot self-restricts based on role; 403s surfaced as friendly Vietnamese/English messages
- Vietnamese time-window inference — morning (00:00–11:59), afternoon (12:00–14:59), evening (15:00–17:59), night (18:00–23:59) + relative day mapping in UTC+7
- Structured result display — formatted summary cards after list/create/update/cancel; not raw API text
- Error translation — API errors mapped to user-friendly messages in Vietnamese/English

**Should have (competitive):**
- English time parsing — "tomorrow at 9am", "next Thursday" for bilingual staff
- Multi-turn follow-up context — "hủy lịch 2" referencing a numbered result from the prior turn
- Inline entity references — "cái thứ 2", "hợp đồng kia" resolved back to IDs via stable bot-assigned identifiers
- Loading indicators — spinner/"..." while API calls are in flight
- Contract/session status summaries — "Bạn có 3 hợp đồng đang active" on idle

**Defer (v2+):**
- Time slot availability check before booking — prevents double-booking; requires coordinating `getOccupiedTimeSlots` + `history/create`
- Fallback to web UI — "I can't do that, but here's a link" for out-of-scope actions
- Cross-language warning — detect mid-conversation language switches and nudge users
- Streaming responses — non-streaming is simpler for MVP; streaming adds ~60–80 lines of complexity for same API cost

### Architecture Approach

The chatbot is a client-side modal backed by a single Next.js API Route that orchestrates the full AI interaction. The client (`FloatingFAB` → `AIChatbotModal` → `MessageList` + `MessageInput`) is isolated from AI logic — it only calls `POST /api/ai-chatbot`. The API route handles: Clerk auth (`auth()` → `userId` → `getUserSetting()` → role), system prompt construction (role + tool definitions + time rules), Claude tool-use loop (`messages.create()` → execute tools → re-call with results → repeat until done), and response return. Server-side tool execution calls existing GoChul API routes with the user's Clerk token forwarded automatically (same-origin `fetch` with cookie forwarding). The client store is Zustand with no persistence middleware — cleared on modal close. Streaming is deferred; non-streaming is the MVP path.

**Major components:**
1. **`FloatingFAB` + `AIChatbotModal`** — persistent floating button and portal-based modal overlay; isolated state (`useState` + portal), closes on route change
2. **`/api/ai-chatbot/route.ts`** — server-side orchestrator: auth → prompt build → Claude tool-use loop → tool execution → response; server-only, never imported by client
3. **`toolDefinitions.ts` + `anthropicService.ts`** — server-only constants and Anthropic client wrapper; the single source of truth for the AI's available actions
4. **`useAIChatbotStore` (Zustand)** — in-memory message state; `messages[]`, `isLoading`, `addMessage`, `setLoading`, `clearMessages`; no persistence

### Critical Pitfalls

1. **Unscoped API calls** — The AI given an endpoint list may call `/api/contract/getAll` as CUSTOMER and return another user's data. Mitigation: enumerate per-role allowed actions in the system prompt; audit every AI-callable route for explicit `role` checks; use userId-scoped endpoints by default.

2. **Unbounded parameter gathering loops** — The AI loops to collect missing fields and may hallucinate values rather than ask, or loop forever re-phrasing the same question. Mitigation: strict schema per intent, max N follow-up attempts (3), server-side required-field validation before API call, explicit "cancel" escape path in system prompt.

3. **Vietnamese time misinference** — "sáng mai" interpreted against the server's UTC clock instead of the gym's UTC+7 window; "sáng"/"chiều" mapped to generic conventions instead of GoChul's specific business hours. Mitigation: encode time windows as strict rules in the system prompt; resolve timestamps server-side using `date-fns` after the AI extracts intent + relative reference; require confirmation before API write.

4. **Modal state bleeds into page** — Portal renders to `document.body` but chatbot provider wrapping the entire app keeps state mounted across navigations. Mitigation: keep chatbot state as close to the modal as possible (no global provider); close modal on route change via `usePathname` listener; implement focus trap + `Escape` key + `aria-modal`.

5. **Auth token forwarded to Anthropic** — Clerk session token appears in the Anthropic API call (logged by Anthropic or its proxy) or the GoChul API runs as `INSTANTDB_ADMIN_TOKEN` because the token wasn't forwarded. Mitigation: Anthropic receives only messages + system prompt; Clerk token forwarded only to GoChul API routes via `getToken({ template: 'gochul-fitness' })`; audit all `console.log` in the chatbot route.

## Implications for Roadmap

Based on research, the implementation is structured into five ordered phases that respect the dependency graph: the UI shell requires no AI logic (safe to parallelize), the API route requires Clerk auth + tool definitions (foundation), wiring them together is the critical path (Phase 3), the tool-use loop is the most complex piece (Phase 4), and polish completes the feature.

### Phase 1: Skeleton + Architecture & Security
**Rationale:** The foundation must be verified before any AI logic is introduced. The API route and tool definitions can be built and tested with curl/Postman before a single line of UI code exists.

**Delivers:** `/api/ai-chatbot/route.ts` with hardcoded system prompt (no tool-use loop), `toolDefinitions.ts` with all endpoint schemas, Clerk auth (`auth()` + `getUserSetting()`) returning a role-scoped prompt, zero client code.

**Addresses:** Pitfalls P1 (Unscoped API calls — audit routes first), P5 (Auth token hygiene — design before implementing), P7 (Session isolation — client-only state, no persistence).

**Avoids:** Waiting until Phase 4 to discover that Clerk cookie forwarding from a server-side fetch doesn't work the way assumed.

### Phase 2: Client Shell — FAB + Modal
**Rationale:** The UI shell is independent of AI logic and can be built and tested in isolation. A fake "thinking" state is sufficient to verify open/close, focus management, accessibility, and route-change behavior.

**Delivers:** `FloatingFAB` (bottom-right fixed button), `AIChatbotModal` (portal overlay with message list + input), `useAIChatbotStore` (Zustand), `MessageBubble`, `MessageInput`. Auto-scroll, loading state, focus trap, Escape-to-close, route-change close — all implemented and accessibility-audited.

**Addresses:** Pitfall P4 (Modal state bleed — design isolation upfront, not retrofitted).

**Avoids:** UI polish being blocked on AI integration. The shell can ship to QA independently.

### Phase 3: Wire API Route to Client
**Rationale:** Phase 3 is the riskiest integration point — Clerk session cookie forwarding from a fetch inside a Next.js API route must be verified. Test this before Phase 4 adds loop complexity.

**Delivers:** `fetch('/api/ai-chatbot')` from `MessageInput` on submit; non-streaming response rendered in `MessageList`; loading spinner while awaiting response; conversation context passed as `messages[]` array.

**Avoids:** Phase 4 loop complexity obscuring whether auth forwarding or message passing is broken.

### Phase 4: Multi-Turn + Tool-Use Loop
**Rationale:** The core value — the bot must actually execute operations, not just answer questions. This phase adds the most complexity (loop, Vietnamese time inference, structured results, error translation) and should follow a working non-streaming path.

**Delivers:** `TOOL_DEFINITIONS` injected into `anthropic.messages.create()`; `executeTool()` calling existing GoChul API routes; loop: re-call Claude with tool results until `stop_reason === 'end_turn'` or `MAX_TOOL_ITERATIONS === 10`; Vietnamese time-window rules in system prompt (strict format); structured result cards after actions; API error → user-friendly message mapping.

**Addresses:** Pitfalls P2 (Parameter loop), P3 (Vietnamese time), P6 (Hallucinated endpoints/params — strict schema + server-side validation).

**Avoids:** Running the tool-use loop before the critical path (Phase 3) is confirmed working.

### Phase 5: Polish
**Rationale:** Completes the feature for launch. Streaming, multi-turn follow-up, entity references, and availability checks are meaningful but not blocking.

**Delivers:** Streaming responses (ReadableStream + `useChat` `stream` prop — only if UX warrants); inline entity references ("cái thứ 2" → stable ID); time slot availability check before booking; English time parsing; rate limiting on `/api/ai-chatbot` route (e.g., `@upstash/ratelimit`).

**Addresses:** Remaining P2/P3 enhancements; time slot availability check (Pitfall P3 secondary).

### Phase Ordering Rationale

- **Phases 1 and 2 can run in parallel** (team permitting): Phase 1 is server-side API route work; Phase 2 is client-side UI shell. Neither depends on the other. Verify both independently before Phase 3.
- **Phase 3 is the gate before Phase 4** — the critical path involves Clerk cookie forwarding from a server-side fetch to GoChul API routes. This is the most assumption-laden part of the architecture and must be verified in isolation.
- **Phase 5 items are independent** — streaming, entity references, and availability checks can be split across teammates or shipped across multiple sprints.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 4 (Tool-Use Loop):** The Vietnamese time inference rules need to be codified in the system prompt before testing. This is the highest-complexity piece — consider a dedicated test harness with a comprehensive set of Vietnamese time expressions ("sáng nay", "sáng mai", "chiều thứ 6", "tối nay", "thứ 2 tuần này", "cuối tuần") before integration.
- **Phase 4 (Availability Check):** The `getOccupiedTimeSlots` → `history/create` coordination touches known race conditions (C5, C6 in CONCERNS.md). Research whether the booking flow should use optimistic locking or a transaction pattern before Phase 4 implementation.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Client Shell):** FAB + portal modal + Zustand store + focus trap is a well-documented pattern with no novel integration concerns.
- **Phase 3 (Wire to Client):** `fetch` + JSON + React state update is a solved problem in Next.js.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All four net-new packages verified on npm (2026-04-04); existing packages confirmed in GoChul `package.json`; peer deps aligned (Zod v4, React 19). No speculative tech. |
| Features | HIGH | Features derived from `docs/FEAT_AIBOT.txt`, `PROJECT.md`, and PROBLEM.md. Feature landscape covers table stakes, differentiators, and anti-features. Priority matrix is grounded in user value vs. implementation cost analysis. |
| Architecture | HIGH | Architecture follows standard Next.js App Router + Anthropic tool-use patterns documented in official Anthropic SDK docs. Component responsibilities are clear; server/client boundary enforced by Next.js module rules. Build order respects dependency graph. |
| Pitfalls | HIGH | Pitfalls synthesized from codebase CONCERNS.md (C1–C26), existing RBAC inconsistencies, known race conditions, and OWASP API security patterns. Each pitfall maps to a prevention phase and verification test. |

**Overall confidence:** HIGH

### Gaps to Address

- **Concurrency/race condition (C5, C6):** CONCERNS.md documents known race conditions in concurrent booking that the chatbot will exacerbate by increasing booking rate. Phase 4 planning must address whether `getOccupiedTimeSlots` + `history/create` needs a locking mechanism before the availability check ships.
- **`roleCheck.ts` unused (C7):** The codebase has a `roleCheck.ts` utility that is currently unused — role checks are inlined with varying patterns. Phase 1 must audit which routes have which patterns and decide whether to standardize on `roleCheck.ts` before the AI can call those routes.
- **Token forwarding from API route → GoChul API routes:** The architecture assumes server-side `fetch()` with cookie forwarding works for same-origin calls from a Next.js route handler. This needs a concrete verification in Phase 1 before Phase 3 wire begins — a single curl test can confirm or invalidate the assumption.

## Sources

### Primary (HIGH confidence)

- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) — v0.82.0, verified 2026-04-04
- [Vercel AI SDK (ai) npm](https://www.npmjs.com/package/ai) — v6.0.145, verified 2026-04-04; peer deps confirmed
- [Anthropic Messages API — Tool Use](https://docs.anthropic.com/en/api/messages) — official tool-use loop documentation
- [Anthropic SDK — TypeScript Reference](https://www.npmjs.com/package/@anthropic-ai/sdk) — SDK API reference
- [Clerk — Server-side `auth()`](https://clerk.com/docs/references/nextjs/auth) — `getToken()` for short-lived scoped tokens
- [Next.js App Router — Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) — App Router handler conventions

### Secondary (MEDIUM confidence)

- [GoChul Fitness `docs/FEAT_AIBOT.txt`](FEAT_AIBOT.txt) — feature spec from founder; Vietnamese time rules; API routing logic
- [GoChul Fitness `docs/PROGRAM.md`](PROGRAM.md) — API structure, RBAC, data model
- [GoChul Fitness `PROJECT.md`](../PROJECT.md) — confirmed scope: multi-turn, Vietnamese-aware, role-aware, floating modal
- [GoChul Fitness `PROBLEM.md`](../PROBLEM.md) — session/contract lifecycle; time window definitions
- [GoChul Fitness `CONCERNS.md`](../CONCERNS.md) — C1–C26; race conditions C5/C6; unused `roleCheck.ts` C7
- [Zustand — Getting Started](https://zustand.docs.pmdn.rs/getting-started/introduction) — store patterns
- [React Portals — `createPortal`](https://react.dev/reference/react-dom/createPortal) — modal isolation pattern
- [TanStack Query — Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/reference/useQueryClient) — realtime invalidation on mutation

### Tertiary (LOW confidence)

- [framer-motion npm](https://www.npmjs.com/package/framer-motion) — v12.38.0, verified 2026-04-04; React 19 compatibility inferred from broad adoption, not officially documented
- [OWASP API Security Top 10](https://owasp.org/API-Security/) — prompt injection, auth token handling; general patterns applied to this specific implementation, not verified against GoChul's actual threat model
- Industry patterns: Intercom, Drift, Zendesk, WhatsApp Business, LINE OA, Zalo OA — used for competitor feature analysis, not primary research

---

*Research completed: 2026-04-04*
*Ready for roadmap: yes*
