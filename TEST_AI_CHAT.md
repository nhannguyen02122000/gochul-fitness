# AI Chat Feature Test Scenarios

## Preconditions

- `AI_API_KEY` is set in environment.
- User is authenticated.
- Existing routes are healthy:
  - `GET /api/contract/getAll`
  - `GET /api/history/getAll`
  - `POST /api/history/create`

## 1) Planner Endpoint - Read Intent (Contracts)

**Request**

```http
POST /api/ai-chat/plan
Content-Type: application/json

{
  "message": "Cho tôi xem hợp đồng đang active"
}
```

**Expected**

- HTTP `200`
- `plan.actions` includes at least one action with `type = "get_contracts"`
- `plan.requires_confirmation = false`

## 2) Planner Endpoint - Create Session Intent Requires Confirmation

**Request**

```http
POST /api/ai-chat/plan
Content-Type: application/json

{
  "message": "Tạo cho tôi 1 buổi mới cho hợp đồng c123 vào ngày mai từ 8h đến 9h30"
}
```

**Expected**

- HTTP `200`
- `plan.actions` may include `create_session`
- if `create_session` exists then:
  - `plan.requires_confirmation = true`
  - `plan.confirmation_message` exists

## 3) Stream Endpoint - Read Query

**Flow**

1. Call `POST /api/ai-chat/plan`
2. Call `POST /api/ai-chat/stream` with `{ message, plan, confirmed: false }`

**Expected**

- HTTP `200`
- text stream is returned
- response contains natural language summary from contracts/sessions

## 4) Stream Endpoint - Create Session Without Confirmation

**Request**

`POST /api/ai-chat/stream` with a plan containing `create_session` and `confirmed: false`

**Expected**

- Streamed response explains confirmation is required OR create action reports blocked
- No successful session creation should occur

## 5) Stream Endpoint - Create Session With Confirmation

**Request**

`POST /api/ai-chat/stream` with same plan and `confirmed: true`

**Expected**

- `create_session` is executed via `/api/history/create`
- Streamed answer confirms success when API succeeds
- If API fails validation/conflict, streamed answer explains the failure

## 6) UI Smoke Test (`/ai-chat`)

### 6.1 Read Query

- Open `/ai-chat`
- Send: `Cho tôi xem session tuần này`
- Expected:
  - user bubble appears
  - assistant streams response progressively

### 6.2 Create Query + Confirm

- Send create-session intent
- Expected:
  - confirmation box appears with Confirm/Cancel
- Click **Cancel**
  - Expected assistant cancellation message
- Repeat query and click **Confirm**
  - Expected streaming final response with create-session execution result

## 7) Error Handling Checks

### 7.1 Missing Message

- `POST /api/ai-chat/plan` with empty payload
- Expect `400` with clear error

### 7.2 Invalid Planner JSON from Model

- Simulate malformed planner output (mock)
- Expect `500` from `/api/ai-chat/plan`

### 7.3 Unauthorized User

- Call both endpoints without auth
- Expect `401`

### 7.4 Upstream AI Failure

- Simulate AI provider timeout/error
- Expect `500` and safe error message

## 8) Safety & Guard Verification

- Planner actions are capped (`max 4`)
- Unknown action types are rejected by validator
- `create_session` requires all fields (`contract_id`, `date`, `from`, `to`)
- `create_session` is blocked unless `confirmed = true`

## 9) Short Contract ID Resolution (Regression)

### 9.1 Book with displayed short contract ID prefix

**Given**

- Assistant previously listed ACTIVE contracts using shortened display IDs (prefix before `-`), e.g. `8f9035db`.

**Flow**

1. User asks to book using that short ID, e.g. `Đặt lịch với hợp đồng 8f9035db lúc 9h`.
2. Planner emits `create_session` with `contract_id: "8f9035db"`.
3. Call `POST /api/ai-chat/stream` with `confirmed: true`.

**Expected**

- Server resolves `8f9035db` to the full contract ID from `/api/contract/getAll` before calling `/api/history/create`.
- If exactly one match exists, booking proceeds successfully with full `contract_id`.
- If no match exists, streamed response explains contract was not found.
- If multiple matches exist for same prefix, streamed response asks user for a more specific contract ID.
