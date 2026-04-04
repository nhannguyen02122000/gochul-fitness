# Phase 3: Wire API Route to Client - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 03-wire-api-route-to-client
**Areas discussed:** API payload & multi-turn shape, Error display in chat thread, Greeting / empty state content, Bot response rendering, API response type field, Smoke test / verification approach

---

## API payload & multi-turn shape

| Option | Description | Selected |
|--------|-------------|----------|
| Full history round-trip | Client sends full messages[] history, API echoes back updated history | ✓ |
| Latest message only | Client sends only the latest message, session storage provides context | |

**User's choice:** Full history round-trip
**Notes:** Sets up Phase 4 architecture cleanly. Simpler client logic.

---

## API request body format

| Option | Description | Selected |
|--------|-------------|----------|
| message + messages[] array | `{ message: 'latest text', messages: [...] }`. Already matches Phase 1 stub schema. | ✓ |
| conversationId + newMessage | Server stores history in session/cache. Higher complexity, not needed for Phase 3. | |

**User's choice:** message + messages[] array

---

## Error display in chat thread

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error bubble in thread | Error shown as styled bot message bubble below user message. Keeps thread as single source of truth. Best for session continuity. | ✓ |
| sonner toast (ephemeral) | Errors shown as toasts above modal. Cleaner thread, but toasts can be missed. | |
| Both bubble + toast | Maximally visible. Doubles UI code. | |

**User's choice:** Inline error bubble in thread

---

## Error bubble style

| Option | Description | Selected |
|--------|-------------|----------|
| Bot-style with error color | Left-aligned, muted bg (like normal bot bubbles), red/orange text, error icon. Consistent with thread style. | ✓ |
| Full-width error alert | Sits below thread, above input. Breaks bubble rhythm but more scannable. | |

**User's choice:** Bot-style with error color

---

## Greeting / empty state content

| Option | Description | Selected |
|--------|-------------|----------|
| Generic for now, role-specific in Phase 4 | Keep generic greeting. Role-specific greetings (ADMIN, STAFF, CUSTOMER) land in Phase 4 when tool-use loop is live. | ✓ |
| Personalized with user name | Show user's first name in greeting. Slight complexity, adds warmth. | |

**User's choice:** Generic for now

---

## Bot response rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown | Apply react-markdown + remark-gfm to all bot replies (placeholder and real). Pipeline already set up in MessageBubble from Phase 2. | ✓ |
| Plain text | Display bot replies as plain text. Markdown rendering added in Phase 4. | |

**User's choice:** Markdown

---

## API response type field

| Option | Description | Selected |
|--------|-------------|----------|
| Add type field | `{ reply, type: 'text' | 'error', role }`. Client reads type to decide bubble style. More explicit. | ✓ |
| HTTP status only | `{ reply, role }`. Client determines success/error from HTTP status. Simpler API. | |

**User's choice:** Add type field

---

## Smoke test / verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright integration test | E2E test: opens chatbot, sends message, verifies bot reply bubble. Fits with project's Playwright setup. | |
| Manual verification only | Open chatbot → send message → see reply bubble → see spinner. Faster to build, harder to regression-test. | ✓ |

**User's choice:** Manual verification only

---

## Claude's Discretion

The following were left to Claude's judgment during planning/implementation:
- Exact Tailwind classes for error bubble (icon color, text color, background shade)
- Whether to replace the store's messages[] entirely or append to it
- Whether AIChatRequestBody should validate messages[] item shape (type narrowing)

## Deferred Ideas

- Structured bot response types (Phase 4): `contract_list`, `session_booking`, `confirmation` cards beyond `text | error`
- Role-specific greetings (Phase 4): ADMIN/STAFF/CUSTOMER personalized greetings
- Playwright integration test (Phase 4): Add automated E2E test once AI logic is real
- Streaming (Phase 5 / v2): Token-by-token bot responses
