# Phase 4: Multi-Turn + Tool-Use Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 04-multi-turn-tool-use-loop
**Areas discussed:** Tool-use loop architecture, Structured result formatting, User confirmation flow, Verification approach

---

## Tool-Use Loop Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Loop in `anthropicService.ts` | Single responsibility, reusable, separates AI logic from HTTP handling | ✓ |
| Loop in `route.ts` | Fewer files, but route.ts becomes long and mixed in responsibility | |

**User's choice:** Loop in `anthropicService.ts`

---

## Loop Interface

| Option | Description | Selected |
|--------|-------------|----------|
| Takes messages + user context, returns string | Simple. Route calls one function, gets final reply. | |
| Returns structured result with metadata | Returns `{ text, toolsUsed, iterations }`. Route can return structured summary. More debuggable. | ✓ |

**User's choice:** Returns structured result with metadata

---

## Confirmation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| AI asks in-thread before executing write tools | AI asks 'Create contract for [X]? (yes/no)' as assistant message. User replies. Extra round-trips but simpler. | |
| UI-level confirm button inline in thread | AI proposes action, bubble with Confirm button. User clicks → AI receives message → executes → result. No extra AI round-trips for confirmation. | ✓ |

**User's choice:** UI-level confirm button inline in thread

---

## Confirm Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| AI receives confirm as new message | Confirm click sends `CONFIRMED: <action>` message to AI, triggering a new round-trip. AI controls the full flow. | ✓ |
| Direct execution on Confirm click | Client/route executes the write tool directly. No extra AI round-trip. More complex client logic. | |

**User's choice:** AI receives confirm as new message

---

## Confirm Button Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Two-step: propose then execute | AI proposes → bubble with Confirm → user clicks → AI executes write tool → result bubble. Clear separation. | |
| One-step: AI executes then show result | AI executes the write tool directly, then shows result. Faster, no undo. | ✓ |

**User's choice:** One-step (AI executes then shows result)

---

## Result Formatting Location

| Option | Description | Selected |
|--------|-------------|----------|
| Server side in `executeTool()` | Format in `anthropicService.ts`. AI sees formatted results in the loop. More control. | ✓ |
| Client side in route.ts | Format in route.ts after the loop. Keep anthropicService.ts focused on AI calls. AI sees raw JSON. | |

**User's choice:** Server side in `executeTool()`

---

## Result Format

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown tables in bot bubble | `react-markdown` + `remark-gfm` already wired. Bot bubble renders markdown. | ✓ |
| Custom UI components in bubble | Custom React components for contracts/sessions cards. More complex dynamic rendering. | |

**User's choice:** Markdown tables in bot bubble

---

## Confirm Bubble Detection

| Option | Description | Selected |
|--------|-------------|----------|
| `type: 'proposal'` field in response JSON | Route returns `{ type: 'proposal', action, params, text }`. Client detects type discriminator. Clean and explicit. | ✓ |
| AI text marker pattern | AI includes `[Confirm]` in markdown. Client detects pattern. No API change. More fragile. | |

**User's choice:** `type: 'proposal'` field

---

## Verification Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright integration tests | E2E: customer lists contracts, admin create with param loop, permission error, Vietnamese time, rate-limit, loop cap. Full regression suite. | ✓ |
| Manual verification only | Test manually. Faster to build. No regression suite. | |

**User's choice:** Playwright integration tests

---

## Claude's Discretion

The following were left to Claude's judgment during planning/implementation:
- Exact prompt wording for the confirmation proposal
- Exact markdown table format for contracts vs sessions
- Exact retry logic (how many retries, backoff strategy)
- How to format the `toolsUsed` debug metadata in the return object
- Whether `callClaudeWithTools()` uses streaming (Phase 4: non-streaming)
- Confirmation button styling (similar to send button? different?)

## Deferred Ideas

- Streaming (Phase 5): Token-by-token bot responses
- Inline entity references (Phase 5): "cái thứ 2" → list item from prior turn
- Rate limiting (Phase 5): `@upstash/ratelimit` on `/api/ai-chatbot`
- Cross-language nudge (Phase 5): Mid-conversation language switch detection
- Availability check (Phase 5): `getOccupiedTimeSlots` before booking
