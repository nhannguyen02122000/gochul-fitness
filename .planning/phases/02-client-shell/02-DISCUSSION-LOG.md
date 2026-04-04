# Phase 2: Client Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 02-client-shell
**Mode:** discuss

---

## Areas Discussed

### FAB + Modal Layout

| Option | Description | Selected |
|--------|-------------|---------|
| Full-screen on mobile, fixed panel on desktop | WhatsApp/ChatGPT style. Mobile gets most of screen. Desktop: 480px wide centered. | |
| **Floating panel on all screen sizes** | Always ~400px wide, ~500px tall, anchored bottom-right. FAB sits above. | ✓ |
| You decide | | |

**User's choice:** Floating panel on all screen sizes — FAB + modal both floating, consistent across mobile/desktop.

---

### Message Bubble Design

| Option | Description | Selected |
|--------|-------------|---------|
| **User right (coral), Bot left (gray)** | User: coral bg, white text. Bot: gray bg, dark text. | ✓ |
| User right (coral), Bot left (dark/brand) | Bot has branded dark bubble with bot avatar icon. | |
| You decide | | |

**User's choice:** User right (coral), Bot left (gray). Clean and familiar.

---

### Route-Change Behavior

| Option | Description | Selected |
|--------|-------------|---------|
| **Yes, close on route change** | Modal closes + messages cleared on route change. Matches OnboardingModal pattern. | ✓ |
| No, keep modal open across pages | | |
| You decide | | |

**User's choice:** Yes, close on route change.

---

### Markdown Rendering

| Option | Description | Selected |
|--------|-------------|---------|
| **Bold + lists + tables (standard)** | react-markdown + remark-gfm. | ✓ |
| Minimal — text only, no formatting | | |
| You decide | | |

**User's choice:** Standard markdown rendering.

---

### State Management

| Option | Description | Selected |
|--------|-------------|---------|
| **Zustand** | Clean, isolated store. Phase 2 installs it. | ✓ |
| React Context | | |
| You decide | | |

**User's choice:** Zustand.

---

### Loading / Thinking State

| Option | Description | Selected |
|--------|-------------|---------|
| **Animated dots + "typing..." text** | Three pulsing dots + "GoChul is thinking..." text below. | ✓ |
| Just a spinner | | |
| You decide | | |

**User's choice:** Animated dots + thinking text.

---

## Claude's Discretion

- Exact FAB size (default 56px circle)
- Exact Tailwind classes for bubble styling
- Loading animation implementation details
- Empty state design
- Input placeholder text

## Deferred Ideas

None — discussion stayed within Phase 2 scope.
