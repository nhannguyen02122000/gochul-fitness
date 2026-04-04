#!/bin/bash
# Verifies no Clerk tokens or session data appear in console.log statements.
# Exit 0 = PASS (no token leakage), exit 1 = FAIL (token found)
set -e

SEARCH_PATTERN='console\.\(log\|error\|warn\).*\(token\|clerkToken\|sessionToken\|bearer\|authToken\|clerk_token\)'
FOUND=$(grep -rni "$SEARCH_PATTERN" src/app/api/ai-chatbot/ src/lib/ai/ 2>/dev/null || true)
if [ -n "$FOUND" ]; then
  echo "FAIL: Sensitive token patterns found in logs:"
  echo "$FOUND"
  exit 1
fi
echo "PASS: No token leakage patterns found"
exit 0
