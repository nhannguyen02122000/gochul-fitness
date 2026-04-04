# Phase 5: Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 05-polish
**Mode:** discuss
**Areas discussed:** Streaming implementation, Inline entity references, Availability check integration, Rate limiting + cross-language nudge

---

## Streaming Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel AI SDK | `useChat` handles streaming, partial bubbles, history. Drop-in for MessageInput.tsx fetch logic. Requires installing `@ai-sdk/anthropic` + `ai`. | ✓ |
| Custom ReadableStream | Route returns streaming Response. Client uses `getReader()` + `TextDecoder`. Zero new packages. | |
| Hybrid (both) | Keep existing fetch+await as default, add streaming behind `?stream=true` flag. | |

**User's choice:** Vercel AI SDK

### Streaming — State management integration

| Option | Description | Selected |
|--------|-------------|----------|
| Replace Zustand with useChat | `useChat` state is the source of truth. Remove Zustand dependency from chatbot. Modal open/close stays in Zustand or moves to React state. | ✓ |
| Hybrid: Zustand + useChat | Keep Zustand for isOpen, isLoading, clearMessages. Subscribe to `useChat` messages to sync into Zustand. | |

**User's choice:** Replace Zustand with useChat (Recommended)

### Streaming — Loop interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Stream final output only | `callClaudeWithTools()` runs to completion (no visible output). Final text streams token-by-token. Confirms/proposals stop and wait for user. Simpler to implement. | ✓ |
| Stream progressively | Progressive streaming via Anthropic SDK stream events. Partial tool calls + text blocks stream back. More complex. | |

**User's choice:** Stream final output only (Recommended)

**Notes:** User wants the simplest path to token-by-token streaming. Progressive streaming is deferred.

---

## Inline Entity References

| Option | Description | Selected |
|--------|-------------|----------|
| AI prompt-driven | System prompt instructs Claude to label list items `[1]`, `[2]` and to resolve references from prior turn. No new API routes or server-side state. | ✓ |
| Server-side context store | Store last-listed items in route.ts between turns. Resolver function maps references. | |
| Client-side ID injection | Client tags listed items with data attributes. References handled client-side before sending. | |

**User's choice:** AI prompt-driven (Recommended)

**Notes:** All reference resolution done via system prompt instructions. No new infrastructure needed.

---

## Availability Check Integration

### Integration point

| Option | Description | Selected |
|--------|-------------|----------|
| Add getOccupiedTimeSlots as a tool | `getOccupiedTimeSlots` is a tool like any other. Called by Claude as a preliminary step before `create_session`. Claude decides to call it when user wants to book. | ✓ |
| Auto-precheck in executeTool | When `create_session` is called, `executeTool()` automatically calls `getOccupiedTimeSlots` first. Returns conflict error instead of creating. | |
| Availability check as separate tool (always called) | Dedicated tool that runs before `create_session` but is always called. Claude decides whether to surface it. | |

**User's choice:** Add getOccupiedTimeSlots as a tool (Recommended)

### Conflict UX

| Option | Description | Selected |
|--------|-------------|----------|
| Bot proposes alternatives | AI surfaces conflict as a warning bubble: "That slot conflicts... Suggested alternatives: [slot A], [slot B]." User picks from alternatives. | ✓ |
| Confirmation-style with alternatives | Conflict shows a proposal bubble with a "Use [alternative slot]" button. | |
| Warning bubble, no alternatives | Conflict styled differently (amber). No automatic alternatives suggested. | |

**User's choice:** Bot proposes alternatives (Recommended)

**Notes:** Conflict warning bubble uses distinct amber/warning style. Alternatives are concrete time slots, not just "try another time."

---

## Rate Limiting + Cross-Language Nudge

### Rate limit scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per request | Each `/api/ai-chatbot` request = 1 unit. Tool calls inside the loop don't count separately. 20 requests/min per user. | ✓ |
| Per tool call | Every tool execution + AI call counts separately. 1 message with list+create+confirm = 3+ units. | |

**User's choice:** Per request (Recommended)

### Rate limit backend

| Option | Description | Selected |
|--------|-------------|----------|
| Upstash Redis + Ratelimit | `@upstash/ratelimit` + `@upstash/redis`. Requires Upstash account. Free tier covers 10k req/day. Add env vars. | ✓ |
| In-memory rate limit | Simple sliding window counter per user ID. Does NOT work across multiple instances. | |

**User's choice:** Upstash Redis + Ratelimit (Recommended)

### Cross-language nudge UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline bubble only | Bot sends warning bubble: "I noticed you switched language. I'll respond in [detected language]." No buttons. Auto-adapts. | ✓ |
| Bubble + language choice buttons | Bubble with two quick-reply buttons: "English", "Tiếng Việt". User picks. | |
| Silent language adaptation | Language detected per-message. No nudge bubble. Bot always responds in language of most recent message. | |

**User's choice:** Inline bubble only (Recommended)

**Notes:** Nudge is a one-time inline message, non-blocking. Conversation continues immediately after.

---

## Claude's Discretion

The following areas were deferred to Claude's discretion during planning/implementation:
- Exact `useChat` integration points — which components consume `useChat` hooks vs which still use local state
- Exact streaming UI behavior during the "thinking" phase (blank until loop finishes vs "Running tools..." intermediate state)
- Exact Upstash rate limit key strategy (per userId vs per IP)
- Exact message bubble styling for the language nudge (same as error bubble? neutral style?)
- Whether to add `getOccupiedTimeSlots` tool to Phase 5 `TOOL_DEFINITIONS` only, or update the existing tool file

## Deferred Ideas

None — all discussion areas stayed within Phase 5 scope.
