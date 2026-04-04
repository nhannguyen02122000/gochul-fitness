---
gsd_phase_version: 1.0
phase: 2
slug: 02-client-shell
status: draft
wave: 1
depends_on: []
requirements:
  - CHAT-01
  - CHAT-02
  - CHAT-03
  - CHAT-04
  - CHAT-05
  - CHAT-06
  - THRD-01
  - THRD-02
  - THRD-07
files_modified:
  - src/store/useAIChatbotStore.ts
  - src/components/chatbot/LoadingIndicator.tsx
  - src/components/chatbot/MessageBubble.tsx
  - src/components/chatbot/MessageInput.tsx
  - src/components/chatbot/MessageList.tsx
  - src/components/chatbot/FloatingFAB.tsx
  - src/components/chatbot/AIChatbotModal.tsx
  - src/components/layout/MainLayout.tsx
autonomous: true
---

# Phase 2 — Client Shell

**Goal:** Build the FAB + modal UI, message thread, and Zustand store in complete isolation. No AI wiring — a fake "thinking" state (2-second delay) is sufficient for Phase 2 shell testing.

---

## must_haves (goal-backward verification)

1. FAB is visible on every authenticated page, bottom-right, and opens the modal on click
2. Modal closes via X button, Escape key, and backdrop click — all three paths work
3. User messages appear immediately as right-aligned coral bubbles
4. Bot greeting "Hi! I'm your GoChul assistant..." appears in the empty state
5. Sending a message while `isLoading=true` is blocked (input disabled)
6. Closing the modal clears `messages[]` (re-open shows empty state or greeting)
7. TypeScript strict-mode build completes without errors

---

## Tasks

### Wave 1 — Shared foundation

#### Task 1 — Install dependencies

**<read_first>**
- `package.json` — verify current state
</read_first>

**<acceptance_criteria>**
- `package.json` contains `"zustand"` entry
- `package.json` contains `"remark-gfm"` entry
- `npm install` completes without error
</acceptance_criteria>

**<action>**
Run: `npm install zustand remark-gfm`
</action>

---

#### Task 2 — Zustand store

**<read_first>**
- `src/lib/utils.ts` — to confirm `cn()` export shape
</read_first>

**<acceptance_criteria>**
- `src/store/useAIChatbotStore.ts` exports `useAIChatbotStore`
- `src/store/useAIChatbotStore.ts` exports `ChatMessage` interface with fields: `id`, `role: 'user' | 'assistant'`, `content`, `timestamp`
- Store has: `messages[]`, `isLoading`, `isOpen` state
- Store has: `addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): void`
- Store has: `setLoading(v: boolean): void`
- Store has: `setOpen(v: boolean): void`
- Store has: `clearMessages(): void`
- No persistence middleware imported or used
</acceptance_criteria>

**<action>**

Create `src/store/useAIChatbotStore.ts`:

```typescript
'use client'

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

</action>

---

#### Task 3 — LoadingIndicator component

**<read_first>**
- `src/components/ui/button.tsx` — no need to read, but button variants are available via `buttonVariants`
</read_first>

**<acceptance_criteria>**
- File: `src/components/chatbot/LoadingIndicator.tsx`
- Component renders three dots with a bounce keyframe animation
- Label text is exactly: "GoChul is thinking..."
- CSS animation is defined via inline `<style>` tag inside the component (not via Tailwind utilities)
- Animation delay offsets: `0s`, `0.2s`, `0.4s` for dots 0, 1, 2
- Animation loop: `1.2s ease-in-out infinite`
- Keyframe steps: `0%, 80%, 100% → scale(0.6) opacity(0.4)`; `40% → scale(1) opacity(1)`
- Dot size: 6px circles (`w-1.5 h-1.5`)
- Dot color: `bg-[var(--color-cta)]`
- Label: `text-xs text-muted-foreground`
</acceptance_criteria>

**<action>**

Create `src/components/chatbot/LoadingIndicator.tsx`:

```tsx
'use client'

export default function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2" aria-live="polite" aria-label="AI is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-cta)]"
          style={{
            animation: `chatbot-dot-bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">GoChul is thinking...</span>
      <style>{`
        @keyframes chatbot-dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
```

</action>

---

#### Task 4 — MessageBubble component

**<read_first>**
- `src/components/ui/dialog.tsx` — to confirm `cn()` usage and existing patterns
</read_first>

**<acceptance_criteria>**
- File: `src/components/chatbot/MessageBubble.tsx`
- `role === 'user'`: right-aligned (`ml-auto`), coral background (`bg-[var(--color-cta)]`), white text (`text-white`), border-radius `rounded-2xl rounded-br-md`
- `role === 'assistant'`: left-aligned (default), muted background (`bg-muted`), dark text (`text-foreground`), border-radius `rounded-2xl rounded-bl-md`
- Both: `max-w-[75%]`, padding `px-3 py-2`, `text-sm`, `text-base leading-relaxed`
- Both: `aria-label` present ("User message" / "AI Assistant response")
- Bot bubble includes 32px coral circle avatar with `Bot` icon (white, 16px) to the left — avatar visible only for `role === 'assistant'`
- Bot bubble uses `ReactMarkdown` with `remarkPlugins={[remarkGfm]}` from `react-markdown` and `remark-gfm`
- Markdown container: `prose-xs` equivalent via explicit Tailwind: `text-sm [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_thead]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1`
- User bubble: plain text (no markdown)
</acceptance_criteria>

**<action>**

Create `src/components/chatbot/MessageBubble.tsx`:

```tsx
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/store/useAIChatbotStore'

interface MessageBubbleProps {
  message: ChatMessage
}

const markdownStyles = 'text-sm [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_thead]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1'

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content } = message

  if (role === 'user') {
    return (
      <div
        aria-label="User message"
        role="note"
        className={cn(
          'max-w-[75%] ml-auto flex flex-col items-end gap-1',
          'px-3 py-2 rounded-2xl rounded-br-md',
          'bg-[var(--color-cta)] text-white text-sm text-base leading-relaxed',
          'animate-in slide-in-from-bottom-1 duration-200'
        )}
      >
        <span>{content}</span>
      </div>
    )
  }

  return (
    <div
      aria-label="AI Assistant response"
      role="note"
      className="flex items-start gap-2 animate-in slide-in-from-bottom-1 duration-200"
    >
      {/* Bot avatar */}
      <div
        className="size-8 rounded-full bg-[var(--color-cta)] flex items-center justify-center shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <Bot className="h-4 w-4 text-white" />
      </div>

      <div
        className={cn(
          'max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md',
          'bg-muted text-foreground text-sm text-base leading-relaxed',
          markdownStyles
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
```

</action>

---

#### Task 5 — MessageInput component

**<read_first>**
- `src/components/ui/input.tsx` — to confirm `Input` component API (props spread)
</read_first>

**<acceptance_criteria>**
- File: `src/components/chatbot/MessageInput.tsx`
- Placeholder: `"Ask about your contracts or training sessions..."`
- Submit triggers: (a) Enter key, (b) send button click
- On submit: calls `addMessage({ role: 'user', content: <input value> })` then sets `input = ''`
- On submit: calls `setLoading(true)` immediately after `addMessage`
- When `isLoading === true`: input is disabled (`disabled` prop), opacity reduced (`opacity-50`), cursor shows `cursor-not-allowed`
- Send button: coral background `bg-[var(--color-cta)]` hover `hover:bg-[var(--color-cta-hover)]`, white icon, `size-8` (32×32px), `rounded-full`
- Icon: `Send` from `lucide-react`, `h-4 w-4`
- Input: `h-9` height, `rounded-full`, border, `bg-muted/50` background, `text-sm`
- `aria-label` on send button: "Send message"
- `aria-label` on input: "Chat message"
- Empty input submission is prevented (guard: `if (!input.trim()) return`)
- Component uses `useAIChatbotStore` to read `isLoading`, call `addMessage` and `setLoading`
</acceptance_criteria>

**<action>**

Create `src/components/chatbot/MessageInput.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'

export default function MessageInput() {
  const [input, setInput] = useState('')
  const { isLoading, addMessage, setLoading } = useAIChatbotStore()

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    addMessage({ role: 'user', content: trimmed })
    setLoading(true)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t bg-background">
      <Input
        aria-label="Chat message"
        placeholder="Ask about your contracts or training sessions..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className={cn(
          'h-9 rounded-full bg-muted/50 border-input flex-1 text-sm',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      />
      <button
        type="button"
        aria-label="Send message"
        onClick={handleSubmit}
        disabled={isLoading}
        className={cn(
          'size-8 rounded-full flex items-center justify-center shrink-0',
          'bg-[var(--color-cta)] text-white',
          'transition-colors hover:bg-[var(--color-cta-hover)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-cta)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}
```

</action>

---

#### Task 6 — MessageList component

**<read_first>**
- `src/components/chatbot/MessageBubble.tsx` (from Task 4)
- `src/components/chatbot/LoadingIndicator.tsx` (from Task 3)
- `src/store/useAIChatbotStore.ts` (from Task 2)
</read_first>

**<acceptance_criteria>**
- File: `src/components/chatbot/MessageList.tsx`
- Uses `useAIChatbotStore` to read `messages` and `isLoading`
- When `messages.length === 0`: renders greeting bot bubble with content `"Hi! I'm your GoChul assistant. Ask me about your contracts or training sessions."` (no greeting stored in Zustand — rendered as static initial state)
- When `messages.length > 0`: renders each `message` via `MessageBubble`
- `LoadingIndicator` rendered after the last message when `isLoading === true`
- Auto-scroll: `useRef<HTMLDivElement>` on a `div` placed after all messages; `useEffect` calls `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` whenever `messages.length` or `isLoading` changes
- Container: `flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2`
- Greeting bubble: `role === 'assistant'` style (left-aligned, muted background, bot avatar)
- `aria-live="polite"` on the message list container for screen readers
</acceptance_criteria>

**<action>**

Create `src/components/chatbot/MessageList.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import MessageBubble from './MessageBubble'
import LoadingIndicator from './LoadingIndicator'

const GREETING = "Hi! I'm your GoChul assistant. Ask me about your contracts or training sessions."

export default function MessageList() {
  const { messages, isLoading } = useAIChatbotStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const hasMessages = messages.length > 0

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {!hasMessages && (
        <MessageBubble
          message={{
            id: 'greeting',
            role: 'assistant',
            content: GREETING,
            timestamp: 0
          }}
        />
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isLoading && <LoadingIndicator />}

      {/* Invisible anchor for scroll-into-view */}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  )
}
```

</action>

---

#### Task 7 — FloatingFAB component

**<read_first>**
- `src/store/useAIChatbotStore.ts` (from Task 2)
- `src/lib/utils.ts` — for `cn()` usage
</read_first>

**<acceptance_criteria>**
- File: `src/components/chatbot/FloatingFAB.tsx`
- Size: `size-14` (56×56px), `rounded-full`
- Background: `bg-[var(--color-cta)]`, hover `hover:bg-[var(--color-cta-hover)]`
- Icon: `MessageCircle` from `lucide-react`, `h-6 w-6`, white, centered
- Position: `fixed bottom-6 right-6`, `z-50`
- Shadow: `shadow-lg`
- `aria-label="Open AI Assistant"`
- On click: `setOpen(true)`
- Reads `isOpen` from `useAIChatbotStore` — when `isOpen === true` the button does NOT render (not `hidden`/`opacity-0`, but `return null` — FAB is absent when modal is open, matching D-01)
- Focus visible ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Active press: `active:scale-95`
- Transition: `transition-all duration-200`
</acceptance_criteria>

**<action>**

Create `src/components/chatbot/FloatingFAB.tsx`:

```tsx
'use client'

import { MessageCircle } from 'lucide-react'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'

export default function FloatingFAB() {
  const { isOpen, setOpen } = useAIChatbotStore()

  if (isOpen) return null

  return (
    <button
      aria-label="Open AI Assistant"
      onClick={() => setOpen(true)}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'size-14 rounded-full',
        'bg-[var(--color-cta)] text-white shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-200',
        'hover:bg-[var(--color-cta-hover)] hover:scale-105',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  )
}
```

</action>

---

#### Task 8 — AIChatbotModal component

**<read_first>**
- `src/components/ui/dialog.tsx` — confirms `Dialog`, `DialogContent`, `DialogTitle`, `DialogPortal`, `DialogOverlay` are available
- `src/components/modals/OnboardingModal.tsx` — for comparison (not to copy, just to see the modal prop pattern)
- `src/components/chatbot/MessageList.tsx` (from Task 6)
- `src/components/chatbot/MessageInput.tsx` (from Task 5)
- `src/store/useAIChatbotStore.ts` (from Task 2)
</read_first>

**<acceptance_criteria>**
- File: `src/components/chatbot/AIChatbotModal.tsx`
- Reads `isOpen` and `clearMessages` from `useAIChatbotStore`
- `Dialog` component: `open={isOpen}`, `onOpenChange={(v) => { if (!v) { setOpen(false); clearMessages(); } }}`
- `setOpen` imported from store
- Modal panel size override via `DialogContent` `className`:
  - Mobile: full width (`w-full`), anchored bottom (`bottom-0 right-0 top-auto translate-x-0 translate-y-0`), no top-left rounded corners (`rounded-b-none rounded-t-2xl`)
  - Desktop (`sm:`): `max-w-[400px] h-[560px] rounded-2xl` (fully rounded), anchored `bottom-6 right-6`
- `showCloseButton={false}` on `DialogContent` (custom close button in header)
- Modal internal layout (flex column, `flex-1 min-h-0` for message area):
  1. Header `div` (56px, `flex items-center gap-3 px-4 py-3 border-b`): coral 32px bot avatar circle with `Bot` icon + `DialogTitle` "AI Assistant"
  2. Header: custom `button` with `XIcon` from `lucide-react` for close (`absolute top-3 right-3`), `aria-label="Close chat"`, ghost button style
  3. `MessageList` (flex-1, `min-h-0`)
  4. `MessageInput` (fixed height ~65px)
- `usePathname` listener: when pathname changes and `isOpen === true`, call `setOpen(false)` then `clearMessages()` — dependency array is `[pathname]`
- `useEffect` for pathname listener runs only when component is mounted
- `role="dialog" aria-modal="true"` — handled by `DialogPrimitive` internally
- `aria-labelledby` pointing to the `DialogTitle` element ID
</acceptance_criteria>

**<action>**

Create `src/components/chatbot/AIChatbotModal.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { XIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import { Bot } from 'lucide-react'

export default function AIChatbotModal() {
  const pathname = usePathname()
  const { isOpen, setOpen, clearMessages } = useAIChatbotStore()

  // Auto-close on route change
  useEffect(() => {
    if (isOpen) {
      setOpen(false)
      clearMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleClose = () => {
    setOpen(false)
    clearMessages()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Mobile: full-width bottom sheet
          'fixed bottom-0 right-0 top-auto translate-x-0 translate-y-0',
          'w-full rounded-b-none rounded-t-2xl',
          'flex flex-col p-0 gap-0',
          'sm:rounded-2xl sm:bottom-6 sm:right-6 sm:top-auto sm:max-w-[400px] sm:h-[560px] sm:translate-x-0 sm:translate-y-0'
        )}
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 px-4 py-3 border-b shrink-0">
          {/* Bot avatar */}
          <div
            className="size-8 rounded-full bg-[var(--color-cta)] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Bot className="h-4 w-4 text-white" />
          </div>
          <DialogTitle id="ai-chatbot-title" className="text-base font-semibold leading-none">
            AI Assistant
          </DialogTitle>

          {/* Custom close button */}
          <button
            aria-label="Close chat"
            onClick={handleClose}
            className={cn(
              'absolute top-2 right-2',
              'size-7 rounded-[min(var(--radius-md),12px)]',
              'flex items-center justify-center',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Message thread */}
        <MessageList />

        {/* Input */}
        <MessageInput />
      </DialogContent>
    </Dialog>
  )
}
```

</action>

---

#### Task 9 — Integrate FAB + Modal into MainLayout

**<read_first>**
- `src/components/layout/MainLayout.tsx` — to see current imports and JSX structure
</read_first>

**<acceptance_criteria>**
- `src/components/layout/MainLayout.tsx` imports `FloatingFAB` and `AIChatbotModal` from `@/components/chatbot/...`
- `FloatingFAB` and `AIChatbotModal` are rendered inside the root `div`, after `BottomNavigation`
- Both are always rendered (FAB conditionally returns `null` when `isOpen === true`; Modal reads `isOpen` from store internally)
- No changes to any other component in the file
- Existing imports and component structure are unchanged except for the two new component additions
</acceptance_criteria>

**<action>**

In `src/components/layout/MainLayout.tsx`, add two import lines and two JSX children:

**After** the existing imports, add:
```typescript
import FloatingFAB from '@/components/chatbot/FloatingFAB'
import AIChatbotModal from '@/components/chatbot/AIChatbotModal'
```

**Inside** the root `div`, **after** `</BottomNavigation>` (or the last child), add:
```tsx
<AIChatbotModal />
<FloatingFAB />
```

</action>

---

#### Task 10 — TypeScript build verification

**<read_first>**
- `tsconfig.json` — to confirm `strict: true` and path alias `@/*`
- `src/components/chatbot/` (all created files from Tasks 3–8)
- `src/store/useAIChatbotStore.ts` (from Task 2)
- `src/components/layout/MainLayout.tsx` (from Task 9)
</read_first>

**<acceptance_criteria>**
- `npx tsc --noEmit` exits with code 0 (no errors)
- No TypeScript errors reported for any file under `src/components/chatbot/` or `src/store/useAIChatbotStore.ts`
- `MainLayout.tsx` has no new TypeScript errors introduced by chatbot imports
</acceptance_criteria>

**<action>**

Run: `cd /Users/nhannguyenthanh/Developer/gochul-fitness && npx tsc --noEmit`

If errors appear, fix them and re-run until the command exits 0.

</action>

---

## Verification

After all tasks complete, verify these manual checks:

| # | Check | How |
|---|-------|-----|
| 1 | FAB is visible on `/contracts` and `/history` pages | Navigate, confirm FAB bottom-right |
| 2 | Click FAB → modal opens | Click → modal appears anchored bottom-right |
| 3 | X button closes modal | Click X → modal disappears, FAB reappears |
| 4 | Escape key closes modal | Open modal, press Escape → closes |
| 5 | Backdrop click closes modal | Open modal, click backdrop → closes |
| 6 | Messages cleared on close | Send message, close modal, re-open → empty/greeting only |
| 7 | Multi-turn: send 2+ messages | Send "hi", send "list my contracts" → both persist in thread |
| 8 | Input disabled while loading | Send message → input becomes disabled and dimmed |
| 9 | Route change closes modal | Open modal, navigate to different page → modal closes |
| 10 | Bot greeting visible on first open | Open fresh session → greeting bubble appears |
