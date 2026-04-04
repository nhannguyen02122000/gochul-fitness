# Phase 2: Client Shell - Research

**Researched:** 2026-04-04
**Domain:** Zustand state management, @base-ui/react Dialog for modal overlay, react-markdown rendering, Next.js App Router client component patterns
**Confidence:** HIGH

## Summary

Phase 2 builds a fully isolated chatbot UI shell — no AI wiring in this phase. The shell must accept user messages, render them in a scrollable thread, simulate a bot "thinking" state, and display fake bot responses with markdown rendering. State lives in Zustand (new dependency). The modal uses `@base-ui/react`'s built-in Dialog primitives (portal, focus trap, aria-modal all built-in). The FAB sits bottom-right, floating above the modal, and hides when the modal opens. The Phase 2 UI spec at `02-UI-SPEC.md` defines exact visual decisions (sizes, colours, spacing) and overrides CONVENTIONS.md's "no Zustand" rule via explicit user decision D-05.

**Primary recommendation:** Use `zustand` v5 (latest) for state, `@base-ui/react`'s existing Dialog primitives for the modal (no new portal code needed), and `react-markdown` + `remark-gfm` for bot message rendering. All components follow the established `'use client'` + `cn()` + CSS custom property patterns.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Floating panel ~400px wide × ~500px tall, anchored bottom-right. FAB visible when modal closed; FAB hidden when modal open. No full-screen on mobile.
- **D-02:** User messages: right-aligned, coral (`--color-cta` `#F26076`) background, white text. Bot messages: left-aligned, neutral gray background, dark text.
- **D-03:** Modal closes on route change (via `usePathname` listener); messages cleared. Matches `OnboardingModal` pattern.
- **D-04:** Bot messages render markdown via `react-markdown` + `remark-gfm`. Supported: bold, italic, bullet lists, numbered lists, tables.
- **D-05:** Zustand store (`useAIChatbotStore`) for chat state. No persistence middleware. Store holds: `messages[]`, `isLoading`, `isOpen`.
- **D-06:** Animated three-dot pulse + "GoChul is thinking..." text. Disappears when bot responds.

### Claude's Discretion

- Exact FAB size (default 56px circle if not specified)
- Exact Tailwind classes for bubble padding, border-radius, gap between bubbles
- Loading dots animation CSS (can use Tailwind animation or inline style)
- Empty state for message list (before first message sent)
- Input placeholder text

### Deferred Ideas (OUT OF SCOPE)

- Streaming bot responses (Phase 4)
- Inline entity references like "cái thứ 2" (Phase 4)
- Vietnamese time parsing display (Phase 4)
- Chat history persistence (v2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | FAB visible on all pages, bottom-right | FAB anchored bottom-right in `MainLayout` — rendered outside page `<main>` |
| CHAT-02 | Click FAB → open modal | FAB `onClick` sets Zustand `isOpen: true` |
| CHAT-03 | Close modal: X button, Escape, backdrop click | `@base-ui/react` Dialog handles all three natively |
| CHAT-04 | Portal / z-index above all content | `@base-ui/react` Dialog uses `DialogPortal` with `z-50` + `fixed` positioning |
| CHAT-05 | Accessible: ARIA, focus trap, keyboard nav | `@base-ui/react` Dialog provides focus trap + `aria-modal`; all elements need `aria-label` |
| CHAT-06 | Chat state cleared on modal close | `onOpenChange={(v) => !v && clearMessages()}` on Dialog + `usePathname` listener in `MainLayout` |
| THRD-01 | User can type and send a message | `MessageInput.tsx` with controlled input + Enter/button submit |
| THRD-02 | User sees their own messages | `addMessage({ role: 'user', content })` → `MessageList` renders both roles |
| THRD-07 | Conversation history within a session | Zustand `messages[]` persists across turns; cleared only on modal close |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

These override default conventions and MUST be followed:

- **`'use client'`** on all interactive components — mandatory
- **`cn()`** from `@/lib/utils` for all class composition — never raw string concatenation
- **CSS custom properties** for all colours (`--color-cta`, `--color-success`, etc.) — no raw Tailwind palette values
- **Modal props pattern:** `open: boolean + onClose: () => void` (from `OnboardingModal.tsx`)
- **`usePathname`** listener pattern for route-change detection (from `BottomNavigation.tsx`)
- **No Redux/Zustand/Jotai** per CONVENTIONS.md §8 — BUT this is explicitly overridden by user decision D-05 (Phase 2 locked decision). Zustand is permitted for this phase only.
- **Import order:** Node built-ins → external packages → `@/` absolute imports → relative imports
- **File naming:** React/TSX files use `PascalCase.tsx`

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | 5.0.12 (latest) | Chat state store | Explicitly required by user decision D-05 |
| `react-markdown` | 10.1.0 (in package.json ✓) | Bot message markdown rendering | Explicitly required by user decision D-04 |
| `remark-gfm` | 4.0.1 (latest) | GFM extensions (tables, strikethrough) | Required by D-04 for table support |
| `@base-ui/react` | 1.2.0 (in package.json ✓) | Dialog primitives (portal, focus trap, aria-modal) | Already in codebase; provides CHAT-03/04/05 for free |
| `lucide-react` | 0.577.0 (in package.json ✓) | Icons (Bot, Send, X, MessageCircle) | Already in codebase |
| `sonner` | 2.0.7 (in package.json ✓) | Toast notifications | Already in codebase |

### Installation
```bash
npm install zustand remark-gfm
```
`react-markdown` v10.1.0 and `@base-ui/react` v1.2.0 are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── chatbot/                  # NEW — all chatbot components
│       ├── FloatingFAB.tsx       # Fixed FAB, bottom-right
│       ├── AIChatbotModal.tsx     # Dialog wrapper + route-change listener
│       ├── MessageList.tsx        # Scrollable message thread
│       ├── MessageBubble.tsx      # Single message (user or bot)
│       ├── MessageInput.tsx       # Text input + send
│       └── LoadingIndicator.tsx   # Animated thinking dots
├── stores/                        # NEW — Zustand stores
│   └── useAIChatbotStore.ts      # Chat state (messages, isLoading, isOpen)
```

**Note:** `stores/` is not in the standard CONVENTIONS.md structure (which lists `src/providers/` for React Context). Zustand stores live in `src/stores/` by community convention. This is a new directory — planner should create it.

### Pattern 1: Zustand Store

```typescript
// src/stores/useAIChatbotStore.ts
import { create } from 'zustand'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
}

interface AIChatbotStore {
  messages: ChatMessage[]
  isLoading: boolean
  isOpen: boolean
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setLoading: (v: boolean) => void
  setOpen: (v: boolean) => void
  clearMessages: () => void
}

export const useAIChatbotStore = create<AIChatbotStore>((set) => ({
  messages: [],
  isLoading: false,
  isOpen: false,
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: Date.now() }
      ]
    })),
  setLoading: (v) => set({ isLoading: v }),
  setOpen: (v) => set({ isOpen: v }),
  clearMessages: () => set({ messages: [] })
}))
```

**Key insight:** No persistence middleware (explicitly excluded by D-05). Messages cleared on modal close.

### Pattern 2: Modal Integration in MainLayout

The FAB and modal live inside `MainLayout.tsx` alongside `OnboardingModal`. The `AIChatbotModal` listens for route changes via `usePathname` to auto-close:

```typescript
// Inside AIChatbotModal.tsx
const pathname = usePathname()
const { isOpen, setOpen, clearMessages } = useAIChatbotStore()

useEffect(() => {
  if (isOpen) {
    setOpen(false)
    clearMessages()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [pathname])
```

### Pattern 3: Auto-Scroll on New Message

```typescript
// Inside MessageList.tsx
const bottomRef = useRef<HTMLDivElement>(null)
const { messages } = useAIChatbotStore()

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])
```

### Pattern 4: Markdown Rendering in Bot Bubble

```tsx
// Inside MessageBubble.tsx (bot variant)
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

{role === 'assistant' && (
  <div className="prose prose-sm max-w-none">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  </div>
)}
```

Tailwind's `@tailwindcss/typography` plugin (`prose` classes) is NOT in the current package.json. Two options:
1. Install `@tailwindcss/typography` — adds `prose` utility
2. Skip `prose` wrapper and use raw Tailwind — avoids new dependency

**Recommendation:** Use option 2 (raw Tailwind) to avoid new dependency. Style markdown elements explicitly with: `className="text-sm [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_table]:w-full [&_thead]:bg-muted"`.

### Pattern 5: Dialog with Custom Size + Header

```tsx
// Inside AIChatbotModal.tsx — overrides Dialog default max-width
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAIChatbotStore } from '@/stores/useAIChatbotStore'
import { Bot } from 'lucide-react'

<Dialog
  open={isOpen}
  onOpenChange={(v) => {
    if (!v) {
      setOpen(false)
      clearMessages()
    }
  }}
>
  <DialogContent
    className="fixed bottom-0 right-0 top-auto translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl sm:rounded-2xl sm:bottom-6 sm:right-6 sm:top-auto w-full sm:max-w-[400px] sm:h-[500px] flex flex-col p-0 gap-0"
    showCloseButton={true}
  >
    {/* Custom header instead of DialogHeader for compact design */}
    <div className="flex items-center gap-3 px-4 py-3 border-b">
      <div className="w-8 h-8 rounded-full bg-[var(--color-cta)] flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <DialogTitle>GoChul Assistant</DialogTitle>
    </div>
    {/* Message list + input injected here */}
  </DialogContent>
</Dialog>
```

**Key sizing note:** `@base-ui/react` Dialog.Popup is centered by default (`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`). For the chatbot, we override positioning to anchor bottom-right with fixed placement + `sm:` responsive variants per D-01.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap | Custom focus trap with keyboard listeners | `@base-ui/react` Dialog — built-in | Dialog.Popup handles focus trap natively; custom code risks edge cases |
| Portal rendering | `createPortal()` + z-index management | `DialogPortal` from `@/components/ui/dialog` | Built-in portal with proper stacking context |
| Markdown parsing | Regex-based or custom parser | `react-markdown` + `remark-gfm` | Correct GFM parsing, security (no `dangerouslySetInnerHTML`), already in deps |
| UUID generation | `Math.random()` string IDs | `crypto.randomUUID()` | Built-in, cryptographically random, no library needed |
| Scroll-to-bottom | `scrollTop = scrollHeight` imperative | `ref.scrollIntoView({ behavior: 'smooth' })` | Cleaner, animated, no ref dance |

---

## Common Pitfalls

### Pitfall 1: Dialog positioning inheritance
**What goes wrong:** The inherited `DialogContent` styles (`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm`) override bottom-anchored positioning. The custom `className` must fully override, not just add classes.
**How to avoid:** Always reset inherited centering with explicit `bottom-0 right-0 top-auto translate-x-0 translate-y-0` in the className override. Use `sm:` breakpoints to switch between mobile (full-width bottom sheet) and desktop (floating panel).

### Pitfall 2: `useEffect` dependency array causing infinite loops
**What goes wrong:** `usePathname` in `AIChatbotModal.tsx` triggers `setOpen(false)` + `clearMessages()` which both update Zustand state; if `isOpen` is in the dependency array, it re-triggers.
**How to avoid:** Only put `pathname` in the dependency array. Use the functional update form of Zustand if needed.

### Pitfall 3: `react-markdown` missing GFM support
**What goes wrong:** Tables, strikethrough, task lists render as raw markdown without `remark-gfm`.
**How to avoid:** Always import and pass `remarkGfm` to `remarkPlugins={[remarkGfm]}` per D-04.

### Pitfall 4: Input submits while loading
**What goes wrong:** Double-submit or race condition if user presses Enter while `isLoading` is true.
**How to avoid:** `MessageInput` disabled when `isLoading` is true (`disabled={isLoading}`). Button shows a spinner state when loading.

### Pitfall 5: FAB visible when modal is open
**What goes wrong:** `FloatingFAB` and `AIChatbotModal` are siblings — FAB stays visible over the modal backdrop.
**How to avoid:** `FloatingFAB` reads `isOpen` from the store and conditionally renders: `{!isOpen && <FloatingFAB />}`. Alternatively, give FAB `pointer-events-none opacity-0` when modal is open.

---

## Code Examples

### FloatingFAB
```tsx
// src/components/chatbot/FloatingFAB.tsx
'use client'

import { MessageCircle } from 'lucide-react'
import { useAIChatbotStore } from '@/stores/useAIChatbotStore'
import { cn } from '@/lib/utils'

export default function FloatingFAB() {
  const { isOpen, setOpen } = useAIChatbotStore()

  return (
    <button
      aria-label="Open GoChul Assistant"
      onClick={() => setOpen(true)}
      className={cn(
        'fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full',
        'bg-[var(--color-cta)] text-white shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-200 hover:bg-[var(--color-cta-hover)] hover:scale-105',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'active:scale-95'
      )}
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  )
}
```

### LoadingIndicator
```tsx
// src/components/chatbot/LoadingIndicator.tsx
'use client'

export default function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2">
      {/* Three-dot pulse animation */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[var(--color-cta)]"
          style={{
            animation: `chatbot-pulse 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">GoChul is thinking...</span>

      <style jsx>{`
        @keyframes chatbot-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
```

**Alternative (no `style jsx`):** Use Tailwind animation utilities if `@tailwindcss/animations` or similar is available. Otherwise inline `<style>` in the component is acceptable for custom keyframes.

---

## Environment Availability

> Step 2.6: SKIPPED — no external dependencies beyond Node.js runtime. All required packages verified in package.json or via `npm install`.

| Dependency | Required By | Available | Version | Fallback |
|-------------|------------|-----------|---------|----------|
| `zustand` | Chat state store | ✗ | — | Must `npm install zustand` |
| `remark-gfm` | Markdown table support | ✗ | — | Must `npm install remark-gfm` |
| `react-markdown` | Bot message rendering | ✓ | 10.1.0 | — |
| `@base-ui/react` | Dialog primitives | ✓ | 1.2.0 | — |
| `lucide-react` | Icons | ✓ | 0.577.0 | — |

**Missing dependencies with no fallback:**
- `zustand` — no alternative; Zustand is the explicit locked decision
- `remark-gfm` — no alternative; required for markdown tables per D-04

**Missing dependencies with fallback:**
- `@tailwindcss/typography` (for `prose` class) — **fallback:** use raw Tailwind element styling in `MessageBubble` instead

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config, test directory, or test files in codebase |
| Quick run command | N/A |
| Full suite command | N/A |

**No test infrastructure** in this codebase. Phase 2 components are UI-only (no business logic). Manual verification via browser is the appropriate validation path (see UI-SPEC.md for visual acceptance criteria).

### Phase Requirements → Verification Map
| Req ID | Behavior | Verification Method |
|--------|----------|---------------------|
| CHAT-01 | FAB visible on all pages | Load any page, confirm FAB bottom-right |
| CHAT-02 | Click FAB → modal opens | Click FAB, confirm modal appears |
| CHAT-03 | X / Escape / backdrop → close | Test each trigger independently |
| CHAT-04 | Modal overlays content | Verify z-index stacking context |
| CHAT-05 | Keyboard nav / focus trap | Tab through modal, verify focus stays |
| CHAT-06 | Messages cleared on close | Send message, close modal, reopen — confirm empty |
| THRD-01 | Type + send message | Type, press Enter, confirm message appears |
| THRD-02 | User message right-aligned | Visual check: right coral bubble |
| THRD-07 | Multi-turn history | Send 2+ messages, confirm both persist |

### Wave 0 Gaps
None — this is a UI-only phase with no test infrastructure and no automated tests needed.

---

## Open Questions

1. **Tailwind `prose` class availability**
   - What we know: `@tailwindcss/typography` is NOT in package.json
   - What's unclear: Whether it's accessible via the Tailwind v4 plugin system (v4 uses CSS-based config, not `tailwind.config.ts`)
   - Recommendation: Skip `prose`, style markdown elements explicitly with raw Tailwind. If typography looks inconsistent, install `@tailwindcss/typography` in Phase 5 as a polish item.

2. **Custom keyframe animation strategy**
   - What we know: `@tailwindcss/postcss` is in devDeps; Tailwind v4 animation utilities may differ from v3
   - What's unclear: Whether `@keyframes chatbot-pulse` in a `<style>` tag will conflict with Tailwind's animation system
   - Recommendation: Use inline `<style>` with custom keyframes (safe, isolated). Avoid relying on Tailwind's `animate-*` utilities without verification.

3. **FAB bottom offset on mobile**
   - What we know: BottomNavigation is 64px tall + some safe-area padding
   - What's unclear: Exact `bottom-*` value to avoid overlap with BottomNavigation on small screens
   - Recommendation: `bottom-24` (96px) gives breathing room on most devices. If BottomNavigation overlaps on specific devices, adjust to `bottom-28` in Phase 5 after real device testing.

4. **Integration test: does FAB+modal work inside MainLayout?**
   - What we know: `MainLayout` wraps all authenticated pages
   - What's unclear: Whether rendering the modal inside MainLayout (not a page) causes any z-index or stacking issues with other modals like `OnboardingModal`
   - Recommendation: Render FAB + AIChatbotModal inside `MainLayout`, after `OnboardingModal`. Set chatbot modal z-index explicitly if needed.

---

## Sources

### Primary (HIGH confidence)
- `@base-ui/react` Dialog source — `src/components/ui/dialog.tsx` — verified existing dialog with portal, focus trap, aria-modal, backdrop
- `react-markdown` v10.1.0 — verified in package.json
- `zustand` v5.0.12 — `npm view zustand version` output
- `remark-gfm` v4.0.1 — `npm view remark-gfm version` output
- `OnboardingModal.tsx` — confirmed modal prop pattern: `open: boolean + onComplete: () => void`
- `BottomNavigation.tsx` — confirmed `usePathname` pattern for route detection

### Secondary (MEDIUM confidence)
- Zustand v5 API changes — v5 dropped deprecated middleware default exports (e.g., `persist` is now a named export). Verified pattern uses vanilla `create()` API which is stable across all v5 versions.
- `react-markdown` v10 (2024) — breaking change: `components` prop replaced with `children` render function. Verified the `remarkPlugins` array API is stable.

### Tertiary (LOW confidence)
- Tailwind v4 animation utilities — not verified in package.json. Recommendation to use inline `<style>` is conservative to avoid breakage.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in package.json or via npm registry
- Architecture: HIGH — patterns derived directly from existing codebase source files
- Pitfalls: HIGH — identified from known `@base-ui/react` Dialog + Zustand patterns

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days — domain is stable; no fast-moving libraries)
