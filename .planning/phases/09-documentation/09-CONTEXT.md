# Phase 9: Documentation - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Update `docs/PROGRAM.md` and `.cursor/rules/gochul-fitness-rules.mdc` to reflect the simplified 4-state contract model (NEWLY_CREATED → ACTIVE → CANCELED/EXPIRED). This is documentation-only — no code changes. Phases 6–8 handled the data migration, type/API changes, and UI updates respectively.

</domain>

<decisions>
## Implementation Decisions

### Lifecycle diagram format
- **D-01:** Keep ASCII diagram — consistent with the rest of PROGRAM.md, no new dependencies

### Expiry rules clarity
- **D-02:** Expiry section must explicitly state: "Contracts in `NEWLY_CREATED` status do not auto-expire — they remain in `NEWLY_CREATED` until manually activated (`→ ACTIVE`) or canceled (`→ CANCELED`). Only `ACTIVE` contracts follow the `ACTIVE → EXPIRED` path."
- **D-03:** The old expiry description (transitions through intermediate states) is replaced with the direct `ACTIVE → EXPIRED` path

### Cursor rules update strategy
- **D-04:** Remove deprecated content entirely from `.cursor/rules/gochul-fitness-rules.mdc` — do NOT renumber sections to close gaps
- **D-05:** Sections containing `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, or `PT_CONFIRMED` must be removed or rewritten to remove these values
- **D-06:** Specific locations to update (approximately):
  - ContractStatus type definition (remove deprecated values, keep: `NEWLY_CREATED`, `ACTIVE`, `CANCELED`, `EXPIRED`)
  - State machine / lifecycle transition rules (remove deprecated paths)
  - RBAC / permission rules that reference deprecated statuses
- **D-07:** After removal, gaps in section numbering are expected and acceptable

### Migration history note
- **D-08:** PROGRAM.md must include a brief migration note — e.g., a "v1.1 Changes" box or inline note: "In v1.1 (2026-04), the contract flow was simplified from 6 states to 4. The statuses `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, and `PT_CONFIRMED` were removed. Existing contracts in those states were migrated to `ACTIVE`."
- **D-09:** This note should appear in the Contract Lifecycle section, above or below the diagram — visible but not obscuring the current model

### Already Correct (no changes needed)
- **D-10:** All RBAC transition table rows for `STAFF/ADMIN → NEWLY_CREATED → CANCELED` and `CUSTOMER → NEWLY_CREATED → ACTIVE` are already in PROGRAM.md (Phase 8 confirmed)
- **D-11:** `ADMIN → ACTIVE → CANCELED` (force-cancel) already preserved in Phase 8 decisions
- **D-12:** Session history lifecycle (`NEWLY_CREATED → CHECKED_IN`, side branches to `CANCELED`/`EXPIRED`) is unchanged — no updates needed

### Scope: what is NOT in this phase
- **D-13:** v1.0 AI chatbot documentation — deferred to future milestone (chatbot not updated in v1.1)
- **D-14:** InstantDB schema changes — `ContractStatus` type in `src/app/type/api/index.ts` already updated in Phase 7 (no further schema changes needed)
- **D-15:** No changes to `src/theme/colors.ts` or UI component code — purely documentation

### Claude's Discretion
- Exact wording and placement of the migration note in PROGRAM.md (above/below diagram, boxed note, or inline paragraph)
- Exact wording of the expiry rule clarification
- Whether the cursor rules file renumbers any OTHER sections that reference deprecated statuses (e.g., if section 5 references status X which is removed, it's already covered by D-04/D-05)
- Whether to add a brief comment in the TypeScript source files (e.g., `statusUtils.ts`) noting the simplified model

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 8 decisions (label language, buttons, badges)
- `.planning/phases/08-ui/08-CONTEXT.md` — Vietnamese labels, AlertDialog confirmation, phase scope

### Phase 7 decisions (types, API transitions)
- `.planning/phases/07-type-api/07-CONTEXT.md` — ContractStatus union, transition guards, validStatuses
- `src/app/type/api/index.ts` — Current ContractStatus type definition

### Phase 6 decisions (data migration)
- `.planning/phases/06-data-migration/06-CONTEXT.md` — MIGRATE-01–04 scope, `start_date` preservation

### Requirements trace
- `.planning/REQUIREMENTS.md` §Documentation — DOCS-01 through DOCS-04
- `.planning/ROADMAP.md` §Phase 9 — phase goal, success criteria, what to do

### Files to update
- `docs/PROGRAM.md` — lifecycle diagram, RBAC table, expiry rules, migration note
- `.cursor/rules/gochul-fitness-rules.mdc` — contract lifecycle section, status values, RBAC rules

### Design system (no changes but referenced)
- `src/theme/colors.ts` — canonical design tokens (used in cursor rules section 2)

### Project conventions
- `.planning/codebase/CONVENTIONS.md` — documentation standards, naming conventions
- `.planning/codebase/STRUCTURE.md` — file locations, component inventory

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/statusUtils.ts` — contains all `getContractStatusText()`, `getContractActionButtons()`, etc. — these labels are the authoritative reference for what the docs should describe
- Phase 8 confirmed all labels in Vietnamese: `'Mới tạo'`, `'Đang hoạt động'`, `'Đã hủy'`, `'Đã hết hạn'`

### Established Patterns
- PROGRAM.md convention: ASCII diagrams, numbered sections, tables for RBAC — maintain this style
- Cursor rules convention: numbered sections (0, 1, 2, ...) with `## N)` headers — maintain this style, don't renumber after removals
- Migration notes in PROGRAM.md: not currently a pattern, but the user has decided to add one — place it in §6 (Contract Workflow Lifecycle)

### Integration Points
- PROGRAM.md §6: Contract Workflow Lifecycle — main section to update (diagram, transitions, expiry)
- PROGRAM.md §4: RBAC — update transition table rows
- PROGRAM.md §5: Expired Rules — update to reflect direct ACTIVE → EXPIRED path
- Cursor rules: find all occurrences of deprecated status strings and update/remove them

</code_context>

<specifics>
## Specific Ideas

- Migration note format: "v1.1 Change (2026-04): ..." in a visually distinct block (e.g., indented or italicized)
- Expiry rule text: "A contract in `NEWLY_CREATED` does not expire automatically — it remains pending until the customer activates it or a staff/admin cancels it. Only `ACTIVE` contracts can reach `EXPIRED`."
- Cursor rules: after removing deprecated content, add a comment noting the removal e.g., `# [v1.1] Removed: CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, PT_CONFIRMED`

</specifics>

<deferred>
## Deferred Ideas

### AI chatbot docs not updated
DOCS-01–04 scope is limited to `docs/PROGRAM.md` and cursor rules. The AI chatbot system prompt, tool definitions, and formatter functions are not updated in this phase. The v1.0 chatbot docs in `docs/FEAT_AIBOT.txt` and `AGENTS.md` are also not touched. These should be updated in a future milestone once the chatbot is tested with the new contract flow.

</deferred>

---

*Phase: 09-documentation*
*Context gathered: 2026-04-12*
