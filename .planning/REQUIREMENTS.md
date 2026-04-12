# Requirements: GoChul Fitness v1.1

**Defined:** 2026-04-10
**Updated:** 2026-04-10 (roadmap created)
**Core Value:** Simplify contract lifecycle from 6 states to 4 — customers activate directly, staff cancel with confirmation.

## v1.1 Requirements

Requirements for v1.1 milestone. Each maps to roadmap phases.

### Data Migration

- [ ] **MIGRATE-01**: Data migration script sets `CUSTOMER_REVIEW` contracts to `ACTIVE` (with existing `start_date` preserved)
- [ ] **MIGRATE-02**: Data migration script sets `CUSTOMER_CONFIRMED` contracts to `ACTIVE` (with existing `start_date` preserved)
- [ ] **MIGRATE-03**: Data migration script sets `CUSTOMER_PAID` contracts to `ACTIVE` (with existing `start_date` preserved)
- [ ] **MIGRATE-04**: Data migration script sets `PT_CONFIRMED` contracts to `ACTIVE` (with existing `start_date` preserved)

### Type & API

- [x] **TYPE-01**: `ContractStatus` union type removes `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` (kept: `NEWLY_CREATED`, `ACTIVE`, `CANCELED`, `EXPIRED`)
- [x] **API-01**: STAFF can transition `NEWLY_CREATED` → `CANCELED` (cancel)
- [x] **API-02**: ADMIN can transition `NEWLY_CREATED` → `CANCELED` (cancel)
- [x] **API-03**: ADMIN can transition `ACTIVE` → `CANCELED` (force-cancel, existing behavior preserved)
- [x] **API-04**: CUSTOMER can transition `NEWLY_CREATED` → `ACTIVE` (activate)
- [x] **API-05**: `updateStatus` `validStatuses` array removes deprecated status values
- [x] **API-06**: CUSTOMER can view contracts with status `NEWLY_CREATED` (previously hidden)
- [x] **API-07**: Session creation guard: contract must be `ACTIVE` (guard unchanged but path simplified)

### UI

- [x] **UI-01**: ADMIN/STAFF sees red "Hủy" (Cancel) button on `NEWLY_CREATED` contracts with confirmation popup before calling API
- [x] **UI-02**: CUSTOMER sees "Kích hoạt" (Activate) button on `NEWLY_CREATED` contracts — if `start_date` is not today, shows trigger-date modal (existing AlertDialog logic)
- [x] **UI-03**: `getContractActionButtons()` returns correct buttons per role for `NEWLY_CREATED` and `ACTIVE` only
- [x] **UI-04**: `getContractStatusVariant()` maps `NEWLY_CREATED` and `ACTIVE` to correct badge styles; removed statuses return `undefined` or error variant
- [x] **UI-05**: `getContractStatusText()` returns correct label for `NEWLY_CREATED` and `ACTIVE`
- [x] **UI-06**: Status badges only render for valid statuses (no broken/missing mappings for removed types)
- [x] **UI-07**: `isPreActiveContractStatus()` returns `true` only for `NEWLY_CREATED`
- [x] **UI-08**: `canViewContract()` returns `true` for CUSTOMER on `NEWLY_CREATED` (previously returned `false`)

### Documentation

- [ ] **DOCS-01**: `docs/PROGRAM.md` contract lifecycle diagram updated to show 4-state model
- [ ] **DOCS-02**: `docs/PROGRAM.md` RBAC transition table updated (only valid transitions per role)
- [ ] **DOCS-03**: `docs/PROGRAM.md` expiry rules updated for 4-state model
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

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIGRATE-01 | Phase 6 | Pending |
| MIGRATE-02 | Phase 6 | Pending |
| MIGRATE-03 | Phase 6 | Pending |
| MIGRATE-04 | Phase 6 | Pending |
| TYPE-01 | Phase 7 | Complete |
| API-01 | Phase 7 | Complete |
| API-02 | Phase 7 | Complete |
| API-03 | Phase 7 | Complete |
| API-04 | Phase 7 | Complete |
| API-05 | Phase 7 | Complete |
| API-06 | Phase 7 | Complete |
| API-07 | Phase 7 | Complete |
| UI-01 | Phase 8 | Complete |
| UI-02 | Phase 8 | Complete |
| UI-03 | Phase 8 | Complete |
| UI-04 | Phase 8 | Complete |
| UI-05 | Phase 8 | Complete |
| UI-06 | Phase 8 | Complete |
| UI-07 | Phase 8 | Complete |
| UI-08 | Phase 8 | Complete |
| DOCS-01 | Phase 9 | Pending |
| DOCS-02 | Phase 9 | Pending |
| DOCS-03 | Phase 9 | Pending |
| DOCS-04 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---

*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after roadmap created*
