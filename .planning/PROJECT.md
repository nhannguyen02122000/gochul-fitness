# GoChul Fitness AI Chatbot

## What This Is

An AI chatbot integrated into the GoChul Fitness web app via a floating action button + modal overlay. Users (CUSTOMER, STAFF, ADMIN) chat with the bot in **English or Vietnamese** to manage their gym contracts and training sessions — creating, updating, listing, and canceling contracts and sessions — without touching the app's UI. The bot calls the same GoChul Fitness API endpoints the frontend uses, respecting the user's role permissions.

## Core Value

Users can manage their gym contracts and training sessions through natural conversation in English or Vietnamese, with zero manual UI navigation.

## Requirements

### Validated

- ✓ AI Chatbot — Floating modal UI: FAB + modal overlay (Phase 2 — FloatingFAB, AIChatbotModal, Zustand store)
- ✓ AI Chatbot — Message thread: Multi-turn conversation thread with user/bot bubbles, markdown rendering (Phase 2 — MessageBubble, MessageList, MessageInput, LoadingIndicator)
- ✓ Contract lifecycle (NEWLY_CREATED → ACTIVE → EXPIRED/CANCELED) — existing
- ✓ Session lifecycle (NEWLY_CREATED → CHECKED_IN/CANCELED/EXPIRED) — existing
- ✓ RBAC for ADMIN, STAFF, CUSTOMER — existing
- ✓ Dual check-in system for sessions — existing
- ✓ Credit tracking for PT/REHAB contracts — existing
- ✓ Realtime events via Ably — existing
- ✓ Clerk authentication — existing
- ✓ InstantDB backend — existing
- ✓ API-11: Bot respects role permissions (Phase 1 — `requireRole()` guard, RBAC in system prompt)
- ✓ API-12: Bot authenticated with Clerk session token server-side (Phase 1 — `auth()` + `getToken()`)
- ✓ AI Chatbot — API integration wired: Client `POST /api/ai-chatbot` with Clerk auth forwarded, multi-turn context in request body, typed response `{ reply, type, role, messages }` (Phase 3)
- ✓ AI Chatbot — Error display: Inline error bubbles in thread with `AlertCircle` icon, `bg-red-50 text-red-700` styling, no markdown (Phase 3)

### Active


- [ ] **AI Chatbot — Parameter inference loop**: AI loops to gather missing parameters until all required fields are provided
- [ ] **AI Chatbot — Vietnamese time inference**: AI infers morning/afternoon/evening/night time windows from natural language (Vietnamese-aware)
- [ ] **AI Chatbot — Structured result display**: AI confirms actions with formatted summaries after API calls

### Out of Scope

- Voice input or audio responses — text only
- Chat history persistence across sessions — cleared on modal close
- AI-generated workout advice or fitness coaching — chatbot only executes app operations
- Bot operates without user authentication — always uses current Clerk session token

## Context

GoChul Fitness is a gym/fitness studio management app built with Next.js 16, TypeScript, InstantDB, Clerk, Ably, and TanStack Query. Users manage PT (personal training) and rehab contracts with scheduled sessions. Three roles exist: ADMIN (full access), STAFF (trainers), CUSTOMER (gym members). The app already has a working API layer with role-based permission guards. The AI chatbot is a new interface layer on top of the existing API.

**Existing codebase map:** `.planning/codebase/` — contains full STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, and CONCERNS documents.

**AI provider already configured:**
- `CLAUDE_API_KEY` — via `@anthropic-ai/sdk`
- `CLAUDE_BASE_URL` — Anthropic-compatible proxy
- `MODEL_NAME` — configured model name

## Constraints

- **Tech stack**: Next.js 16 App Router, TypeScript, `@anthropic-ai/sdk`, existing InstantDB/Clerk/Ably stack
- **Auth**: Chatbot must use the current Clerk session token (server-side) — role permissions enforced by API layer
- **API limits**: Must not exceed rate limits; API calls are synchronous per message (no streaming required)
- **Language**: Must support both English and Vietnamese prompts
- **Privacy**: Bot only operates within the authenticated user's permission scope

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Floating FAB + modal | Non-intrusive; accessible from any page without navigation | — Pending |
| Role-aware via API | Leverages existing API permission guards; no duplicate auth logic | — Pending |
| Multi-turn conversation | Allows follow-up questions and parameter gathering in a natural loop | — Pending |
| Structured summary responses | Clearer than raw API responses; users understand what happened | — Pending |
| Anthropic SDK | Already configured in codebase; proxy URL supports it | — Pending |

---

*Last updated: 2026-04-04 after Phase 3 completion*
