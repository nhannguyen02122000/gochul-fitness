# Project Research Summary

**Project:** GoChul Fitness — Contract Lifecycle Simplification (v1.1)
**Domain:** Contract state machine reduction — 6-state → 2-state lifecycle
**Researched:** 2026-04-10
**Confidence:** HIGH

---

## Executive Summary

This is a **state machine reduction**, not a technology addition. The current 6-state contract flow (`NEWLY_CREATED → CUSTOMER_REVIEW → CUSTOMER_CONFIRMED → CUSTOMER_PAID → PT_CONFIRMED → ACTIVE`) collapses to a 2-state flow (`NEWLY_CREATED → ACTIVE`), with terminal states `CANCELED` and `EXPIRED` unchanged. No new libraries are needed — the work is purely in typing, API logic, UI utilities, and AI layer. Confidence is HIGH because the change is a strict removal: TypeScript compile errors will force all consumers to update simultaneously, making accidental retention of removed statuses impossible.

The primary implementation risk is **legacy contracts** in InstantDB currently occupying removed statuses — these have no valid transition path under the new model and must be migrated before deployment. The primary UX risk is **customers seeing an empty contract list** if the `NEWLY_CREATED` visibility filter for CUSTOMER role is not inverted in the same deployment as the simplified flow ships.

---

## Key Findings

### Recommended Stack

**No new stack required.** The app already has all required capabilities. Zero package additions, zero architecture shifts.

**Core technologies (existing, unchanged):**
- **TypeScript union types** (`ContractStatus`): single source of truth; removing values from the union forces compiler errors across all consumers
- **Next.js API routes**: role-gated transition enforcement in `updateStatus/route.ts` — the authoritative gate for both web UI and AI chatbot
- **TanStack Query + InstantDB**: no changes to data fetching or caching patterns
- **AI chatbot (`@anthropic-ai/sdk`)**: tool-use pattern; only tool schemas and system prompts need updating

### Expected Features

**Must have (table stakes) — all P1:**
- Customer can see `NEWLY_CREATED` contracts immediately after STAFF creates them (currently hidden — must invert filter)
- Customer can activate contract with one click on `NEWLY_CREATED` (move existing "Activate" button from `PT_CONFIRMED`)
- ADMIN/STAFF can cancel `NEWLY_CREATED` contracts with red confirmation popup (already built; extend to `NEWLY_CREATED`)
- Session booking only on `ACTIVE` contracts (guard already correct — `status === 'ACTIVE'`)
- Auto-expiry by date for `NEWLY_CREATED` contracts (Rule C1; simplify from 5-state to 1-state check)
- Credit tracking display (unchanged)

**Should have (v1.1, P2):**
- Trigger-date activation modal preserved — existing `AlertDialog` + date-adjustment logic works correctly; trigger changes from `PT_CONFIRMED` → `NEWLY_CREATED`
- AI chatbot stays consistent — system prompt and tool definitions updated to reflect 2-state lifecycle

**Defer (v2+):**
- Payment integration (MoMo/VNPay) — out of scope; handled in-person
- Multiple active contracts per customer guard — add warning when customer activates second active contract

### Architecture Approach

The app follows a layered architecture where `ContractStatus` union type is the **single source of truth** enforced at the type level, `updateStatus/route.ts` is the **authoritative enforcement gate** for both web UI and AI chatbot, and `statusUtils.ts` is the **pure utility layer** between the type and UI components.

**Major components (all modified):**
1. **`src/app/type/api/index.ts`** — Remove 4 statuses from `ContractStatus` union; forces TypeScript errors across all consumers
2. **`src/app/api/contract/updateStatus/route.ts`** — Collapse role guards from 8-state to 2-state logic; update `validStatuses` array
3. **`src/app/api/contract/getAll/route.ts`** — Remove removed statuses from `CONTRACT_STATUS_VALUES`; invert `NEWLY_CREATED` filter for CUSTOMER
4. **`src/utils/statusUtils.ts`** — Rewrite `getContractActionButtons`, `isPreActiveContractStatus`, `canViewContract`, `getContractStatusText/Variant`, `CONTRACT_STATUS_ICON`
5. **`src/components/cards/ContractCard.tsx`** — Wire CANCELED red confirmation popup; rest auto-corrects from utility changes
6. **`src/lib/ai/toolDefinitions.ts` + `systemPrompt.ts`** — Trim tool enum; update RBAC description
7. **`docs/PROGRAM.md` + `.cursor/rules/gochul-fitness-rules.mdc`** — Update lifecycle diagram, RBAC tables, expiry rules

**New components:** None. This is a pure reduction.

### Critical Pitfalls

1. **Legacy contracts stuck in removed intermediate states** — Contracts in `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, or `PT_CONFIRMED` have no valid path under the new model. A one-time ADMIN migration script must backfill them to `ACTIVE` (if `end_date >= now`) or `CANCELED` (if expired/abandoned) before deployment. Phase 1 must precede all code changes.

2. **AI chatbot still mentions or proposes removed statuses** — Tool enum must be trimmed before deployment. If the AI generates an old status value, the API rejects it (400), producing a confusing user-facing error. Update tool schemas and system prompt in the same deployment as the API.

3. **UI renders ghost buttons that call APIs returning 403** — `getContractActionButtons` must be rewritten to only return "Activate" (CUSTOMER on `NEWLY_CREATED`) and "Cancel" (ADMIN/STAFF on `NEWLY_CREATED`). Failing to update this function means buttons call the API for removed transitions and fail silently.

4. **`validStatuses` in `updateStatus` route not updated alongside TypeScript type** — Type-only changes don't update runtime arrays. The route will still accept removed status values at runtime while TypeScript compiles cleanly. Always update TypeScript types AND runtime arrays in the same PR.

5. **Customer visibility filter still excludes `NEWLY_CREATED`** — If the `getAll` route still filters out `NEWLY_CREATED` for CUSTOMER, customers see an empty contract list after STAFF creates a contract. The exclusion must be removed in the same deployment that ships the simplified flow.

---

## Implications for Roadmap

### Phase 1: Data Migration
**Rationale:** Legacy contracts in removed statuses have no valid path under the new 2-state model. This must be resolved before any code ships — otherwise users will see contracts with no valid action buttons.
**Delivers:** `POST /api/admin/backfillContractStatuses` migration script with dry-run mode; all contracts in `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` backfilled to `ACTIVE` or `CANCELED`
**Addresses:** P1 — Legacy contracts stuck in removed states (critical blocker)
**Avoids:** Phase 4 pitfall (stale UI), Phase 5 pitfall (session creation fails on legacy contracts)

### Phase 2: Type + API Simplification
**Rationale:** Types and API routes are the foundation. Changes here force TypeScript compile errors across all consumers, ensuring nothing is missed.
**Delivers:** `ContractStatus` union updated; `updateStatus/route.ts` role guards collapsed to 2-state; `validStatuses` array trimmed; `isPreActiveContractStatus` simplified; session creation guard confirmed as `status === 'ACTIVE'` only
**Uses:** TypeScript union type as enforcement mechanism
**Implements:** Role-gated transition matrix pattern
**Research flags:** Low risk — standard Next.js API route patterns

### Phase 3: UI + Customer Visibility
**Rationale:** UI derives from utility functions (`statusUtils.ts`) — updating the utilities propagates correct behavior to all components simultaneously. Customer visibility fix must land in the same deployment as the simplified flow.
**Delivers:** `getContractActionButtons` returns only "Activate" (CUSTOMER) and "Cancel" (ADMIN/STAFF); `canViewContract` allows CUSTOMER on `NEWLY_CREATED`; status badge/text/icon maps trimmed; `ContractCard` red cancel popup wired
**Uses:** `statusUtils.ts` pure utility pattern
**Implements:** UI Derives from Pure Utility Functions pattern
**Research flags:** Low risk — well-established component patterns

### Phase 4: AI Chatbot Alignment
**Rationale:** The chatbot is an alternative interface to the same API. If it ships with old tool schemas, it will propose removed transitions and receive 400 errors. Must ship in the same deployment as the API simplification.
**Delivers:** `update_contract_status` tool enum trimmed; system prompt RBAC section updated; `translateError()` defensive handler for any accidental old status values
**Research flags:** MEDIUM — AI behavior not fully predictable; test with conversation prompts that reference old statuses ("Where's my contract? I already confirmed it.")

### Phase 5: Documentation
**Rationale:** Maintenance rulebook and PROGRAM.md are the source of truth for runtime behavior. Future developers and AI agents rely on these documents.
**Delivers:** PROGRAM.md lifecycle diagram + RBAC tables + expiry rules updated; `.cursor/rules/gochul-fitness-rules.mdc` updated; `docs/v1.1-enhance-contract-flow.md` archived
**Avoids:** Anti-pattern: inconsistent documentation updates

### Phase Ordering Rationale

- **Phase 1 before everything else:** Legacy data migration is a prerequisite — you cannot safely simplify the state machine while legacy contracts occupy removed states.
- **Phase 2 (types + API) before Phase 3 (UI):** TypeScript compile errors in Phase 3 force correct API usage. The compiler is the enforcement mechanism.
- **Phase 4 (AI) in parallel with Phase 3 or immediately after:** AI chatbot tool schemas must be updated before deployment. The AI chatbot is a full interface to the same API.
- **Phase 5 (docs) last:** Docs must reflect the completed implementation, not the intended implementation.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** InstantDB schema compatibility — needs verification that admin token can perform batch transactions without triggering Ably realtime events (would cause thousands of cache invalidations). Mitigation: run migration during off-peak hours with batching.
- **Phase 4:** AI model behavior — community consensus that enum trimming works, but actual model output depends on prompt engineering; may need iterative testing.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Well-documented TypeScript + Next.js patterns
- **Phase 3:** Established React component + pure utility function patterns
- **Phase 5:** Documentation update is a known task

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new stack; all changes are TypeScript/Next.js/InstantDB modifications. Standard, well-understood patterns. |
| Features | HIGH | Table-stakes features are clear. Competitor analysis confirms 2-state is more streamlined than market leaders (Mindbody, GymMaster, Vagaro retain at least a review step). Trigger-date modal is a genuine differentiator. |
| Architecture | HIGH | Layered architecture (type → API → utility → component) is proven. Role-gated transition matrix pattern already in codebase. |
| Pitfalls | HIGH | 8 pitfalls identified with clear prevention steps and a "Looks Done But Isn't" checklist providing verifiable acceptance criteria. |

**Overall confidence:** HIGH

### Gaps to Address

- **InstantDB migration script execution:** The admin API token must have permission to run a large batch transaction. Needs verification that the `backfillContractStatuses` script won't trigger Ably realtime events for each contract (which would cause thousands of cache invalidations). Mitigation: run migration during off-peak hours with batching.
- **AI chatbot behavioral testing:** Actual model output after prompt changes is not fully predictable. Phase 4 should include conversation test cases: "Where's my contract?" (should not mention removed statuses), "How do I activate?" (should describe simplified flow), "I already confirmed payment" (should handle gracefully without referring to `CUSTOMER_PAID`).

---

## Sources

### Primary (HIGH confidence)
- `src/app/type/api/index.ts` — current `ContractStatus` union type
- `src/app/api/contract/updateStatus/route.ts` — current transition enforcement logic
- `src/utils/statusUtils.ts` — current button logic, badge variants, visibility checks
- `src/components/cards/ContractCard.tsx` — current button rendering + confirmation dialog
- `docs/PROGRAM.md` — existing contract lifecycle, RBAC tables, expiry rules

### Secondary (HIGH confidence)
- `src/lib/ai/toolDefinitions.ts` — Anthropic tool schemas
- `src/lib/ai/systemPrompt.ts` — AI role constraints narrative
- `docs/v1.1-enhance-contract-flow.md` — v1.1 requirement from founder
- `.planning/research/STACK.md` — stack research, 2026-04-10
- `.planning/research/ARCHITECTURE.md` — architecture research, 2026-04-10
- `.planning/research/FEATURES.md` — feature research, 2026-04-10
- `.planning/research/PITFALLS.md` — pitfalls research, 2026-04-10

### Tertiary (MEDIUM confidence)
- Competitor feature analysis (Mindbody, GymMaster, Vagaro) — general market context; not used for implementation decisions

---

*Research completed: 2026-04-10*
*Ready for roadmap: yes*
