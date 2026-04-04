---
phase: 01
slug: skeleton-architecture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual (curl + Node.js test script) |
| **Config file** | None — test scripts created as Wave 0 |
| **Quick run command** | `bash scripts/test-phase1-auth.sh` |
| **Full suite command** | `bash scripts/test-phase1-all.sh` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run auth quick-check (`curl -s -o /dev/null -w "%{http_code}"`)
- **After every plan wave:** Run full test suite (`bash scripts/test-phase1-all.sh`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | API-12 | manual/curl | `curl -X POST /api/ai-chatbot -d '{}'` → 401 | ✅ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | API-12 | manual/curl | `curl -X POST /api/ai-chatbot -H "Cookie: __session=<token>" -d '{}'` → 200 | ✅ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | API-11 | manual/curl | Role resolution in response JSON | ✅ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | API-11, API-12 | unit/tsc | `grep "TOOL_DEFINITIONS.length === 10" test` | ✅ W0 | ⬜ pending |
| 01-01-05 | 01 | 1 | API-12 | manual/curl | Auth forwarding debug endpoint test | ✅ W0 | ⬜ pending |
| 01-01-06 | 01 | 1 | API-12 | grep | `grep -r "console.*token\|console.*clerk" src/lib/ai/ src/app/api/ai-chatbot/` → empty | ✅ W0 | ⬜ pending |
| 01-01-07 | 01 | 1 | API-11, API-12 | build | `next build` — no server-only violations | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-phase1-auth.sh` — Tests criteria 1, 2 (HTTP 401/200, role resolution)
- [ ] `scripts/test-phase1-auth-forwarding.sh` — Tests criterion 4 (token forwarding)
- [ ] `scripts/test-token-hygiene.sh` — Tests criterion 6 (grep-based token hygiene check)
- [ ] `scripts/test-tool-definitions.ts` — Tests criterion 3 (TS build + 10-tool count)
- [ ] `scripts/test-server-only.ts` — Tests criterion 7 (TypeScript + server-only package)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clerk JWT template existence in Clerk Dashboard | API-12 | Requires Clerk Dashboard access | 1. Go to clerk.com → Dashboard → JWT Templates. 2. Verify `gochul-fitness` template exists with 5-min lifetime. 3. If missing, create it. |
| System prompt contains role context + tools | API-11 | Requires inspecting generated prompt string | 1. Call `buildSystemPrompt()` directly in a Node script. 2. Verify output contains user role, RBAC matrix, and tool descriptions. |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
