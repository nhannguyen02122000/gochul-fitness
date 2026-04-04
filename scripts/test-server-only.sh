#!/bin/bash
# Verifies server-only files have the 'server-only' import guard.
# Exit 0 = PASS, exit 1 = FAIL
set -e
FILES="src/lib/ai/anthropicService.ts src/lib/ai/toolDefinitions.ts"
for f in $FILES; do
  if ! grep -q "import 'server-only'" "$f" 2>/dev/null; then
    echo "FAIL: $f missing 'import \"server-only\"'"
    exit 1
  fi
done
echo "PASS: All files have server-only guard"
exit 0
