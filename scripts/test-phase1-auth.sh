#!/bin/bash
# Phase 1 acceptance: AI chatbot route auth + role resolution
# Tests:
#   1. Unauthenticated request → HTTP 401
#   2. Authenticated request → HTTP 200 + JSON with reply + role
#   3. ?debug=auth probe → HTTP 200 with apiStatus + clerkTokenPresent fields
#
# Prerequisites:
#   - Next.js dev server running on localhost:3000
#   - Clerk JWT template 'gochul-fitness' configured in Clerk Dashboard
#     (see docs/CLERK_JWT_SETUP.md)
#   - For authenticated tests (2 & 3): a Clerk session token is required.
#     Cookie name: __session (cookie-based sessions) or __clerk_db_jwt (JWT sessions).
#
# Usage:
#   bash scripts/test-phase1-auth.sh [CLERK_SESSION_TOKEN]

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
ENDPOINT="/api/ai-chatbot"
TOKEN="${1:-}"

echo "=== Phase 1 Auth Test ==="
echo "Base URL: $BASE_URL"
echo ""

# ── Test 1: Unauthenticated request ─────────────────────────────────────────
echo "[Test 1] Unauthenticated request → expect HTTP 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}')

if [ "$STATUS" -eq 401 ]; then
  echo "  PASS: Got HTTP $STATUS (expected 401)"
else
  echo "  FAIL: Got HTTP $STATUS (expected 401)"
  exit 1
fi
echo ""

# ── Test 2: Authenticated request (requires token) ────────────────────────────
if [ -z "$TOKEN" ]; then
  echo "[Test 2] SKIPPED: No Clerk session token provided"
  echo "  To test authenticated path, run:"
  echo "    bash scripts/test-phase1-auth.sh '<CLERK_SESSION_TOKEN>'"
  echo "  You can get a token via Clerk's browser console:"
  echo "    Clerk.session.getToken().then(console.log)"
  echo ""
  echo "[Test 3] SKIPPED: debug=auth probe requires token"
else
  echo "[Test 2] Authenticated request → expect HTTP 200 + JSON reply + role"
  # Single curl with -w to capture both body and status in one call
  RESPONSE=$(curl -s -w "\n__HTTP_STATUS__:%{http_code}" \
    -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Cookie: __session=$TOKEN" \
    -d '{"message":"hello"}')

  HTTP_STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")

  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "  PASS: Got HTTP $HTTP_STATUS"

    # Verify response is valid JSON with 'reply' field
    if echo "$BODY" | grep -q '"reply"'; then
      echo "  PASS: Response contains 'reply' field"
    else
      echo "  FAIL: Response missing 'reply' field"
      echo "  Response: $BODY"
      exit 1
    fi

    # Verify response contains 'role' field
    if echo "$BODY" | grep -q '"role"'; then
      ROLE=$(echo "$BODY" | grep -o '"role":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo "  PASS: Response contains role = '$ROLE'"
      if [[ "$ROLE" == "ADMIN" || "$ROLE" == "STAFF" || "$ROLE" == "CUSTOMER" ]]; then
        echo "  PASS: Role is valid (ADMIN|STAFF|CUSTOMER)"
      else
        echo "  FAIL: Role is not a valid value: '$ROLE'"
        exit 1
      fi
    else
      echo "  FAIL: Response missing 'role' field"
      exit 1
    fi
  else
    echo "  FAIL: Got HTTP $HTTP_STATUS (expected 200)"
    echo "  Response: $BODY"
    exit 1
  fi
  echo ""

  # ── Test 3: debug=auth probe (Phase 1 proxy for Criterion 4) ────────────────
  # Verifies Clerk token forwarding works by calling /api/contract/getAll internally.
  # This exercises the same code path Phase 4 tool execution will use.
  # Remove this test block when Phase 4 is implemented.
  echo "[Test 3] debug=auth probe → expect HTTP 200 with apiStatus + clerkTokenPresent"
  DEBUG_RESP=$(curl -s -w "\n__HTTP_STATUS__:%{http_code}" \
    -X POST "$BASE_URL$ENDPOINT?debug=auth" \
    -H "Content-Type: application/json" \
    -H "Cookie: __session=$TOKEN" \
    -d '{"message":"hello"}')

  DEBUG_STATUS=$(echo "$DEBUG_RESP" | grep "__HTTP_STATUS__" | cut -d: -f2)
  DEBUG_BODY=$(echo "$DEBUG_RESP" | grep -v "__HTTP_STATUS__")

  if [ "$DEBUG_STATUS" -eq 200 ]; then
    echo "  PASS: Got HTTP $DEBUG_STATUS"
    if echo "$DEBUG_BODY" | grep -q '"apiStatus"'; then
      echo "  PASS: Response contains 'apiStatus' field"
    else
      echo "  FAIL: Response missing 'apiStatus' field"
      echo "  Response: $DEBUG_BODY"
      exit 1
    fi
    if echo "$DEBUG_BODY" | grep -q '"clerkTokenPresent"'; then
      echo "  PASS: Response contains 'clerkTokenPresent' field"
    else
      echo "  FAIL: Response missing 'clerkTokenPresent' field"
      echo "  Response: $DEBUG_BODY"
      exit 1
    fi
  else
    echo "  FAIL: Got HTTP $DEBUG_STATUS (expected 200)"
    echo "  Response: $DEBUG_BODY"
    exit 1
  fi
fi

echo ""
echo "=== All applicable tests passed ==="
exit 0
