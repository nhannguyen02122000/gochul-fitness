# GoChul Fitness AI Chatbot — Roadmap

**Created:** 2026-04-04
**Updated:** 2026-04-12
**Version:** v1.1 ✅ SHIPPED 2026-04-12

---

## Milestones

- ✅ **v1.0 MVP** — AI Chatbot (shipped 2026-04-10)
- ✅ **v1.1** — Enhance Contract Flow (4/4 phases complete — shipped 2026-04-12)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–5) — SHIPPED 2026-04-10</summary>

- [x] Phase 1: Skeleton & Architecture — completed 2026-04-04
- [x] Phase 2: Client Shell — completed 2026-04-04
- [x] Phase 3: Wire API Route to Client — completed 2026-04-04
- [x] Phase 4: Multi-Turn + Tool-Use Loop — completed 2026-04-04
- [x] Phase 5: Polish — completed 2026-04-04

**Full details:** `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Enhance Contract Flow (Phases 6–9) — SHIPPED 2026-04-12</summary>

> **Critical ordering:** Phase 6 (Data Migration) MUST run before the new TypeScript code ships. Existing contracts in removed states will break at runtime if migration is skipped. Migration is a pre-flight step that sets deprecated statuses to `ACTIVE` before any other phase deploys.

**Requirement coverage:** 25/25 ✓

---

### Phase 6: Data Migration

**Goal:** Backfill existing contracts from removed intermediate states → `ACTIVE` so the codebase is clean when TypeScript types change.

**Requirements:** MIGRATE-01, MIGRATE-02, MIGRATE-03, MIGRATE-04

**Key files to modify:**
- `src/app/api/admin/backfillTimestamps/` — extend or create a dedicated migration endpoint (e.g. `src/app/api/admin/migrateContractStatuses/route.ts`)
- Alternatively: standalone migration script using `@instantdb/admin`

**What to do:**
1. Query all contracts where `status ∈ {CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, PT_CONFIRMED}`
2. For each contract, set `status = 'ACTIVE'` (preserve existing `start_date` and all other fields)
3. Run as a one-time admin-only API call or script before Phase 7 deploys
4. Verify count of updated contracts matches expectations

**Success criteria:**
- [ ] `CUSTOMER_REVIEW` contracts: status → `ACTIVE`, `start_date` unchanged ✓
- [ ] `CUSTOMER_CONFIRMED` contracts: status → `ACTIVE`, `start_date` unchanged ✓
- [ ] `CUSTOMER_PAID` contracts: status → `ACTIVE`, `start_date` unchanged ✓
- [ ] `PT_CONFIRMED` contracts: status → `ACTIVE`, `start_date` unchanged ✓
- [ ] Migration runs before TypeScript types in Phase 7 are deployed ✓

---

### Phase 7: Type & API

**Goal:** Remove 4 deprecated `ContractStatus` values from TypeScript types; add transition guards for `NEWLY_CREATED → ACTIVE` (CUSTOMER) and `NEWLY_CREATED → CANCELED` (STAFF/ADMIN); expose `NEWLY_CREATED` to CUSTOMER.

**Requirements:** TYPE-01, API-01, API-02, API-03, API-04, API-05, API-06, API-07

**Key files to modify:**
- `src/app/type/api/index.ts` — `ContractStatus` union type
- `src/app/api/contract/updateStatus/route.ts` — validStatuses array + transition guards
- `src/app/api/history/create/route.ts` — ACTIVE-only session creation guard

**What to do:**
1. `ContractStatus` union: remove `CUSTOMER_REVIEW | CUSTOMER_CONFIRMED | CUSTOMER_PAID | PT_CONFIRMED`; keep `NEWLY_CREATED | ACTIVE | CANCELED | EXPIRED`
2. Update `validStatuses` array in `updateStatus/route.ts` to match new type
3. Add transition `NEWLY_CREATED → CANCELED` for STAFF and ADMIN roles
4. Add transition `ACTIVE → CANCELED` for ADMIN (preserve existing force-cancel)
5. Add transition `NEWLY_CREATED → ACTIVE` for CUSTOMER role (the activate path)
6. In `canViewContract()` or equivalent: CUSTOMER can see `NEWLY_CREATED` contracts
7. Session creation: confirm contract `status === 'ACTIVE'` guard is present

**Success criteria:**
- [ ] TypeScript compilation: no references to 4 removed status values in type definitions ✓
- [ ] `updateStatus`: STAFF can cancel `NEWLY_CREATED` contracts via API ✓
- [ ] `updateStatus`: ADMIN can cancel `NEWLY_CREATED` and `ACTIVE` contracts via API ✓
- [ ] `updateStatus`: CUSTOMER can activate `NEWLY_CREATED` contracts via API ✓
- [ ] Session creation: returns error if contract is not `ACTIVE` ✓
- [ ] CUSTOMER role can list/view `NEWLY_CREATED` contracts via API ✓

---

### Phase 8: UI ✅ COMPLETE

**Goal:** Update all UI components to reflect the 2-state model — red Cancel button for ADMIN/STAFF on `NEWLY_CREATED`, green Activate button for CUSTOMER on `NEWLY_CREATED`, correct status badges, correct utility function outputs.

**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08 — all ✅ Complete

**Key files modified:**
- `src/utils/statusUtils.ts` — Vietnamese labels for buttons and status badges
- `src/components/cards/ContractCard.tsx` — Cancel confirmation dialog (removed trigger-date modal), direct activate call for CUSTOMER

**Success criteria:**
- [x] ADMIN/STAFF sees "Hủy" button + confirmation popup on `NEWLY_CREATED` contracts ✓
- [x] CUSTOMER sees "Kích hoạt" button on `NEWLY_CREATED` contracts ✓
- [x] Trigger-date modal removed; server resets dates on activate ✓
- [x] `getContractActionButtons()` returns correct buttons per role for all 4 statuses ✓
- [x] Status badges use Vietnamese text: 'Mới tạo', 'Đang hoạt động', 'Đã hủy', 'Đã hết hạn' ✓
- [x] `isPreActiveContractStatus()` returns `true` only for `NEWLY_CREATED` ✓
- [x] CUSTOMER can see `NEWLY_CREATED` contracts in list view ✓

---

### Phase 9: Documentation ✅ COMPLETE

**Goal:** Keep `docs/PROGRAM.md` and `.cursor/rules/gochul-fitness-rules.mdc` in sync with the 2-state contract model.

**Requirements:** DOCS-01, DOCS-02, DOCS-03, DOCS-04 — all ✅ Complete

**Key files modified:**
- `docs/PROGRAM.md` — lifecycle diagram, RBAC transition table (5 rows), expiry rules, migration note, Appendix ContractStatus type
- `.cursor/rules/gochul-fitness-rules.mdc` — contract lifecycle section, action-button rules, auto-expire rules; removed deprecated ContractCard display block

**Success criteria:**
- [x] PROGRAM.md lifecycle diagram shows only `NEWLY_CREATED`, `ACTIVE`, `CANCELED`, `EXPIRED` ✓
- [x] PROGRAM.md RBAC table has no entries for `CUSTOMER_REVIEW`, `CUSTOMER_CONFIRMED`, `CUSTOMER_PAID`, `PT_CONFIRMED` ✓
- [x] PROGRAM.md expiry rules describe `ACTIVE → EXPIRED` path only; NEWLY_CREATED non-expiry note added ✓
- [x] cursor/rules reflect new type, transitions, and role permissions ✓
- [x] v1.1 migration note present in §6 ✓

---

</details>

---

## Next

No next milestone planned. Run `/gsd:new-milestone` to start the next milestone.
