#!/bin/bash
# Verifies TOOL_DEFINITIONS contains exactly 10 tools.
# Exit 0 = PASS, exit 1 = FAIL
set -e
COUNT=$(grep -c "name: '" src/lib/ai/toolDefinitions.ts 2>/dev/null || echo "0")
if [ "$COUNT" -eq 10 ]; then
  echo "PASS: $COUNT tools found"
  exit 0
else
  echo "FAIL: Expected 10 tools, found $COUNT"
  exit 1
fi
