# Feature Research

**Domain:** AI chatbot interface for a gym management web app
**Researched:** 2026-04-04
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Floating chat button (FAB) | Accessible from any page without interrupting workflow | LOW | Non-intrusive placement; must not cover key UI elements |
| Chat modal overlay | Dedicated conversational space that doesn't navigate away | LOW | Must be dismissible; should not block entire viewport |
| Message thread display | Users need to see full back-and-forth context | LOW | Scrollable; clear visual distinction between user/bot messages |
| Text input + send | Basic chat interaction | LOW | Enter key + send button; character feedback |
| Bot confirmation of action | Users need to know the bot understood and acted | LOW | Plain text summary in chat is sufficient |
| Basic Vietnamese + English language support | GoChul Fitness serves Vietnamese users | LOW | App-level i18n already exists; bot must match |
| API call execution | Core value — bot must actually do things, not just talk | MEDIUM | Depends on API integration + permission guard |
| Parameter prompting loop | Users give incomplete commands; bot must ask for missing info | MEDIUM | Core mechanic — without it, most actions fail |
| Permission-aware responses | Bot must not pretend it can do things the user's role forbids | LOW | API layer already enforces; bot must surface 403s gracefully |
| Loading / thinking indicator | Long API calls need feedback so users don't double-send | LOW | Simple spinner or "..." text |
| Error handling & messages | API failures, missing data, expired contracts must be communicated clearly | MEDIUM | Bot must translate API errors into user-friendly Vietnamese/English |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but meaningful for a gym app where staff/members are often on the go.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Vietnamese time-window inference ("sáng mai", "chiều thứ 6") | Native Vietnamese UX — users speak naturally, bot understands | HIGH | Must handle: morning/afternoon/evening/night windows, relative days (tomorrow = next weekday), Vietnamese day-of-week mapping. This is a domain-specific inference skill. |
| Structured result cards | After an action, display a formatted summary (contract ID, status, session time) rather than raw text | MEDIUM | Makes results scannable; reduces misunderstandings. Could render a mini card with key fields. |
| Multi-turn follow-up context | "Lịch tập sáng mai" → bot shows results → user says "hủy lịch 2" → bot knows which session | MEDIUM | Requires the LLM to carry conversation context across turns. Also requires stable session/cursor tracking in UI. |
| Smart time parsing (English) | "tomorrow at 9am", "next Thursday at 3pm" parsed into API timestamps | MEDIUM | Complements Vietnamese time inference for English-speaking staff. |
| Contract/session status summaries | "Bạn có 3 hợp đồng đang active, 2 buổi tập chờ check-in" | LOW | Simple aggregation from API responses; adds perceived intelligence. |
| Fallback to web UI | Bot says "Tôi không thể làm điều đó, nhưng bạn có thể làm ở [link]" | LOW | Prevents dead ends; guides users to existing UI for unsupported actions. |
| Permission-aware intent routing | Bot detects what user wants AND checks if their role can do it before pretending to try | MEDIUM | Prevents wasted API calls and confusing 403 errors; bot can say upfront "bạn không có quyền". |
| Time slot availability check before booking | Bot checks trainer's occupied slots before confirming a session time | HIGH | Requires calling `getOccupiedTimeSlots` before `history/create`; coordination across multiple API calls. |
| Inline entity references ("cái thứ 2", "hợp đồng kia") | Users refer to results the bot just showed | MEDIUM | Requires bot to assign stable identifiers in structured responses. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Chat history persistence across sessions | Users expect continuity like WhatsApp | Breaks the "scope" model; raises privacy concerns (others using same device see prior conversations); adds storage/complexity | Persist within a single modal session only (already out-of-scope per PROJECT.md) |
| Voice input or audio responses | Feels modern; good for hands-free use | ASR quality in Vietnamese is variable; adds significant complexity (Web Speech API, latency, cost); out of scope for gym management | Stick to text; focus on fast, accurate text responses instead |
| AI-generated workout advice or fitness coaching | "Since the bot is AI, it should give advice" | Out of scope by design; requires medical/health expertise; liability risk; distracts from core value | The bot executes app operations only — this is a feature boundary, not a bug |
| Real-time streaming responses | Feels more "AI" and responsive | Claude SDK streaming requires custom frontend handling; adds latency perception for short responses; synchronous confirm-then-display is clearer for action results | Non-streaming; show structured result after API call completes |
| Bot-initiated proactive nudges ("bạn có lịch tập sáng mai") | Seems helpful | Requires ongoing context monitoring; complicates permission model (when to notify?); adds notification infrastructure | Future: Ably-based push notifications are already in the stack, but keep chatbot scope to reactive only for v1 |
| Cross-language mixing in a single conversation | Bilingual users want to switch mid-chat | Harder to prompt-engineer consistently; may produce mixed-language responses that feel broken | Enforce single-language-per-turn detection; warn if user switches mid-conversation |
| Unlimited API call chains per message | "Just do everything the user implied" | Risk of runaway loops, rate limit hits, unexpected side effects; hard to audit | Cap at 2–3 API calls per user message; surface partial results if blocked |
| Natural language SQL / raw query access | Power users want "show me all sessions last week" | Security blast radius is large; RBAC is enforced at API level, not DB level; a mis-parse could expose data | Stick to the defined API surface; add new endpoints if needed |

## Feature Dependencies

```
[Floating FAB + Modal Shell]
    └──requires──> [Message Thread Display]
                          └──requires──> [Message Input + Send]
                                                  └──requires──> [API Integration Layer]
                                                                      ├──requires──> [Permission-Aware Intent Routing]
                                                                      │                    ├──requires──> [Vietnamese Time Inference]
                                                                      │                    └──requires──> [Parameter Prompting Loop]
                                                                      └──requires──> [Structured Result Display]
                                                                                        └──requires──> [Error Translation Layer]

[Vietnamese Time Inference]
    └──requires──> [Time Slot Availability Check]  (when booking sessions)

[Message Thread Display]
    └──enhances──> [Multi-turn Follow-up Context]  (thread is the pre-req for referencing prior results)

[Permission-Aware Intent Routing]
    └──conflicts──> [Unlimited API Call Chains]  (permission guard is the reason to cap call depth)
```

### Dependency Notes

- **[Message Thread Display] requires [Message Input + Send]:** Without input, there's nothing to thread. UI shell must exist before threading logic.
- **[API Integration Layer] requires [Permission-Aware Intent Routing]:** The AI decides which endpoint to call; permission checks are handled by the API layer but the AI must understand what the user's role allows.
- **[Vietnamese Time Inference] requires [Parameter Prompting Loop]:** If the AI can't parse the time window, it must ask the user — that's the loop.
- **[Time Slot Availability Check] requires [Vietnamese Time Inference]:** The bot must first resolve "sáng mai" to a concrete date before it can check which slots are occupied.
- **[Structured Result Display] requires [API Integration Layer]:** Nothing to display without API results.
- **[Multi-turn Follow-up Context] enhances [Message Thread Display]:** The thread is the data source for follow-up references ("cái thứ 2").
- **[Permission-Aware Intent Routing] conflicts with [Unlimited API Call Chains]:** Permission guards are the structural reason to cap depth — calling many APIs in sequence amplifies the risk of hitting a forbidden endpoint unexpectedly.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Floating FAB + modal shell** — the physical entry point; no chatbot without it
- [ ] **Message thread + input** — the conversational surface; no thread = no context
- [ ] **API integration (contract + history endpoints)** — the core value; bot must execute the 4 main operations: list, create, update status, cancel
- [ ] **Permission-aware routing** — bot must not attempt forbidden actions; 403s must be surfaced as friendly messages
- [ ] **Parameter prompting loop** — the core mechanic; incomplete commands must trigger prompts until all required fields are gathered
- [ ] **Vietnamese time-window inference** — morning/afternoon/evening/night + relative day (tomorrow = next weekday) for Vietnamese prompts
- [ ] **Structured result display** — formatted summary cards after list/create/update/cancel actions
- [ ] **Error translation** — API errors → friendly Vietnamese/English messages in the chat

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **English time parsing** — "tomorrow at 9am", "next Thursday" for bilingual staff
- [ ] **Multi-turn follow-up context** — referencing items from prior bot responses ("hủy lịch 2")
- [ ] **Inline entity references** — "cái thứ 2", "hợp đồng kia" resolved back to IDs
- [ ] **Loading indicators** — spinner/"..." while API calls are in flight
- [ ] **Contract/session status summaries** — "Bạn có X hợp đồng active" on idle

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Time slot availability check before booking** — prevents booking conflicts; requires coordinating `getOccupiedTimeSlots` + `history/create`
- [ ] **Fallback to web UI** — "I can't do that, but here's a link" for out-of-scope actions
- [ ] **Cross-language warning** — detect mid-conversation language switches and nudge users
- [ ] **Call depth cap with partial results** — if a chain hits the cap, surface what was completed

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Floating FAB + modal shell | HIGH | LOW | P1 |
| Message thread + input | HIGH | LOW | P1 |
| API integration (core endpoints) | HIGH | MEDIUM | P1 |
| Permission-aware routing | HIGH | MEDIUM | P1 |
| Parameter prompting loop | HIGH | MEDIUM | P1 |
| Vietnamese time inference | HIGH | HIGH | P1 |
| Structured result display | HIGH | MEDIUM | P1 |
| Error translation | HIGH | LOW | P1 |
| Loading indicators | MEDIUM | LOW | P2 |
| English time parsing | MEDIUM | MEDIUM | P2 |
| Multi-turn follow-up context | MEDIUM | MEDIUM | P2 |
| Contract/session summaries | MEDIUM | LOW | P2 |
| Inline entity references | MEDIUM | MEDIUM | P2 |
| Time slot availability check | HIGH | HIGH | P3 |
| Fallback to web UI | LOW | MEDIUM | P3 |
| Cross-language warning | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

> Note: GoChul Fitness appears to be a gym management tool serving the Vietnamese market. Competitor analysis here covers general AI chatbot patterns in SaaS/gym management products.

| Feature | Generic SaaS Chatbots (Intercom, Drift) | Consumer Chat Apps (WhatsApp-style) | Our Approach |
|---------|---------------------------------------|-------------------------------------|--------------|
| Floating entry point | ✅ (widget button) | ✅ (FAB) | FAB + modal — matches PROJECT.md spec |
| Multi-turn conversation | ✅ | ✅ | ✅ — core mechanic |
| Structured results | Rare — mostly plain text | Rare | ✅ — differentiate with formatted cards |
| Vietnamese language | Rare — often English-only | ✅ ( LINE, Zalo) | ✅ — first-class Vietnamese support |
| Time inference (localized) | Rare | ✅ (WhatsApp datetime parsing) | ✅ — domain-specific for gym schedules |
| API action execution | ✅ (via integrations) | ❌ | ✅ — direct GoChul Fitness API calls |
| Role-based permission awareness | Rare | ❌ | ✅ — leverages existing RBAC |
| No chat history persistence | ❌ (persist by default) | ✅ | Deliberately not persisting — per PROJECT.md scope |
| No voice input | ❌ (some offer it) | ✅ | Deliberately not building — per PROJECT.md scope |

### Key Insight

Most SaaS chatbots (Intercom, Drift) focus on **customer support** — answering questions, routing to humans. GoChul Fitness's bot is an **operational tool** — it executes actions inside the app. This is closer to a voice assistant pattern (like Google Assistant or Alexa for business tools) than a support chat widget. The differentiation is: **task completion, not Q&A**.

## Sources

- GoChul Fitness `PROJECT.md` — product context and constraints
- GoChul Fitness `docs/FEAT_AIBOT.txt` — feature spec from founder
- GoChul Fitness `docs/PROGRAM.md` — API structure, RBAC, data model
- Industry patterns: Intercom, Drift, Zendesk, WhatsApp Business, LINE Official Account, Zalo OA feature sets

---

*Feature research for: GoChul Fitness AI Chatbot*
*Researched: 2026-04-04*
