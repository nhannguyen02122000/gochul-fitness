# Requirements: GoChul Fitness v1.1

**Defined:** 2026-04-10
**Core Value:** Simplify contract lifecycle from 6 states to 2 states — customers activate directly, staff cancel with confirmation.

## v1.1 Requirements

Requirements for v1.1 milestone. Each maps to roadmap phases.

### Data Migration

- [ ] **MIGRATE-01**: Data migration script sets `CUSTOMER_REVIEW` contracts to `ACTIVE` (with existing `start_date` preserved)
- [ ] **MIGRATE-02**: Data migration script sets `CUSTOMER_CONFIRMED` contracts to `ACTIVE` (with existing `start_date` preserved)
- [ ] **MIGRATE-03**: Data migration script sets `CUSTOMER_PAID` contracts to `ACTIVE` (with existing `start_date` preserved)
- [ ] **MIGRATE-04**: Data migration script sets `PT_CONFIRMED` contracts to `ACTIVE` (with existing `start_date` preserved)

### Type & API

- [ ] **TYPE-01**: `ContractStatus` union type removes `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` (kept: `NEWLY_CREATED`, `ACTIVE`, `CANCELED`, `EXPIRED`)
- [ ] **API-01**: STAFF can transition `NEWLY_CREATED` → `CANCELED` (cancel)
- [ ] **API-02**: ADMIN can transition `NEWLY_CREATED` → `CANCELED` (cancel)
- [ ] **API-03**: ADMIN can transition `ACTIVE` → `CANCELED` (force-cancel, existing behavior preserved)
- [ ] **API-04**: CUSTOMER can transition `NEWLY_CREATED` → `ACTIVE` (activate)
- [ ] **API-05**: `updateStatus` `validStatuses` array removes deprecated status values
- [ ] **API-06**: CUSTOMER can view contracts with status `NEWLY_CREATED` (previously hidden)
- [ ] **API-07**: Session creation guard: contract must be `ACTIVE` (guard unchanged but path simplified)

### UI

- [ ] **UI-01**: ADMIN/STAFF sees red "Hủy" (Cancel) button on `NEWLY_CREATED` contracts with confirmation popup before calling API
- [ ] **UI-02**: CUSTOMER sees "Kích hoạt" (Activate) button on `NEWLY_CREATED` contracts — if `start_date` is not today, shows trigger-date modal (existing AlertDialog logic)
- [ ] **UI-03**: `getContractActionButtons()` returns correct buttons per role for `NEWLY_CREATED` and `ACTIVE` only
- [ ] **UI-04**: `getContractStatusVariant()` maps `NEWLY_CREATED` and `ACTIVE` to correct badge styles; removed statuses return `undefined` or error variant
- [ ] **UI-05**: `getContractStatusText()` returns correct label for `NEWLY_CREATED` and `ACTIVE`
- [ ] **UI-06**: Status badges only render for valid statuses (no broken/missing mappings for removed types)
- [ ] **UI-07**: `isPreActiveContractStatus()` returns `true` only for `NEWLY_CREATED`
- [ ] **UI-08**: `canViewContract()` returns `true` for CUSTOMER on `NEWLY_CREATED` (previously returned `false`)

### Documentation

- [ ] **DOCS-01**: `docs/PROGRAM.md` contract lifecycle diagram updated to show 2-state model
- [ ] **DOCS-02**: `docs/PROGRAM.md` RBAC transition table updated (only valid transitions per role)
- [ ] **DOCS-03**: `docs/PROGRAM.md` expiry rules updated for 2-state model
- [ ] **DOCS-04**: `.cursor/rules/gochul-fitness-rules.mdc` updated with new contract lifecycle and status values

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI chatbot updates (tool definitions, system prompt) | Deferred — chatbot not tested in v1.1 |
| Payment integration (MoMo, VNPay) | In-person payment; out of scope for v1.1 |
| Customer self-cancel on ACTIVE | Orphans booked sessions; ADMIN force-cancel preserved |
| Multiple active contracts per customer guard | Credit ambiguity; defer to v1.2 |
| Staff edit contract fields post-creation | Accounting inconsistency risk |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIGRATE-01 | Phase 1 | Pending |
| MIGRATE-02 | Phase 1 | Pending |
| MIGRATE-03 | Phase 1 | Pending |
| MIGRATE-04 | Phase 1 | Pending |
| TYPE-01 | Phase 2 | Pending |
| API-01 | Phase 2 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| API-05 | Phase 2 | Pending |
| API-06 | Phase 2 | Pending |
| API-07 | Phase 2 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |
| UI-06 | Phase 3 | Pending |
| UI-07 | Phase 3 | Pending |
| UI-08 | Phase 3 | Pending |
| DOCS-01 | Phase 4 | Pending |
| DOCS-02 | Phase 4 | Pending |
| DOCS-03 | Phase 4 | Pending |
| DOCS-04 | Phase 4 | Pending |

**Coverage:**
- v1.1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after initial definition*
