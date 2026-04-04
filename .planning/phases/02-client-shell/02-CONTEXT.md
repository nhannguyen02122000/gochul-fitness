# Phase 2: Client Shell - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the FAB + modal UI, message thread, and Zustand store in complete isolation with no AI logic. A fake "thinking" state is sufficient for testing. This phase produces a visually complete chatbot shell that can accept messages, display them, and simulate bot responses — ready to wire up to the Phase 1 API route in Phase 3.

Requirements covered: CHAT-01–06, THRD-01, THRD-02, THRD-07

</domain>

<decisions>
## Implementation Decisions

### FAB + Modal Layout
- **D-01:** Floating panel on all screen sizes (~400px wide, ~500px tall), anchored bottom-right. FAB sits above the modal (FAB visible when modal closed, FAB hidden when modal open). No full-screen on mobile — floating panel works on all screen sizes.

### Message Bubble Design
- **D-02:** User messages: right-aligned, coral (`--color-cta` `#F26076`) background, white text. Bot messages: left-aligned, neutral gray background, dark text. Clean, familiar chat UI.

### Route-Change Behavior
- **D-03:** Modal closes automatically on route change (via `usePathname` listener). Messages cleared. Matches `OnboardingModal` pattern.

### Markdown Rendering
- **D-04:** Bot messages render markdown via `react-markdown` + `remark-gfm`. Supported: bold, italic, bullet lists, numbered lists, tables. No stripped formatting in Phase 2.

### State Management
- **D-05:** Zustand store (`useAIChatbotStore`) for chat state. No persistence middleware. Store holds: `messages[]`, `isLoading`, `isOpen`. Components: `FloatingFAB`, `AIChatbotModal`, `MessageList`, `MessageBubble`, `MessageInput`, `LoadingIndicator`.

### Loading / Thinking State
- **D-06:** Animated three-dot pulse + "GoChul is thinking..." text below dots. Disappears when bot responds.

### Claude's Discretion
- Exact FAB size (default 56px circle if not specified)
- Exact Tailwind classes for bubble padding, border-radius, gap between bubbles
- Loading dots animation CSS (can use Tailwind animation or inline style)
- Empty state for message list (before first message sent)
- Input placeholder text

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Chatbot feature
- `docs/FEAT_AIBOT.txt` — Feature spec: chatbot behavior, Vietnamese time rules, API routing logic
- `docs/PROGRAM.md` — GoChul API structure, RBAC matrix, contract/session lifecycle

### Phase 1 artifacts (build on these)
- `.planning/phases/01-skeleton-architecture/01-CONTEXT.md` — Auth decisions (D-01, D-02, D-03)
- `.planning/phases/01-skeleton-architecture/01-RESEARCH.md` — Clerk auth, SDK integration patterns
- `src/lib/ai/systemPrompt.ts` — System prompt builder (Phase 1 output)
- `src/app/api/ai-chatbot/route.ts` — API route (Phase 1 output)

### Existing codebase
- `src/components/ui/dialog.tsx` — Existing `@base-ui/react` dialog primitives (portal, focus trap, aria-modal built-in)
- `src/components/modals/OnboardingModal.tsx` — Pattern: `open: boolean + onClose: () => void` props, `onComplete` callback
- `src/components/layout/BottomNavigation.tsx` — Pattern: `usePathname` listener for route detection
- `.planning/codebase/CONVENTIONS.md` — Design tokens, state management, component conventions
- `.planning/codebase/ARCHITECTURE.md` — App structure, providers, layout
- `.planning/ROADMAP.md` §Phase 2 — Deliverables, success criteria
- `.planning/ROADMAP.md` §Phase 3 — Phase 3 wires this shell to the API route

### Dependencies
- `zustand` — NOT yet in package.json. Phase 2 must add it via `npm install zustand`.
- `react-markdown` — Already in package.json. `remark-gfm` may need install for table support.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/dialog.tsx` — `Dialog`, `DialogContent`, `DialogOverlay`, `DialogPortal`, `DialogHeader`, `DialogTitle` — wraps `@base-ui/react/dialog` with focus trap, aria-modal, backdrop blur
- `src/components/modals/OnboardingModal.tsx` — Pattern for modal with `open: boolean` + `onClose` + `onComplete` callback
- `src/components/modals/CreateSessionModal.tsx` — Pattern for modal with form inside `DialogContent`
- `src/components/layout/BottomNavigation.tsx` — `usePathname` hook usage for route detection

### Established Patterns
- Modal props: `open: boolean` + `onClose: () => void` (not `onOpenChange`)
- `'use client'` on all interactive components
- `cn()` for class composition
- CSS custom properties for colors (`--color-cta` for coral)
- Tailwind v4 with utility classes
- `sonner` for toast notifications
- `lucide-react` for icons

### Integration Points
- `FloatingFAB.tsx` → imported in `src/app/(main)/layout.tsx` (layout-level placement)
- `AIChatbotModal.tsx` → rendered inside `MainLayout` or `(main)/layout.tsx` alongside other modals
- `useAIChatbotStore.ts` → Zustand store, consumed by all 6 chatbot components
- `MessageInput.tsx` → Phase 3 wires `onSubmit` to `POST /api/ai-chatbot`
</code_context>

<specifics>
## Specific Ideas

- FAB should use the existing coral CTA color (`--color-cta`)
- Bot avatar: simple circle with "G" or a robot icon from lucide
- Input placeholder: "Ask about your contracts or training sessions..."
- Message bubbles should have subtle rounded corners and small gap between consecutive messages
- Bot "thinking..." text should use muted/secondary text color

</specifics>

<deferred>
## Deferred Ideas

- Streaming bot responses (Phase 4)
- Inline entity references like "cái thứ 2" (Phase 4)
- Vietnamese time parsing display (Phase 4)
- Chat history persistence (v2 — out of scope per PROJECT.md)

</deferred>

---

*Phase: 02-client-shell*
*Context gathered: 2026-04-04*
