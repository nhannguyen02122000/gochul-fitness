# Phase 4 — Multi-Turn + Tool-Use Loop: Summary

**Executed:** 2026-04-04
**Status:** Tasks 1–2 complete | Tasks 3–9 pending (Wave 2–5)

---

## Tasks Completed

### Task 1 — `src/lib/ai/formatters.ts` ✅

**Commit:** `8d0d2e5` — `feat(chatbot): add server-side result formatters for AI tool loop`

Created a new server-only module with four exported functions and two exported types:

| Export | Description | Requirements |
|--------|-------------|--------------|
| `ToolResult` type | `{ success: true; formatted: string } \| { success: false; formatted: string }` | Shared with `anthropicService.ts` |
| `UserLanguage` type | `'vi' \| 'en'` | For language detection |
| `formatContractList(contracts, pagination)` | Markdown table with kind/credits/money/status/dates | THRD-05 |
| `formatSessionList(sessions, pagination)` | Markdown table with date/time/status/PT-KH notes | THRD-05 |
| `formatActionResult(entity, action, data)` | Structured card for create/update/cancel outcomes | THRD-05 |
| `translateError(rawError, lang)` | Bilingual VI/EN error translation | ERR-01, ERR-02, ERR-04 |

Key implementation notes:
- All date formatting uses `timeZone: 'Asia/Ho_Chi_Minh'` — Vietnam UTC+7
- Currency via `Intl.NumberFormat('vi-VN', { currency: 'VND', minimumFractionDigits: 0 })`
- `translateError` checks `rate limit` keyword first, then HTTP status codes (400/403/404/429/500), with bilingual VI/EN fallback
- `formatTimeRange(from, to)` formats minutes as zero-padded HH:MM (e.g., `"08:00 – 09:30"`)
- File passes `npx tsc --noEmit` with zero errors

---

### Task 2 — `src/lib/ai/systemPrompt.ts` ✅

**Commit:** `cfd4f1a` — `feat(chatbot): add confirmation rule to system prompt for write actions`

Appended a new `## CONFIRMATION RULE` section to `buildSystemPrompt()` immediately before the final `.trim()` call:

```
## CONFIRMATION RULE

Before calling any CREATE, UPDATE (except update_session_note), or DELETE tool:
1. STOP the tool loop and return a confirmation proposal to the user.
2. Clearly state: what action will be taken, with what parameters.
3. Ask the user to confirm by clicking "Confirm" or replying "yes/đồng ý/ok".
4. If the user replies "no/không/cancel", do NOT call the tool. Acknowledge and stop.
5. When a user message contains the prefix "CONFIRMED:" it means the user has
   confirmed the last proposal. Execute the pending write action immediately.

Example proposal format:
"Tôi sẽ tạo hợp đồng PT cho **Nguyễn Văn A**, gói **10 buổi**, giá **1,500,000 VND**.
 Bạn xác nhận không?"
```

Covers requirements: **LOOP-03** (confirm before writes), **LOOP-04** (ambiguous input handling via explicit confirmation flow).

File passes `npx tsc --noEmit` with zero errors.

---

## Tasks Remaining (Wave 2–5)

| # | Task | File | Key Deliverables |
|---|------|------|-----------------|
| 3 | Implement `callClaudeWithTools()` + `executeTool()` | `src/lib/ai/anthropicService.ts` | while loop, 10-iteration cap, retry, all 10 tool dispatches |
| 4 | Update chatbot route | `src/app/api/ai-chatbot/route.ts` | Replace `callClaudePlaceholder` → `callClaudeWithTools`, handle `proposal`/`text` response types |
| 5 | Add `'proposal'` to ChatMessage union | `src/store/useAIChatbotStore.ts` | `'proposal'` added to `type` union |
| 6 | Add Confirm button to proposal bubble | `src/components/chatbot/MessageBubble.tsx` | `onConfirm` prop, coral button, aria-label |
| 7 | Wire `onConfirm` through MessageList | `src/components/chatbot/MessageList.tsx` | Pass `onConfirm` to proposal bubbles only |
| 8 | Implement `handleConfirm` + CONFIRMED flow | `src/components/chatbot/MessageInput.tsx` | Second API call with full history + `CONFIRMED` message |
| 9 | TypeScript compilation gate | All files | `npx tsc --noEmit` exits 0 |

---

## Requirement Coverage (Tasks 1–2)

| Requirement | Task | Status |
|-------------|------|--------|
| LOOP-01 (ask for missing params) | Task 2 (system prompt already had BEHAVIOR RULE 1) | ✅ |
| LOOP-02 (loop until params collected) | Task 3 | 🔲 |
| LOOP-03 (confirm before writes) | Tasks 2, 3, 6, 8 | Partial |
| LOOP-04 (ambiguous input handling) | Task 2 | ✅ |
| LOOP-05 (10-iteration cap) | Task 3 | 🔲 |
| TIME-01–05 (Vietnamese time inference) | System prompt already complete | ✅ |
| ERR-01 (permission errors in user lang) | Tasks 1, 3 | Partial |
| ERR-02 (API errors user-friendly) | Tasks 1, 3 | Partial |
| ERR-03 (retry once on transient failure) | Task 3 | 🔲 |
| ERR-04 (rate-limit with retry suggestion) | Tasks 1, 3 | Partial |
| THRD-05 (structured result cards) | Tasks 1, 3 | Partial |
| THRD-06 (markdown formatting) | Tasks 1, 2 | ✅ |
