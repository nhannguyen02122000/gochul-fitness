# Stack Research

**Domain:** AI Chatbot — In-app conversational interface (multi-turn, role-aware, API-driven)
**Researched:** 2026-04-04
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@anthropic-ai/sdk** | `0.82.0` | Claude API client for tool-use + multi-turn conversation | Already wired into the codebase (`CLAUDE_API_KEY`, `CLAUDE_BASE_URL`, `MODEL_NAME` env vars exist). SDK handles message history management, tool calling, and streaming natively. |
| **zod** | `^4.1.8` | Schema validation for tool-call inputs/outputs | Required peer dep of `@anthropic-ai/sdk`. Also validates API response shapes and form inputs. Aligns with GoChul's TypeScript-first culture. |
| **ai** (Vercel AI SDK) | `^6.0.145` | Server-side LLM abstraction + React streaming hooks | Provides `useChat` / `streamText` — the standard for React chat UIs. Handles streaming UI, message state, and reload/duplicate suppression out of the box. Eliminates ~300 lines of custom streaming logic. |
| **sonner** | `^2.0.7` | Toast notifications | Already installed in GoChul (`^2.0.7`). Use for success/error toasts after API calls complete. |
| **framer-motion** | `^12.38.0` | Modal animations (open/close/slide) | Industry-standard React animation library. Enables smooth FAB → modal transition. Works seamlessly with React 19. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-markdown** | `^10.1.0` | Render Claude's markdown responses | Already installed. Use to render bot text with code blocks, bold, lists. |
| **remark-gfm** | `^4.0.1` | GitHub Flavored Markdown (tables, strikethrough) | Optional — enables richer markdown in bot responses (e.g. contract summary tables). |
| **date-fns** | `^4.1.0` | Date arithmetic for Vietnamese time inference | Already installed. Use for `addDays()`, `format()`, timezone-aware date math for the morning/afternoon/evening/night window calculations. |
| **clsx** | `^2.1.1` | Conditional CSS class merging | Already installed. Use for dynamic FAB + modal class composition. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Next.js 16 API Routes** | Server-side LLM calls + API proxy | All `POST /api/chat/message` calls go through existing App Router handlers. Use `auth()` from `@clerk/nextjs` to inject the Clerk session token for role enforcement. |
| **Tailwind CSS 4** | Modal + FAB styling | Already configured. No new CSS pipeline needed. Use existing `cn()` from `lib/utils.ts`. |
| **shadcn/ui components** | Modal, Button, ScrollArea | Use existing `Modal`, `Button`, `ScrollArea` components — don't duplicate. |

---

## Installation

```bash
# Core
npm install @anthropic-ai/sdk@0.82.0 zod@^4.1.8 ai@^6.0.145

# Streaming + animation
npm install framer-motion@^12.38.0

# Markdown rendering (only if not already present)
npm install remark-gfm@^4.0.1
```

```bash
# Dev dependencies
npm install -D @types/node@^20
```

> **Note:** `sonner`, `react-markdown`, `date-fns`, and `clsx` are already in `package.json`. No re-install needed.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@anthropic-ai/sdk` | OpenAI `openai` SDK | GoChul already has Anthropic configured. OpenAI would require a new API key, new env vars, and new proxy URL — zero upside. |
| **Vercel AI SDK (`ai`)** | Custom streaming with `fetch` + `ReadableStream` | Custom streaming requires manual handling of SSE parsing, message state, reload, and duplicate suppression. `useChat` from `ai` covers all of this. |
| **framer-motion** | CSS transitions + `transition` | CSS works for simple open/close, but FAB→modal choreographed animation (button morphs into modal, content fades in) is verbose and error-prone in pure CSS. framer-motion's `AnimatePresence` + `layoutId` is the idiomatic React approach. |
| **sonner** | Custom toast implementation | Already in GoChul. Consistency with existing toasts is valuable. |
| **zod** | TypeScript interfaces / `ajv` | `zod` is the de-facto standard for runtime schema validation in TypeScript projects. `ajv` is more verbose; TypeScript interfaces are compile-time only. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **LangChain / LangGraph** | Overkill for a single-user, single-API chatbot. Adds 15+ packages, a steep learning curve, and runtime overhead with zero benefit for a one-bot, API-calling use case. | `@anthropic-ai/sdk` tool-use directly in an API Route. |
| **AI SDK `useAssistant` or `useCompletion`** | `useAssistant` is for single-turn / stateless assistants. `useCompletion` lacks multi-turn state management. | `useChat` from `ai` — designed for multi-turn conversational UI with built-in streaming. |
| **Streaming the entire response to the client and rendering character-by-character** | `useChat` handles incremental streaming rendering via the `stream` prop. Re-implementing SSE parsing from scratch reintroduces the complexity that `ai` solves. | `streamText` on server + `useChat` on client with `stream` prop. |
| **Third-party chatbot widget services** (Intercom, Drift, Freshdesk, Botpress) | These are generic customer support tools. They cannot call GoChul's private API endpoints, respect RBAC, or infer Vietnamese time windows. | Custom implementation using `@anthropic-ai/sdk` + GoChul API. |
| **Supabase Edge Functions as the AI endpoint** | Adds a separate hosting concern, auth overhead, and cost layer. GoChul already has a Next.js API Route layer. | Next.js API Route `POST /api/chat/message` — same hosting, same auth, same network. |
| **Separate vector/Pinecone DB for conversation memory** | Conversation is stateless per session (cleared on modal close). No persistent memory needed. Vector DB adds latency, cost, and maintenance. | Pass full message history in the `messages` array on each request (cap at `MAX_HISTORY_MESSAGES=40`). |
| **`ollama` or local LLM** | No GPU, no ops capacity for local inference. `CLAUDE_BASE_URL` already points to a proxy. | Keep using the proxy + Anthropic. |

---

## Stack Patterns by Variant

**If the AI proxy supports streaming SSE:**
- Use `streamText` from `ai` SDK on the server with `stream: true`
- Pass `data.toJSONStream` via `useChat`'s `stream` prop
- Render tokens incrementally — no loading spinner needed
- This is the recommended path

**If streaming is disabled or rate-limited:**
- Use `client.messages.create({ max_tokens: 8192 })` from `@anthropic-ai/sdk` directly in an API Route
- Return the full `content` string as JSON
- Client renders in one pass with a skeleton loader while awaiting response
- Fallback: `useChat` with `process.env.NEXT_PUBLIC_AI_STREAMING_DISABLED=true`

**If the modal needs to be accessible (a11y):**
- Use shadcn `Modal` component (already in codebase) as the container
- Attach `framer-motion` animation to the inner panel only
- Ensure focus trap, `aria-modal`, `role="dialog"`, and `Escape` key close
- The shadcn `Modal` already handles focus management — extend it, don't replace it

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@anthropic-ai/sdk@0.82.0` | Node.js 18+, React 18+, React 19+ | Peer dep is `zod@^3.25.0 \|\| ^4.0.0`. Use `zod@^4.1.8` for latest. |
| `ai@6.0.145` | Next.js 14+, React 18+, React 19+ | Peer deps: `zod@^3.25.76 \|\| ^4.1.8`. Requires Next.js App Router for `streamText`. |
| `framer-motion@12.38.0` | React 16+, React 19+ | No known compatibility issues with Next.js 16.1.0. |
| `sonner@2.0.7` | React 16+, React 19+ | Already in GoChul's dep tree. |
| `react-markdown@10.1.0` | React 16+, React 19+ | Already in GoChul's dep tree. |
| `zod@4.1.8` | TypeScript 4+, Node 14+ | Both `ai` and `@anthropic-ai/sdk` support Zod v4. |

---

## Sources

- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) — v0.82.0, verified 2026-04-04
- [Vercel AI SDK (ai) npm](https://www.npmjs.com/package/ai) — v6.0.145, verified 2026-04-04; peer deps confirmed
- [framer-motion npm](https://www.npmjs.com/package/framer-motion) — v12.38.0, verified 2026-04-04
- [zod npm](https://www.npmjs.com/package/zod) — v4.3.6 (stable), ^4.1.8 (range), verified 2026-04-04
- [GoChul Fitness existing stack](/Users/nhannguyenthanh/Developer/gochul-fitness/.planning/codebase/STACK.md) — package.json confirmed, all versions current
- [FEAT_AIBOT.txt](/Users/nhannguyenthanh/Developer/gochul-fitness/docs/FEAT_AIBOT.txt) — conversation requirements, time window rules, API routing logic
- [PROJECT.md](/Users/nhannguyenthanh/Developer/gochul-fitness/.planning/PROJECT.md) — confirmed scope: multi-turn, Vietnamese-aware, role-aware, floating modal, no streaming required

---

## Architecture Summary (for roadmap)

```
User action → Floating FAB (Client Component)
    ↓ click
ChatModal opens (AnimatePresence)
    ↓ user types
POST /api/chat/message (Server Route)
    ├── auth() → Clerk session token
    ├── build system prompt (role + API catalog + time rules)
    ├── client.messages.create({ tools: [...] })  ← @anthropic-ai/sdk
    │       ├── Tool: call_contract_api → zod schema
    │       ├── Tool: call_session_api  → zod schema
    │       └── Tool: call_user_api     → zod schema
    ├── execute tool → POST existing GoChul API
    │       (role permissions enforced by API layer)
    ├── stream or return full response
    └── return { text, toolResults, updatedHistory }
        ↓
useChat from ai SDK → renders streamed tokens via react-markdown
    ↓
sonner toast on tool execution success/failure
```

**Net new packages to install:** 4 (`@anthropic-ai/sdk`, `zod`, `ai`, `framer-motion`, `remark-gfm`).
**Existing packages reused:** `sonner`, `react-markdown`, `date-fns`, `clsx`, shadcn components, Tailwind CSS.

---
*Stack research for: GoChul Fitness AI Chatbot*
*Researched: 2026-04-04*
