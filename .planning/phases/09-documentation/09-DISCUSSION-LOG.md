# Phase 9: Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 09-documentation
**Mode:** discuss
**Areas discussed:** Diagram + expiry clarity, Rules file structure, Migration history in docs

---

## Diagram + expiry clarity

### Q1a: Lifecycle diagram format

| Option | Description | Selected |
|--------|-------------|----------|
| Mermaid (recommended) | Cleaner auto-layouted diagram | |
| ASCII (current) | Keep ASCII like the rest of PROGRAM.md. Simple, no dependencies, works everywhere | ✓ |

**User's choice:** ASCII (current)
**Notes:** Keep ASCII for consistency with the rest of PROGRAM.md — no new dependencies introduced.

---

### Q1b: Expiry rules clarity

| Option | Description | Selected |
|--------|-------------|----------|
| Be explicit | Add a sentence clarifying NEWLY_CREATED never auto-expires — prevents any ambiguity about stale pending contracts | ✓ |
| Implicit (no change) | The state diagram makes this clear enough — don't need to spell it out | |

**User's choice:** Be explicit
**Notes:** Explicitly state that NEWLY_CREATED contracts do not auto-expire — must be manually activated or canceled.

---

## Rules file structure

### Cursor rules update strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Remove (keep gaps) | Delete deprecated sections. Keep section numbers as-is — gaps are fine, keeps renumbering work minimal | ✓ |
| Renumber | Delete deprecated content AND renumber so sections are sequential — cleaner, but more work | |

**User's choice:** Remove (keep gaps)
**Notes:** Gaps in section numbering are acceptable — minimizes renumbering work and makes it obvious what was removed.

---

## Migration history in docs

| Option | Description | Selected |
|--------|-------------|----------|
| Include migration note | Add a brief note: "In v1.1, the contract flow was simplified from 6 states to 4" | ✓ |
| Clean current model only | Only the current, clean model — historical context lives in git history | |

**User's choice:** Include migration note
**Notes:** Add a migration note in the Contract Lifecycle section (PROGRAM.md §6) so future readers understand why the model changed.

---

## Gray areas skipped (decided via prior context)

- **Label language** — already decided in Phase 8 (D-01): Vietnamese for user-facing UI
- **RBAC transition table rows** — already confirmed correct in Phase 8 (D-08 through D-15)
- **Session history lifecycle** — unchanged (DOCS-01–04 scope doesn't cover sessions)

## Claude's Discretion

- Exact wording/placement of the migration note in PROGRAM.md
- Exact wording of the expiry rule clarification
- Whether cursor rules file renumbers OTHER sections that reference deprecated statuses
- Whether to add brief source-code comments in `statusUtils.ts` noting the simplified model

## Deferred Ideas

- AI chatbot docs (FEAT_AIBOT.txt, AGENTS.md, chatbot system prompt) — deferred to future milestone
- InstantDB schema (already done in Phase 7 — no further changes needed)
