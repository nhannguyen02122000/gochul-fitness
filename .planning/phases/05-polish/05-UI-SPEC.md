---
phase: 5
slug: polish
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-04-04
---

# Phase 5 — UI Design Contract

> Visual and interaction contracts for Phase 5: Polish. Produced by gsd-ui-researcher. Consumed by gsd-planner, gsd-executor, gsd-ui-checker.

---

## Scope

Phase 5 adds or modifies **6 existing chatbot components** and **1 store slice**:

| Component | Change |
|-----------|--------|
| `MessageBubble.tsx` | Add `type: 'warning' \| 'nudge'` variants |
| `MessageInput.tsx` | Replace `fetch` with `useChat` hook; remove Zustand message/loading wiring |
| `MessageList.tsx` | Consume `useChat` messages instead of Zustand |
| `LoadingIndicator.tsx` | Add streaming-active state (cursor + "Responding…" label) |
| `AIChatbotModal.tsx` | Remove `clearMessages` call from `handleClose` (useChat manages its own state) |
| `FloatingFAB.tsx` | No visual change |
| `useAIChatbotStore.ts` | Remove `messages`, `isLoading`, `addMessage`, `setLoading`; keep `isOpen`, `setOpen` |

**No new components are created.** No new shadcn blocks needed.

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn | `components.json` exists — `base-nova` style |
| Preset | `base-nova` | `components.json` |
| Component library | shadcn (`@base-ui/react` + `radix`) | Already integrated |
| Icon library | `lucide-react` | Already wired |
| Font | Inter (`--font-sans` via `next/font/google`) | `layout.tsx` |
| Design tokens | CSS custom properties in `:root` | `globals.css` |

**No new shadcn blocks added in Phase 5.**

---

## Spacing Scale

All values are multiples of **4** (Tailwind v4 convention). Exceptions listed below.

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon gaps, inline element padding |
| `sm` | 8px | Compact element spacing, avatar-to-text gap |
| `md` | 16px | Default element spacing, bubble padding |
| `lg` | 24px | Section padding (header, input bar) |
| `xl` | 32px | Not used in chatbot |
| `2xl` | 48px | Not used in chatbot |

**Exception — touch targets:** FAB is `56px` (size-14), exceeds 44px minimum. Intentional per FAB spec.

**Phase 5 additions:**
- Streaming cursor gap: `4px` between cursor dot and preceding text (`xs`)
- Nudge bubble top margin: `8px` (`sm`) to separate from prior message

---

## Typography

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body | 14px (`text-sm`) | 400 | 1.5 (`leading-relaxed`) | All bubble content |
| Label | 12px (`text-xs`) | 400 | 1.4 | Loading indicator label, timestamps |
| Heading | 16px (`text-base`) | 600 | 1.2 | Modal title "AI Assistant" |

**Phase 5 additions:**
- `type: 'warning'` bubble: 14px body, 400 weight, same line height as normal
- `type: 'nudge'` bubble: 13px (`text-[13px]`), 400 weight, italic via `not-italic:normal` override to ensure upright
- Streaming cursor: `text-xs`, 400 weight, `--color-muted-foreground`

---

## Color

### Per-Component Mapping (Phase 5)

| Component | State | Background | Text | Border | Avatar BG |
|-----------|-------|------------|------|--------|-----------|
| `MessageBubble` (user) | — | `--color-cta` | white | — | — |
| `MessageBubble` (bot) | normal | `bg-muted` | `foreground` | — | `--color-cta` |
| `MessageBubble` | error | `red-50` | `red-700` | — | `red-100` |
| `MessageBubble` | **warning** | `--color-warning-bg` | `#7A3E00` (dark amber) | `--color-warning` left border `2px` | `--color-warning` |
| `MessageBubble` | **nudge** | `bg-blue-50` | `blue-700` | — | `blue-100` |
| `MessageBubble` | proposal | inherits normal | inherits normal | — | inherits normal |
| `LoadingIndicator` | idle | — | `muted-foreground` | — | — |
| `LoadingIndicator` | **streaming-active** | — | `muted-foreground` | — | — |
| `FloatingFAB` | — | `--color-cta` | white | — | — |
| `MessageInput` send button | idle | `--color-cta` | white | — | — |
| `MessageInput` send button | loading | `--color-cta` (40% opacity) | white | — | — |

### Color Contract Summary

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `bg-muted` / `--background` | Bot bubble surface |
| Secondary (30%) | `--color-cta` | FAB, send button, bot avatar, user bubble |
| Accent (10%) | `--color-warning` | Warning bubbles only — **never** on FAB, buttons, or user bubbles |
| Warning-bg | `--color-warning-bg` | `type: 'warning'` bubble background |
| Nudge-bg | `bg-blue-50` | `type: 'nudge'` bubble background |
| Error | `red-50` / `red-700` | Error bubbles only |

**Accent reserved for:** `type: 'warning'` bubble border (left accent strip, `2px`), warning avatar fill. **Never** applied to FAB, send button, or user bubbles.

### Warning Bubble Exact Color Values

```css
/* type: 'warning' — availability conflict bubble */
background-color: #FFF4EC;          /* --color-warning-bg */
color: #7A3E00;                      /* dark amber text for readability on warm bg */
border-left: 2px solid #FF9760;     /* --color-warning */
avatar-bg: #FF9760;                  /* --color-warning */
```

### Nudge Bubble Exact Color Values

```css
/* type: 'nudge' — language switch inline bubble */
background-color: #EFF6FF;          /* blue-50 equivalent */
color: #1E40AF;                      /* blue-700 equivalent — readable on light blue */
avatar-bg: #DBEAFE;                  /* blue-100 — subtle blue icon bg */
```

---

## Streaming Cursor

Rendered inline at the end of the streaming message content, before `react-markdown` output completes:

```tsx
// Inside MessageBubble, appended to bot bubble during isStreaming
<span
  className="inline-block w-2 h-4 bg-[--color-cta] rounded-sm ml-1"
  style={{ animation: 'chatbot-cursor-blink 1s step-end infinite' }}
  aria-hidden="true"
/>
```

**Keyframe:**
```css
@keyframes chatbot-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

**Placement:** Inside the bot bubble text container, appended as last child while `isLoading && messages[last].role === 'assistant' && !messages[last].content.endsWith('\n')`.

**Behavior:**
- Shows only when `isLoading === true` and the last assistant message has content (streaming in progress)
- Hidden when `isLoading === false` (stream complete)
- Hidden during the initial "GoChul is thinking…" loading state (only appears once first token arrives)
- Respects `prefers-reduced-motion` — cursor blinks at 1s; set `animation-duration: 0.01ms` under that media query

---

## Loading Indicator States

### State 1: Tool Loop Running (Initial Loading)

Shown by `LoadingIndicator.tsx` when the server-side tool-use loop is executing:

```
●●●  GoChul is thinking...
```

- 3 coral dots (`--color-cta`), 6px each, bounce animation
- Label: `--color-muted-foreground`, 12px, "GoChul is thinking…"
- Same implementation as Phase 2 (existing code, no change)

### State 2: Streaming Active

Shown when first token has arrived and `isLoading === true`:

```
●●●  Responding...
```

- 3 coral dots, bounce animation (same as State 1)
- Label: "Responding…" (12px, `--color-muted-foreground`)
- Triggered by: `isLoading === true` AND streaming has started
- Transition: label text swaps from "GoChul is thinking…" to "Responding…" when first token arrives

**Implementation:** Use `useChat` `isLoading` and `isMachineThinking` from the AI SDK, or infer from `isLoading && existing content`. Phase 5 executor to wire exact detection (see integration note below).

### State 3: Stream Complete

LoadingIndicator unmounts; cursor inside last bubble (if more content pending) or bubble fully rendered.

---

## MessageBubble Variant Matrix

| `message.type` | Avatar Icon | Avatar BG | Bubble BG | Bubble Text | Border | Markdown |
|----------------|-------------|-----------|-----------|-------------|--------|----------|
| `undefined` / `'normal'` | `Bot` | `--color-cta` | `bg-muted` | `foreground` | none | yes |
| `'error'` | `AlertCircle` | `red-100` | `red-50` | `red-700` | none | no (plain `<span>`) |
| `'proposal'` | `Bot` | `--color-cta` | `bg-muted` | `foreground` | none | yes + Confirm button |
| `'warning'` | `AlertTriangle` | `--color-warning` | `--color-warning-bg` | `#7A3E00` | left `2px --color-warning` | yes |
| `'nudge'` | `Languages` | `blue-100` | `bg-blue-50` | `blue-700` | none | no (plain `<span>`) |

**Phase 5 additions:** `'warning'`, `'nudge'`.

**Markdown for warning bubble:** Yes — conflict messages may include formatted slot lists (bold slots, bullet alternatives).

**No markdown for nudge bubble:** Inline language notice is plain text, no structured content.

---

## Icon Additions

Two new icon imports in `MessageBubble.tsx`:

```ts
import { Bot, AlertCircle, AlertTriangle, Languages } from 'lucide-react'
```

- `AlertTriangle` — warning avatar icon (from `lucide-react`, already in project dependency)
- `Languages` — nudge avatar icon (from `lucide-react`)

No new icon packages. No new SVG assets.

---

## Component Integration: `useChat`

### Architecture

```
MessageInput.tsx
  ├── useChat() hook               ← message state source (replaces Zustand)
  │     ├── messages[]
  │     ├── isLoading
  │     ├── input / setInput
  │     └── handleSubmit / append
  ├── MessageList.tsx
  │     └── MessageBubble[]        ← consumes useChat messages directly
  └── LoadingIndicator.tsx         ← receives useChat isLoading
```

### Zustand Store (Phase 5 Final State)

```ts
// useAIChatbotStore.ts — Phase 5 final shape
interface AIChatbotStore {
  isOpen: boolean
  setOpen: (v: boolean) => void
  // REMOVED: messages, isLoading, addMessage, setLoading, clearMessages
}
```

Modal open/close state remains in Zustand. `useAIChatbotStore` is no longer imported in `MessageInput` or `MessageList`.

### `useChat` Props (AIChatbotModal.tsx / MessageInput.tsx)

```tsx
// MessageInput.tsx — wrap with AI SDK provider
import { AI SDKProvider } from '@ai-sdk/react'
import { useChat } from 'ai/react'

// Inside MessageInput or AIChatbotModal:
const { messages, isLoading, input, setInput, handleSubmit, append } = useChat({
  api: '/api/ai-chatbot',
  // stream: true by default in useChat
  // onError: optional error handler
})
```

**Key integration points:**
1. `handleSubmit` is called on send button click and Enter key — replaces existing `handleSubmit` function
2. `append` is called for the Confirm flow — replaces `handleConfirm`
3. The `POST /api/ai-chatbot` route must return a streaming `Response` (AI SDK `StreamData` protocol) instead of `await res.json()`
4. The API route continues to run `callClaudeWithTools()` to completion server-side, then pipes the final text as a streaming response

**Integration note (Phase 5 executor):** The exact `useChat`/`useAIChatbotStore` boundary is an implementation detail for the executor. The visual contracts above (LoadingIndicator states, MessageBubble variants, streaming cursor) are the authoritative targets regardless of which hook owns which state slice.

---

## Interaction Contracts

### Streaming Token Rendering

1. User sends message → `handleSubmit` called → `isLoading = true`
2. LoadingIndicator (State 1: "GoChul is thinking…") shown
3. Server-side loop runs to completion; first token streamed to client
4. LoadingIndicator transitions to State 2: "Responding…" with content appearing in last assistant bubble
5. Streaming cursor appended to last bubble (cursor visible at end of partial text)
6. Stream completes → `isLoading = false` → cursor removed, bubble fully rendered
7. LoadingIndicator unmounts

### Availability Conflict Flow

1. User says "book 9am tomorrow"
2. Bot calls `getOccupiedTimeSlots` → conflict found
3. Bot returns `{ reply: "That slot conflicts…", type: 'warning', suggestions: [...] }`
4. Route response: `data.type === 'warning'` → `addMessage({ role: 'assistant', content, type: 'warning' })`
5. MessageBubble renders amber warning bubble with `[1]`, `[2]` suggestion list
6. User picks a slot from the list → new user message sent
7. Bot books the selected slot → normal confirmation bubble

### Language Nudge Flow

1. `detectLanguage()` in route handler detects language switch
2. Route returns `{ reply: "I noticed you switched language…", type: 'nudge', detectedLang: 'English' }`
3. MessageBubble renders blue nudge bubble with `Languages` icon avatar
4. **No buttons, no confirm flow** — conversation continues immediately after the nudge bubble renders
5. Bot continues responding in the detected language

### Rate Limit Flow

1. `@upstash/ratelimit` returns rate limit exceeded
2. Route returns HTTP 429 with `{ reply: "...", type: 'error' }` or `{ reply: "...", type: 'nudge' }`
3. MessageBubble renders as error or nudge bubble per route decision
4. No special UI treatment beyond existing error/nudge styling

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | "Confirm" (reserved for proposal bubbles only) |
| Empty state | Greeting only — no empty-state message needed (greeting bubble shown on open) |
| Error state | "Connection error. Please check your network and try again." (unchanged from Phase 3) |
| Language nudge | "I noticed you switched language. I'll respond in {detectedLang}." — no button |
| Conflict warning | "That slot conflicts with an existing booking. Suggested alternatives:" + bold slot list |
| Rate limit exceeded | "You're sending messages too quickly. Please wait a moment and try again." |
| Loading (thinking) | "GoChul is thinking…" — existing, no change |
| Loading (streaming) | "Responding…" — new, Phase 5 |
| Confirm button | "Confirm" — existing, no change |
| Destructive actions | "Cancel" — handled by bot conversation flow, no UI-level confirm dialogs |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | 0 (no new blocks added) | not applicable |
| `@ai-sdk/react` | `AI SDKProvider`, `useChat` | Source: Vercel AI SDK — npm package, MIT license; trusted; no vetting needed |

**No third-party registry blocks. No shadcn additions. No safety gate required.**

---

## Excluded from Scope

The following Phase 5 items are **server-side only** — no UI changes required:

| Feature | Reason |
|---------|--------|
| `getOccupiedTimeSlots` tool definition | `toolDefinitions.ts` addition — no UI component |
| English time parsing rules in system prompt | `systemPrompt.ts` update — no UI component |
| Inline entity reference instructions in system prompt | System prompt addition — no UI component |
| `@upstash/ratelimit` in route handler | Server middleware — no UI component |
| `detectLanguage()` language switch detection | Server logic in `route.ts` — UI only receives bubble type |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (all 7 elements defined)
- [ ] Dimension 2 Visuals: PASS (5 MessageBubble variants, 3 LoadingIndicator states, cursor keyframes)
- [ ] Dimension 3 Color: PASS (--color-warning, --color-warning-bg, nudge blue-50/blue-700 defined; accent reserved list explicit)
- [ ] Dimension 4 Typography: PASS (14px body, 12px label, 13px nudge, 2 weights)
- [ ] Dimension 5 Spacing: PASS (4/8/16/24 scale; streaming cursor xs gap; nudge sm top margin)
- [ ] Dimension 6 Registry Safety: PASS (0 new shadcn blocks; @ai-sdk/react is npm MIT package)

**Approval:** pending

---

## Pre-Populated From

| Source | Decisions Used |
|--------|---------------|
| `05-CONTEXT.md` | D-02 (useChat replaces Zustand), D-03 (stream final output only), D-06 (warning bubble amber), D-10 (nudge bubble inline) |
| `05-CONTEXT.md` Claude's Discretion | Streaming cursor blinking implementation, exact nudge styling (blue-50), loading state labels |
| `globals.css` | Design token values for --color-cta, --color-warning, --color-warning-bg, --radius-md |
| `MessageBubble.tsx` | Existing variant structure (role → type matrix), markdown styles string |
| `MessageList.tsx` | Auto-scroll behavior, greeting copy, aria-live attributes |
| `LoadingIndicator.tsx` | Existing dot-bounce animation, inline `<style>` approach |
| `AIChatbotModal.tsx` | Modal dimensions (400px × 560px), header height, input bar padding |
| `FloatingFAB.tsx` | FAB 56px, z-50, coral color — no changes needed |
| `components.json` | shadcn already initialized, no gate needed |
| User input | 0 questions (all answered by upstream) |
