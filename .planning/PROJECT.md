# GoChul Fitness AI Chatbot

## What This Is

An AI chatbot integrated into the GoChul Fitness web app via a floating action button + modal overlay. Users (CUSTOMER, STAFF, ADMIN) chat with the bot in **English or Vietnamese** to manage their gym contracts and training sessions — creating, updating, listing, and canceling contracts and sessions — without touching the app's UI. The bot calls the same GoChul Fitness API endpoints the frontend uses, respecting the user's role permissions.

## Core Value

Users can manage their gym contracts and training sessions through natural conversation in English or Vietnamese, with zero manual UI navigation.

## Requirements

### Validated

- ✓ AI Chatbot — Floating modal UI: FAB + modal overlay (Phase 2 — FloatingFAB, AIChatbotModal, Zustand store → useChat migration in Phase 5)
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
- ✓ AI Chatbot — Parameter inference loop: AI loops to gather missing parameters until all required fields are provided (Phase 4 — `callClaudeWithTools()` + system prompt rules)
- ✓ AI Chatbot — Vietnamese time inference: AI infers morning/afternoon/evening/night time windows from natural language (Phase 4 — system prompt time rules)
- ✓ AI Chatbot — Structured result display: Bot confirms actions with formatted markdown summaries after API calls (Phase 4 — `formatContractList`, `formatSessionList`, `formatActionResult` in `formatters.ts`)
- ✓ AI Chatbot — Streaming: Token-by-token rendering via `textToStream()` + AI SDK data stream format (Phase 5)
- ✓ AI Chatbot — Rate limiting: Upstash Redis 20 req/min per userId (Phase 5 — gracefully falls back if env vars not set)
- ✓ AI Chatbot — Language nudge: Detect mid-conversation language switch → inline nudge bubble (Phase 5 — `detectLanguage()`)
- ✓ AI Chatbot — Trainer availability check: `get_occupied_time_slots` tool before booking (Phase 5 — tool #11 + dispatcher)
- ✓ AI Chatbot — Inline entity references: [1]/[2] numbering + "cái thứ 2" resolution rules (Phase 5 — system prompt)
- ✓ AI Chatbot — English time parsing: "tomorrow at 9am", "next Thursday" rules (Phase 5 — system prompt)
- ✓ AI Chatbot — Streaming cursor + phase-aware LoadingIndicator (Phase 5)
- ✓ AI Chatbot — Warning + nudge bubble variants (Phase 5)
- ✓ Contract UI — 4-state model labels in Vietnamese: `'Mới tạo'`, `'Đang hoạt động'`, `'Đã hủy'`, `'Đã hết hạn'` (Phase 8 — statusUtils.ts + StatusBadge cascade)
- ✓ Contract UI — ADMIN/STAFF Cancel with AlertDialog confirmation (`Xác nhận hủy hợp đồng`) (Phase 8 — ContractCard.tsx)
- ✓ Contract UI — CUSTOMER Activate button calls API directly (trigger-date modal deferred to server-side reset) (Phase 8 — ContractCard.tsx + Phase 7 D-12)

### Active

- [ ] **Phase 4 end-to-end verification** — Live test of tool-use loop with real data
- [ ] **Vietnamese time expression test harness** — Codify test cases for sáng/chiều/tối/đêm parsing

### Out of Scope

- Voice input or audio responses — text only
- Chat history persistence across sessions — cleared on modal close
- AI-generated workout advice or fitness coaching — chatbot only executes app operations
- Bot operates without user authentication — always uses current Clerk session token

## Context

GoChul Fitness is a gym/fitness studio management app built with Next.js 16, TypeScript, InstantDB, Clerk, Ably, and TanStack Query. Users manage PT (personal training) and rehab contracts with scheduled sessions. Three roles exist: ADMIN (full access), STAFF (trainers), CUSTOMER (gym members). The app already has a working API layer with role-based permission guards. The AI chatbot is a new interface layer on top of the existing API.

**AI chatbot shipped in v1.0** — All 32 v1 requirements implemented across 5 phases.

**Codebase map:** `.planning/codebase/` — contains full STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, and CONCERNS documents.

**AI provider configured:**
- `CLAUDE_API_KEY` — via `@anthropic-ai/sdk`
- `CLAUDE_BASE_URL` — Anthropic-compatible proxy
- `MODEL_NAME` — configured model name

**External setup (manual):**
- Clerk Dashboard: create JWT template named `gochul-fitness`
- Upstash Redis (optional for dev): `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

## Constraints

- **Tech stack**: Next.js 16 App Router, TypeScript, `@anthropic-ai/sdk`, `@ai-sdk/react`, `ai`, existing InstantDB/Clerk/Ably stack
- **Auth**: Chatbot must use the current Clerk session token (server-side) — role permissions enforced by API layer
- **API limits**: Must not exceed rate limits; API calls are synchronous per message (no streaming required)
- **Language**: Must support both English and Vietnamese prompts
- **Privacy**: Bot only operates within the authenticated user's permission scope

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|--------|
| Floating FAB + modal | Non-intrusive; accessible from any page without navigation | ✅ Confirmed — clean UX |
| Role-aware via API | Leverages existing API permission guards; no duplicate auth logic | ✅ Confirmed — hybrid prompt + API enforcement |
| Multi-turn conversation | Allows follow-up questions and parameter gathering in a natural loop | ✅ Confirmed — core chatbot value |
| Structured summary responses | Clearer than raw API responses; users understand what happened | ✅ Confirmed — markdown tables in all results |
| Anthropic SDK | Already configured in codebase; proxy URL supports it | ✅ Confirmed — all 5 phases used `@anthropic-ai/sdk` |
| Two-step confirm flow | Proposed as bubble + Confirm button → `CONFIRMED:` message | ✅ Confirmed — avoids silent writes |
| `CallResult` discriminator union | `{ type: 'text' | 'proposal' | 'selection' }` discriminated return | ✅ Confirmed — clean client routing |
| Server-side result formatting | Format API JSON into markdown before returning to AI and client | ✅ Confirmed — AI sees formatted context |
| `translateError()` static bilingual map | Predictable; zero AI hallucination risk | ✅ Confirmed — 5xx/4xx/429 all mapped |
| Retry loop `attempt < 2` | Simple; handles 429/5xx/network failures | ✅ Confirmed — Phase 5 adds Upstash rate limiting |
| Post-computation streaming | `callClaudeWithTools()` runs to completion; final text streamed | ✅ Confirmed — Phase 5 |
| `AIProvider` wraps `MessageInput` | Scopes useChat context to modal lifecycle | ✅ Confirmed — no parent context needed |
| Upstash Redis rate limiting (20 req/min) | Works across serverless instances | ✅ Confirmed — falls back gracefully without env vars |
| `detectLanguage()` via VI diacritics | Fast, deterministic, no external lib | ✅ Confirmed |
| `useChat` replaces Zustand for chat state | AI SDK manages streaming natively | ✅ Confirmed — Zustand kept for modal open/close only |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

## Current Milestone: v1.1 Enhance Contract Flow — COMPLETE

**Goal:** Simplify the contract lifecycle from 6 states to 2 (NEWLY_CREATED → ACTIVE → EXPIRED), removing customer review/payment flow and consolidating all CTA buttons.

**Completed phases:**
- Phase 6: Data Migration — backfill deprecated statuses → ACTIVE ✅
- Phase 7: Type & API — remove 4 deprecated ContractStatus values; add transition guards ✅
- Phase 8: UI — Cancel button, Activate button, correct badges in Vietnamese ✅
- Phase 9: Documentation — PROGRAM.md + cursor/rules updated to reflect 4-state model ✅

---

*Last updated: 2026-04-12 after Phase 09 complete (v1.1 milestone shipped)*
