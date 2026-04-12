# Phase 8: UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 08-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 08-ui
**Mode:** discuss

---

## Conflict Resolution: Trigger-Date Modal

Before discussing gray areas, a conflict was surfaced between:
- Phase 7 D-12: activate resets dates to today — no trigger-date modal
- REQUIREMENTS.md UI-02: still references trigger-date modal

**User's choice:** Remove trigger-date modal (align with Phase 7 D-12)

---

## Areas Discussed

### Area 1: Button & Status Labels

| Option | Description | Selected |
|--------|-------------|---------|
| Vietnamese labels | Hủy, Kích hoạt, Mới tạo, Đang hoạt động, Đã hủy, Đã hết hạn | ✓ |
| English labels (keep current) | Cancel, Activate, Newly Created, Active, Canceled, Expired | |

**User's choice:** Vietnamese labels

---

### Area 2: Cancel Confirmation Dialog

| Option | Description | Selected |
|--------|-------------|---------|
| Yes, show confirmation (recommended) | AlertDialog before API call | ✓ |
| No, call API immediately | Instant cancel | |

**User's choice:** Yes, show confirmation

---

### Area 3: Activate UX

| Option | Description | Selected |
|--------|-------------|---------|
| Loading state, then disappear (recommended) | Spinner while API call in-flight, button gone when contract becomes ACTIVE | ✓ |
| Immediate with toast | Call API immediately, success toast | |

**User's choice:** Loading state, then disappear

---

## Decisions Captured

- Vietnamese labels throughout: buttons and status text
- Cancel requires AlertDialog confirmation
- Activate: loading spinner → disappears when ACTIVE
- Old trigger-date modal code in ContractCard.tsx must be removed (Phase 7 D-12)
- Most `statusUtils.ts` functions already correct — only label text needs updating
