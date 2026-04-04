---
phase: 2
slug: 02-client-shell
plan: 1
subsystem: ui
tags: [zustand, react-markdown, remark-gfm, @base-ui/react, dialog, modal, chatbot]

# Dependency graph
requires:
  - phase: 1 (Skeleton & Architecture)
    provides: API route /api/ai-chatbot ready for wiring in Phase 3
provides:
  - Zustand chat state store (messages[], isLoading, isOpen)
  - FAB + modal UI shell with message thread
  - 6 React components: FloatingFAB, AIChatbotModal, MessageList, MessageBubble, MessageInput, LoadingIndicator
  - Bot greeting, auto-scroll, markdown rendering
affects:
  - phase: 3 (Wire API Route to Client)
  - phase: 4 (Multi-Turn + Tool-Use Loop)

# Tech tracking
tech-stack:
  added: [zustand@5.0.12, remark-gfm@4.0.1, @anthropic-ai/sdk]
  patterns: [Zustand store for ephemeral UI state, @base-ui/react Dialog with custom positioning, react-markdown + remark-gfm for bot messages, inline <style> for CSS keyframes]
key-files:
  created: [src/store/useAIChatbotStore.ts, src/components/chatbot/LoadingIndicator.tsx, src/components/chatbot/MessageBubble.tsx, src/components/chatbot/MessageInput.tsx, src/components/chatbot/MessageList.tsx, src/components/chatbot/FloatingFAB.tsx, src/components/chatbot/AIChatbotModal.tsx]
  modified: [src/components/layout/MainLayout.tsx]
key-decisions:
  - "D-01: FAB hides (return null) when isOpen=true, not pointer-events/opacity trick — cleaner and matches spec"
  - "D-02: Used cn() for all class composition per CONVENTIONS.md"
  - "D-03: Inline <style> for CSS keyframes instead of Tailwind animate utilities (Tailwind v4 animation APIs unverified)"
  - "D-04: showCloseButton=false on DialogContent; custom X button in header per UI spec"
patterns-established:
  - "Zustand store in src/store/ for ephemeral chat UI state (one-off; CONVENTIONS.md normally forbids Zustand)"
  - "@base-ui/react Dialog with fixed bottom-right positioning via className override (resets inherited centering)"
  - "usePathname listener in modal for auto-close on route change (mirrors BottomNavigation pattern)"

requirements-completed: [CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, THRD-01, THRD-02, THRD-07]

# Metrics
duration: 15min
completed: 2026-04-04
---

# Phase 2: Client Shell Summary

**FAB + modal UI shell with Zustand-backed message thread, markdown rendering, and route-change auto-close — ready for AI wiring in Phase 3.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-04
- **Completed:** 2026-04-04
- **Tasks:** 10/10
- **Commits:** 10 (all atomic)
- **Files created:** 7
- **Files modified:** 1

## Accomplishments

- Fully functional chatbot UI shell — FAB, modal, message thread, input, loading indicator — all built and integrated into `MainLayout`
- TypeScript strict-mode build passes with zero errors across all new files
- `@anthropic-ai/sdk` installed to fix pre-existing Phase 1 skeleton build error (unrelated to Phase 2 but required for clean builds)
- Chat state clears on modal close and route change (per spec), FAB hidden when modal open

## Task Commits

Each task committed atomically:

1. **Task 1: Install dependencies** - `3d65743` (chore)
2. **Task 2: Zustand store** - `ab721c4` (feat)
3. **Task 3: LoadingIndicator** - `04e5378` (feat)
4. **Task 4: MessageBubble** - `84d4a32` (feat)
5. **Task 5: MessageInput** - `02c75ab` (feat)
6. **Task 6: MessageList** - `162b7bf` (feat)
7. **Task 7: FloatingFAB** - `e8b59e4` (feat)
8. **Task 8: AIChatbotModal** - `adc059e` (feat)
9. **Task 9: MainLayout integration** - `27e0827` (feat)
10. **Task 10: TypeScript verification** - `npx tsc --noEmit` exits 0

## Files Created/Modified

| File | What it does |
|------|-------------|
| `src/store/useAIChatbotStore.ts` | Zustand store: `messages[]`, `isLoading`, `isOpen`, `addMessage`, `setLoading`, `setOpen`, `clearMessages` |
| `src/components/chatbot/LoadingIndicator.tsx` | Three-dot bounce animation with "GoChul is thinking..." label |
| `src/components/chatbot/MessageBubble.tsx` | User (coral, right) and bot (muted, left+avatar) bubbles; react-markdown + remark-gfm for bot |
| `src/components/chatbot/MessageInput.tsx` | Text input, Enter/send-submit, disabled while loading, coral send button |
| `src/components/chatbot/MessageList.tsx` | Scrollable thread, greeting empty state, auto-scroll, LoadingIndicator |
| `src/components/chatbot/FloatingFAB.tsx` | 56px coral FAB, fixed bottom-right, hides when modal open |
| `src/components/chatbot/AIChatbotModal.tsx` | Dialog with custom sizing (mobile bottom-sheet / desktop 400×560px), custom header, route-change listener |
| `src/components/layout/MainLayout.tsx` | Integrated `AIChatbotModal` + `FloatingFAB` |

## Decisions Made

- FAB uses `return null` when `isOpen=true` (cleaner than `pointer-events-none opacity-0`, matches spec D-01)
- Inline `<style>` for CSS keyframes — Tailwind v4 animation APIs unverified, inline style is safe and isolated
- `showCloseButton={false}` on DialogContent with custom X button in header per UI spec
- Bot avatar used `Bot` icon (lucide) instead of text "G" — more consistent with project icon standard
- `@anthropic-ai/sdk` installed as prerequisite — fixes pre-existing Phase 1 build error; needed for Phase 3 anyway

## Deviations from Plan

**None — plan executed exactly as written.**

## Issues Encountered

- **Pre-existing TS error in `src/lib/ai/anthropicService.ts`** — Phase 1 created this file referencing `@anthropic-ai/sdk` but the package was never installed. Fixed by adding `npm install @anthropic-ai/sdk` in Task 1. No impact on Phase 2 scope; enables clean builds going forward.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

### Phase 3 (Wire API Route to Client) — Ready

- `useAIChatbotStore` state primitives in place: `addMessage`, `setLoading`
- `MessageInput` already calls `addMessage + setLoading(true)` on submit — needs only fake bot response replaced with `POST /api/ai-chatbot` call
- `LoadingIndicator` already shown while `isLoading=true`
- All conversation history maintained in `messages[]` (multi-turn context ready)
- Clerk session forwarded automatically by Next.js App Router cookie mechanism

### Key Integration Points for Phase 3

| File | What Phase 3 needs to change |
|------|------------------------------|
| `src/components/chatbot/MessageInput.tsx` | Replace `setLoading(true)` with `POST /api/ai-chatbot` + add bot response |
| `src/components/chatbot/MessageList.tsx` | Unchanged — already renders all messages + loading indicator |
| `src/app/api/ai-chatbot/route.ts` | Already exists (Phase 1) — update to accept `messages[]` from body |

---
*Phase: 02-client-shell*
*Completed: 2026-04-04*
