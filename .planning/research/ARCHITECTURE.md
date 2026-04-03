# Architecture Research

**Domain:** AI Chatbot — Floating Modal Interface in Next.js 16 (App Router)
**Researched:** 2026-04-04
**Confidence:** HIGH

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Browser / Client                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐     ┌─────────────────────────────────────────┐   │
│  │  FloatingFAB     │────►│           AIChatbotModal                │   │
│  │  (ClientComp)   │     │  ┌───────────┐  ┌──────────────────┐   │   │
│  │                 │     │  │MessageList│  │ MessageInput    │   │   │
│  └─────────────────┘     │  └─────┬─────┘  └────────┬─────────┘   │   │
│                          │        │                  │              │   │
│                          │        ▼                  ▼              │   │
│                          │  ┌─────────────────────────────────────┐ │   │
│                          │  │      useAIChatbotStore (Zustand)    │ │   │
│                          │  │  • messages[]                       │ │   │
│                          │  │  • isLoading                        │ │   │
│                          │  │  • addMessage / clearMessages        │ │   │
│                          │  └──────────────┬──────────────────────┘ │   │
│                          └─────────────────┼─────────────────────────┘   │
│                                            │ fetch / POST              │
├────────────────────────────────────────────┼───────────────────────────┤
│                           Next.js Server                                │
├──────────────────────────┬─────────────────┴───────────────────────────┤
│  API Route              │  /api/ai-chatbot/route.ts                     │
│  ┌──────────────────────┴──────────────────────────────────────────┐   │
│  │  1. auth()                        → Clerk session → userId       │   │
│  │  2. getUserSetting(userId)         → resolve role (ADMIN/STAFF)   │   │
│  │  3. buildSystemPrompt(role)        → inject available tools       │   │
│  │  4. anthropic.messages.create()   → call Claude with full history │   │
│  │  5. parseAssistantMessage()       → extract tool_use blocks       │   │
│  │  6. executeTools(tools[], role)   → call internal API routes       │   │
│  │  7. loop → re-call anthropic      → until no tool_use remain      │   │
│  │  8. return final text response    → back to client                │   │
│  └───────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  Existing API Routes (role-guarded)                                     │
│  POST /api/contract/create   GET /api/history/getAll   etc.              │
├─────────────────────────────────────────────────────────────────────────┤
│  InstantDB   │   Clerk   │   Ably (realtime invalidation on mutation)  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-----------------------|
| `FloatingFAB` | Persistent floating button; owns open/close trigger | Client Component — renders in root layout or `MainLayout`; uses React state or portal |
| `AIChatbotModal` | Modal overlay shell; renders message list + input form | Client Component — `position: fixed` overlay + `z-index` layering; uses `next/dynamic` to avoid SSR conflicts |
| `MessageBubble` | Single message render (user vs. bot); streaming text display | Client Component — pure presentational; receives `role`, `content`, `isLoading` props |
| `MessageInput` | Text input + send button; keyboard submit (Enter); loading state | Client Component — `useRef` for auto-scroll anchor; disabled during AI thinking |
| `useAIChatbotStore` | In-memory conversation state; manages message list + isLoading flag | Zustand store (no persistence needed — cleared on modal close) |
| `/api/ai-chatbot/route.ts` | Server-side orchestrator: auth → prompt build → LLM call → tool execution loop → response | Route Handler (Node.js); uses `@anthropic-ai/sdk` |
| `anthropicService.ts` | Wraps `Anthropic` client; exposes `createMessage()` with full message history | Server-only utility; never imported by client components |
| `toolDefinitions.ts` | Declares the set of available tool schemas passed to Claude (API endpoint, params, roles) | Server-only constant; TypeScript-typed |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── (main)/
│   │   └── layout.tsx              # add FloatingFAB here (inside auth shell)
│   └── api/
│       └── ai-chatbot/
│           └── route.ts            # server-side AI orchestration endpoint
├── components/
│   └── ai-chatbot/
│       ├── index.ts                 # re-export all public components
│       ├── FloatingFAB.tsx          # the persistent floating button
│       ├── AIChatbotModal.tsx       # the modal overlay (portal)
│       ├── MessageBubble.tsx        # single message row
│       ├── MessageInput.tsx         # input + send
│       └── AIChatbotModal.module.css # scoped styles (or Tailwind classes)
├── features/
│   └── ai-chatbot/
│       ├── services/
│       │   ├── anthropic.ts         # Anthropic client wrapper (server-only)
│       │   └── executeTool.ts       # executes a resolved tool call
│       ├── store/
│       │   └── useAIChatbotStore.ts # Zustand store
│       ├── types/
│       │   └── index.ts             # ChatMessage, ToolResult, AIModalState
│       └── constants/
│           └── toolDefinitions.ts   # Claude tool schemas (server-only)
```

### Structure Rationale

- **`components/ai-chatbot/`:** Client-facing UI components — imported by layouts, zero server-side logic.
- **`features/ai-chatbot/`:** Server-only business logic (Anthropic calls, tool execution). This separation prevents the large `@anthropic-ai/sdk` bundle from leaking into the client bundle.
- **`app/api/ai-chatbot/route.ts`:** The single HTTP entry point; coordinates auth → AI → tool execution → response.
- **`store/useAIChatbotStore.ts`:** Zustand store scoped to the modal lifecycle; no `persist` middleware — intentionally cleared on modal close.

---

## Architectural Patterns

### Pattern 1: Floating FAB + Modal Overlay

**What:** A persistent floating action button anchors to the viewport corner (bottom-right). Clicking it mounts a full-screen or slide-up modal that contains the chat interface. The modal uses a React Portal to escape stacking context constraints.

**When to use:** When the feature must be accessible from every page without adding nav items, and the feature is secondary (not a primary flow).

**Trade-offs:**

| Pro | Con |
|-----|-----|
| Available globally without routing | z-index battles with other overlays (mobile menus, toasts) |
| Single mount/unmount lifecycle = no page state pollution | FAB competes for screen real estate on mobile |
| Portal-based = not affected by parent overflow/transform rules | Requires careful accessibility (focus trap, Escape key, aria-modal) |

**Example:**
```tsx
// FloatingFAB.tsx
'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const AIChatbotModal = dynamic(() => import('./AIChatbotModal'), { ssr: false });

export default function FloatingFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-50 ..."
      >
        <MessageSquareIcon />
      </button>

      {isOpen && <AIChatbotModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

```tsx
// AIChatbotModal.tsx — Portal-based overlay
'use client';
import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

export default function AIChatbotModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div ref={overlayRef} role="dialog" aria-modal="true" className="fixed inset-0 z-[100] ...">
      {/* message list */}
      {/* message input */}
    </div>,
    document.body
  );
}
```

---

### Pattern 2: Clerk Auth — Server-Side Session Token

**What:** The API route uses Next.js `auth()` from `@clerk/nextjs/server` to get the server-side session. The Clerk JWT contains the `userId` which is used to look up the user's role in InstantDB.

**When to use:** Any server-side operation that needs to know "who is making this request" — in this case, to resolve the user's role and inject it into the AI system prompt.

**Trade-offs:**

| Pro | Con |
|-----|-----|
| No token passing from client needed — `auth()` reads the HttpOnly cookie | `auth()` is async; adds ~5–20ms to API route latency |
| Server-side validation cannot be spoofed by client headers | Only works inside Next.js route handlers (not plain API calls from outside) |
| Clerk handles token refresh / rotation automatically | Requires `@clerk/nextjs/server` import — not available in client components |

**Example:**
```ts
// /api/ai-chatbot/route.ts
import { auth } from '@clerk/nextjs/server';
import { getUserSetting } from '@/instantDB'; // existing abstraction

export async function POST(req: Request) {
  const { userId } = await auth();           // throws 401 if unauthenticated
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const userSetting = await getUserSetting(userId); // resolve role
  const role = userSetting?.role ?? 'CUSTOMER';    // default to lowest privilege

  const { messages } = await req.json();
  // ... pass role into system prompt
}
```

**Important note from FEAT_AIBOT.txt:** The AI must call existing API routes (e.g., `POST /api/contract/create`) to ensure role permission guards are enforced. The API route itself — not the chatbot — is the gatekeeper. The chatbot passes the Clerk session token via the HttpOnly cookie automatically because the tool execution calls are `fetch()` requests made **from the server-side route handler**, not from the browser.

---

### Pattern 3: Tool-Use Loop — AI Orchestrating API Calls

**What:** The AI model is given a set of "tools" (OpenAI/Anthropic tool-use format) corresponding to GoChul Fitness API endpoints. When the model decides to call a tool, the server executes the tool and feeds the result back to the model. The loop continues until the model produces a natural-language response (no more tool calls).

**When to use:** When the AI needs to perform stateful, multi-step operations (like creating a contract with multiple parameters) rather than just answering questions.

**Trade-offs:**

| Pro | Con |
|-----|-----|
| AI gathers missing parameters naturally over turns | Infinite loop risk — cap max iterations (e.g., 10) |
| Maps cleanly to existing API endpoints (role guards already in place) | Latency compounds: each tool call = API round-trip |
| Single API call from client → server handles all nested calls | Tool schemas must be kept in sync with actual API params |

**Flow:**
```
User message
    │
    ▼
anthropic.messages.create()   ← with tool definitions + full conversation history
    │
    ├─[no tool_use]──► return text response
    │
    └─[has tool_use]──► executeTool(tool, params)   ──► POST /api/contract/create
            │                      │
            │                      ▼
            │               API returns result (success/error)
            │                      │
            ▼                      ▼
    feed result back to model   ←anthropic.messages.create() again (continuation)
            │
            └─[no more tool_use]──► return final text response
```

**Example tool definition:**
```ts
// toolDefinitions.ts  (server-only)
import type { Tool } from '@anthropic-ai/sdk';

export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'create_contract',
    description: 'Create a new gym contract. Requires: customer_clerk_id, kind, credits, money',
    input_schema: {
      type: 'object',
      properties: {
        customer_clerk_id: { type: 'string', description: 'Clerk ID of the customer' },
        kind: { type: 'string', enum: ['PT', 'REHAB', 'GYM'], description: 'Contract type' },
        credits: { type: 'number', description: 'Number of sessions' },
        money: { type: 'number', description: 'Amount paid in VND' },
      },
      required: ['customer_clerk_id', 'kind', 'credits', 'money'],
    },
  },
  {
    name: 'get_history',
    description: 'List training sessions with optional time window filter',
    input_schema: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'ISO date string, start of window' },
        to_date: { type: 'string', description: 'ISO date string, end of window' },
      },
    },
  },
  // ... more tools
];
```

---

### Pattern 4: Multi-Turn Conversation State

**What:** The full message history is sent to the AI on every turn so the model has context. On the client, this is stored in Zustand; on the server, it is rebuilt from the request body.

**When to use:** Any conversational AI that supports follow-up questions — which is this feature's core value.

**State shape:**
```ts
// store/useAIChatbotStore.ts
import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: ToolResult[];  // optional: show what API was called
}

interface AIChatbotStore {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;  // called when modal closes
}

export const useAIChatbotStore = create<AIChatbotStore>((set) => ({
  messages: [],
  isLoading: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [], isLoading: false }),
}));
```

**Server-side history reconstruction:**
```ts
// The client sends the current message list (without tool results) to the API route.
// The API route reconstructs the full history including prior assistant messages.
const history = messages.map(({ role, content }) => ({ role, content }));
```

**When to clear:** Call `clearMessages()` in the `onClose` handler of `AIChatbotModal`. Per ARCHITECTURE.md: "Chat history persistence across sessions — cleared on modal close" is out of scope.

---

### Pattern 5: Streaming vs. Non-Streaming Responses

**What:** The AI response can either arrive all at once (non-streaming) or be delivered token-by-token via Server-Sent Events (SSE) / ReadableStream (streaming). The ARCHITECTURE.md explicitly notes "streaming not required."

**Decision: Non-streaming first, streaming as future enhancement.**

**When to use streaming:** Long AI responses (explanatory text > 3 sentences), perceived latency matters, UX polish is a priority.

**When to skip:** MVP phase, simpler implementation, server load is the bottleneck anyway (each token requires Claude API call overhead).

**Trade-offs:**

| | Non-Streaming | Streaming |
|--|--|--|
| Implementation | Single `POST`, single `Response` | SSE or ReadableStream, chunked transfer encoding |
| UX | "Thinking..." spinner, then full response | Typing effect, feels faster |
| Complexity | ~20 lines | ~60–80 lines (client event reader + buffer + cleanup) |
| Server cost | Same Claude API pricing | Same — billed per output token regardless |

**Non-streaming implementation (MVP):**
```ts
// /api/ai-chatbot/route.ts
const response = await anthropic.messages.create({
  model: process.env.MODEL_NAME!,
  max_tokens: 8192,
  system: buildSystemPrompt(role),
  messages: history,
  tools: TOOL_DEFINITIONS,
});

const text = response.content.find((b) => b.type === 'text')?.text ?? '';
return NextResponse.json({ text });
```

**Streaming implementation (future phase):**
```ts
// SSE approach: client reads EventSource, server uses anthropic beta.messages.stream
const stream = await anthropic.beta.messages.stream({
  model: process.env.MODEL_NAME!,
  max_tokens: 8192,
  system: buildSystemPrompt(role),
  messages: history,
  tools: TOOL_DEFINITIONS,
});

const encoder = new TextEncoder();
const readable = new ReadableStream({
  async start(controller) {
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        controller.enqueue(encoder.encode(`data: ${event.delta.text}\n\n`));
      }
    }
    controller.close();
  },
});

return new Response(readable, {
  headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
});
```

---

## Data Flow

### Request Flow (Full Turn)

```
User types message
    │
    ▼
MessageInput onSubmit → addMessage({ role: 'user', content })
    │
    ▼
setLoading(true)
    │
    ▼
fetch('/api/ai-chatbot', {
  method: 'POST',
  body: JSON.stringify({ messages: messages.concat(newUserMsg) }),
})                                                            ← no manual auth header needed; HttpOnly cookie sent automatically
    │
    ├─[API Route] auth() → userId → getUserSetting() → role
    │
    ├─[API Route] buildSystemPrompt(role) → inject role + tool definitions + time rules
    │
    ├─[API Route] anthropic.messages.create() → assistant response
    │       │
    │       ├─[no tool_use]──► text response
    │       │
    │       └─[has tool_use]──► for each tool_call:
    │              │   fetch('/api/contract/create', { method: 'POST', body: params })
    │              │       │   ← server-side call; Clerk cookie forwarded automatically
    │              │       ▼
    │              │   API route runs auth() → permission check → InstantDB write
    │              │       ▼
    │              │   return JSON result
    │              ▼
    │       re-call anthropic with tool_results
    │
    ▼
NextResponse.json({ text: finalResponseText })
    │
    ▼
addMessage({ role: 'assistant', content: text })
    │
    ▼
setLoading(false)
    │
    ▼
MessageList auto-scrolls to bottom
```

### State Management

```
useAIChatbotStore (Zustand — client-only, in-memory)
    │
    ├── messages: ChatMessage[]        ← source of truth for UI
    ├── isLoading: boolean             ← drives input disabled + spinner
    │
    ├── addMessage(msg)                ← called after fetch completes
    ├── setLoading(bool)               ← called before/after fetch
    └── clearMessages()               ← called on modal close

    (No persistence — intentional. Chat dies when modal closes.)
```

### Key Data Flows

1. **User Intent → API Action:** User says "Tạo hợp đồng" → AI detects `create_contract` tool → server calls `POST /api/contract/create` → InstantDB writes → Ably publishes `contract.changed` → `RealtimeProvider` invalidates `contractKeys.lists()` → TanStack Query refetches → UI updates automatically.

2. **Session History Query:** User says "lịch tập sáng mai" → AI infers time window from system prompt rules (0am–11:59, tomorrow) → calls `GET /api/history/getAll?from=...&to=...` → returns sessions → AI formats summary → user sees structured response.

3. **Permission Scoping:** STAFF user asks "list all contracts" → AI calls `GET /api/contract/getAll` → API route's `auth()` resolves `userId` → `getUserSetting()` returns `role: 'STAFF'` → API route filters to only STAFF's own contracts → never returns unauthorized data.

---

## Build Order (Phase Structure)

Dependencies between components — what must be built before what:

```
Phase 1: Skeleton
├── Tool definitions + API route (server)
│   └── No UI needed yet; test with curl / Postman
│   └── Tool: buildSystemPrompt() + single anthropic.messages.create() call
│   └── No tool-use loop yet — hardcoded system prompt with examples
│
Phase 2: Client shell
├── FloatingFAB + AIChatbotModal (UI only, no AI logic)
│   └── Fake "thinking" state to test open/close/mounting
│   └── Zustand store with hardcoded addMessage/clearMessages
│
Phase 3: Wire API route to client
├── fetch('/api/ai-chatbot') from MessageInput onSubmit
│   └── Non-streaming, single-turn (no tool-use loop yet)
│   └── Pass messages array; receive text; render in MessageList
│
Phase 4: Multi-turn + tool-use loop
├── Add TOOL_DEFINITIONS to anthropic call
│   └── Implement executeTool() calling existing API routes
│   └── Loop: re-call anthropic with tool_results until done
│   └── Max 10 iterations to prevent runaway loops
│
Phase 5: Polish
├── Streaming response (ReadableStream) — if UX warrants it
├── Auto-scroll MessageList
├── Tool result display (show what API was called)
└── Vietnamese time inference rules in system prompt
```

**Critical path:** Phase 3 is the riskiest integration point — Clerk session cookie forwarding from a fetch inside a Next.js API route must be verified. Test this before Phase 4.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k active users | Single `/api/ai-chatbot` route is fine; no caching needed; Zustand in-memory state is optimal |
| 1k–10k users | Consider adding `rateLimit` middleware (e.g., `upstash-ratelimit`) on `/api/ai-chatbot` to prevent abuse; Claude API cost becomes the bottleneck |
| 10k–100k users | Move AI orchestration to a dedicated edge function or separate service (Vercel AI SDK on Edge Runtime); consider caching tool results for repeated queries |

### Scaling Priorities

1. **First bottleneck — Claude API latency:** A tool-use loop with 3 sequential calls adds 2–5 seconds total latency. Solution: reduce max loop iterations, pre-fetch known data in system prompt context.

2. **Second bottleneck — InstantDB write throughput:** Each tool call hits InstantDB. At high volume, batch writes or optimistic UI updates help. The existing `publishRealtimeEventSafely()` pattern is already resilient.

---

## Anti-Patterns

### Anti-Pattern 1: Calling Anthropic from a Client Component

**What people do:** Importing `Anthropic` from `@anthropic-ai/sdk` directly in a `'use client'` component and calling `client.messages.create()` from the browser.

**Why it's wrong:** Exposes the `CLAUDE_API_KEY` to the client bundle. The API key is visible in the browser JS bundle via source maps and network requests. Additionally, all role-permission logic must be duplicated on the client.

**Do this instead:** All AI calls happen exclusively in `/api/ai-chatbot/route.ts` (Server Component / Route Handler). Client only calls `fetch('/api/ai-chatbot')`.

---

### Anti-Pattern 2: Storing Conversation History in localStorage / Cookies

**What people do:** Persisting the message array to `localStorage` or a cookie so chat survives page refreshes.

**Why it's wrong:** Message history may contain sensitive data inferred from API responses (contract IDs, session times). Storing this in browser storage exposes it to XSS attacks and other tabs on the same device. GoChul Fitness is a gym management app with personal health-adjacent data.

**Do this instead:** Keep state in-memory only (Zustand without `persist` middleware). Clear on modal close. If history persistence is needed later, store on the server side (InstantDB or a dedicated session table) with proper auth scoping.

---

### Anti-Pattern 3: Not Capping the Tool-Use Loop

**What people do:** Letting the AI re-call tools indefinitely when parameters are ambiguous.

**Why it's wrong:** Each loop iteration costs a Claude API call (and money). A confused AI can run 50+ iterations, generating a large bill and a degraded response.

**Do this instead:** Cap at 10 iterations (configurable constant `MAX_TOOL_ITERATIONS`). If the loop exits via the cap, return a graceful error message asking the user to rephrase their request.

---

### Anti-Pattern 4: Mixing Tool Schemas with API Implementation

**What people do:** Encoding tool schemas inline in the API route file, duplicating parameter info from the actual API route handlers.

**Why it's wrong:** Tool schemas and API params drift out of sync. A new required field added to `POST /api/contract/create` won't be reflected in the AI tool schema until someone manually updates both places.

**Do this instead:** Keep `toolDefinitions.ts` as the single source of truth. If an API route's params change, the tool schema must be updated in the same PR. Add a TypeScript test that validates tool schema params against a type derived from the API route.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Anthropic (Claude)** | `@anthropic-ai/sdk` — `messages.create()` or `beta.messages.stream()` in `/api/ai-chatbot` route | Server-only. `CLAUDE_API_KEY`, `CLAUDE_BASE_URL`, `MODEL_NAME` must be in `.env.local`. Proxy URL supports Anthropic-compatible endpoint. |
| **Clerk** | `auth()` from `@clerk/nextjs/server` inside the API route | No client-side token passing needed — HttpOnly cookie handled by Next.js. Server-side auth is non-negotiable for role resolution. |
| **InstantDB** | `getUserSetting(userId)` via existing server abstraction inside API route | Reuse existing InstantDB server query pattern. No new setup needed. |
| **Ably** | No direct integration in chatbot — tool executions trigger existing API routes which call `publishRealtimeEventSafely()` | Chat results propagate to other clients through existing realtime flow automatically. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `FloatingFAB` ↔ `AIChatbotModal` | Props: `onClose` callback; conditional render | `FloatingFAB` owns the open/close state. `AIChatbotModal` receives `onClose` to report back. |
| `AIChatbotModal` ↔ `useAIChatbotStore` | Zustand store (subscribe in component, `addMessage`/`setLoading`/`clearMessages` actions) | Store is the single source of truth for message list and loading state. |
| `MessageInput` ↔ API route | `fetch('/api/ai-chatbot')` — no manual auth header | Clerk HttpOnly cookie is forwarded automatically by `fetch()` from a client component. |
| `/api/ai-chatbot/route.ts` ↔ existing API routes | Server-side `fetch()` with `cookies()` request helper (no auth header needed — runs on same origin) | `fetch('http://localhost:3000/api/contract/create', ...)` from within the Next.js server can forward the Clerk session via `getRequestHeader('cookie')` + `fetch(..., { headers: { cookie } })`. |
| `toolDefinitions.ts` ↔ API route schemas | Tool schemas defined in `constants/`, imported by route | Single source of truth. Validate against API route TypeScript types. |

---

## Sources

- [Anthropic Messages API — Tool Use](https://docs.anthropic.com/en/api/messages)
- [Anthropic SDK — TypeScript Reference](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [Next.js App Router — Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [Clerk — Server-side `auth()`](https://clerk.com/docs/references/nextjs/auth)
- [Zustand — Getting Started](https://zustand.docs.pmnd.rs/getting-started/introduction)
- [React Portals — `createPortal`](https://react.dev/reference/react-dom/createPortal)
- [Next.js — Dynamic Imports with `ssr: false`](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading#disabling-ssr)
- [TanStack Query — Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/reference/useQueryClient)

---
*Architecture research for: AI Chatbot Feature — GoChul Fitness*
*Researched: 2026-04-04*
