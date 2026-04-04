# Phase 1: Skeleton & Architecture - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the server-side API route (`/api/ai-chatbot/route.ts`), tool definitions (`toolDefinitions.ts`), and auth security foundation for the AI chatbot. No AI logic (tool-use loop), no UI code. The deliverables are a verified skeleton that can be tested with curl before any client code exists.

Requirements covered: API-11 (role permissions respected), API-12 (auth via Clerk token, server-side)

</domain>

<decisions>
## Implementation Decisions

### Auth Token Forwarding
- **D-01:** Use Clerk short-lived scoped tokens — `getToken({ template: 'gochul-fitness' })` — to call GoChul API routes from the chatbot route handler. NOT automatic cookie forwarding, NOT INSTANTDB_ADMIN_TOKEN. Clerk middleware must be configured with a 'gochul-fitness' JWT template.

### System Prompt Design
- **D-02:** Hybrid approach — the AI knows the full role permission matrix (what each role can/cannot do) in the system prompt, so it can give specific error messages and ask smart follow-ups. The API layer enforces permissions as the safety net. If the AI makes a disallowed call, the API returns 403 and the bot translates it to a user-friendly message.

### roleCheck.ts Standardization
- **D-03:** Standardize on `src/lib/roleCheck.ts` — expand it to cover all needed role checks (ADMIN, STAFF, CUSTOMER, isStaffOrAdmin, isAdminOrStaff, etc.), then refactor existing API routes that do inline role checks to use it. The chatbot route also uses roleCheck.ts helpers. Single source of truth for role logic.

### Deliverables (from ROADMAP.md)
- `/api/ai-chatbot/route.ts` — Next.js Route Handler with `auth()` → `userId` → `getUserSetting()` → role; hardcoded system prompt (no tool-use loop yet); placeholder response
- `toolDefinitions.ts` — complete `TOOL_DEFINITIONS` constant with all 10 endpoint schemas + per-role action scoping in comments
- `anthropicService.ts` — `@anthropic-ai/sdk` client wrapper using `CLAUDE_API_KEY`, `CLAUDE_BASE_URL`, `MODEL_NAME`
- Clerk JWT template verification test (curl or script confirming token forwarding works)
- `roleCheck.ts` expanded with all needed helpers; existing routes refactored

### Claude's Discretion
- Exact system prompt wording and tone
- Whether tool definitions include response schema examples (helps AI format structured results later)
- The placeholder response format before the tool-use loop is added
- Exact test strategy for verifying Clerk token forwarding (curl command vs a simple test script)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Chatbot feature
- `docs/FEAT_AIBOT.txt` — Feature spec: chatbot behavior, Vietnamese time rules, API routing logic, AI call method (`@anthropic-ai/sdk`)
- `docs/PROGRAM.md` — GoChul API structure, RBAC matrix, contract/session lifecycle, data model

### Existing codebase
- `src/lib/roleCheck.ts` — Existing (unused) role check helpers to be expanded and standardized
- `src/lib/dbServer.ts` — InstantDB server singleton used by all API routes
- `src/app/api/contract/getAll/route.ts` — Pattern for `auth()` + `getUserSetting()` + role scoping
- `.planning/codebase/ARCHITECTURE.md` — Existing app architecture, data flow
- `.planning/codebase/CONCERNS.md` — C5/C6 race conditions; unused `roleCheck.ts` C7 flagged
- `.planning/research/SUMMARY.md` — Pitfall P5 (auth token hygiene), P1 (unscoped API calls), P7 (session isolation)
- `.planning/ROADMAP.md` §Phase 1 — Deliverables, success criteria

### Tech approach
- [Clerk JWT templates](https://clerk.com/docs/references/jwt/overview) — how to configure short-lived scoped tokens
- [Anthropic Messages API — Tool Use](https://docs.anthropic.com/en/api/messages) — tool_use loop pattern
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/roleCheck.ts` — Two helpers (`isAdmin`, `isStaffOrAdmin`) to be expanded
- `src/lib/dbServer.ts` — InstantDB singleton, used by all routes
- Existing API route pattern: `auth()` → `getUserSetting()` → role → query/transact
- All routes use `export const dynamic = 'force-dynamic'`

### Established Patterns
- Routes return `NextResponse.json()` with typed objects
- Error responses: `{ error: 'message' }` with HTTP status codes
- Role check pattern: inline `if (role !== 'ADMIN') return 403`
- `instantServer.query()` and `instantServer.transact()` for DB access

### Integration Points
- New route: `src/app/api/ai-chatbot/route.ts`
- New files: `src/lib/ai/anthropicService.ts`, `src/lib/ai/toolDefinitions.ts`
- Clerk auth: `auth()` from `@clerk/nextjs/server`
- Clerk token: `getToken({ template: 'gochul-fitness' })` for scoped tokens
</code_context>

<specifics>
## Specific Ideas

No external references — the FEAT_AIBOT.txt and PROGRAM.md docs fully define the API surface and behavior.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---
*Phase: 01-skeleton-architecture*
*Context gathered: 2026-04-04*
