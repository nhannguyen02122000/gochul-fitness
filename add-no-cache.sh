#!/bin/bash

# Script to add cache-disabling exports to all API route files

routes=(
  "src/app/api/contract/create/route.ts"
  "src/app/api/contract/delete/route.ts"
  "src/app/api/contract/update/route.ts"
  "src/app/api/contract/updateStatus/route.ts"
  "src/app/api/history/create/route.ts"
  "src/app/api/history/delete/route.ts"
  "src/app/api/history/getAll/route.ts"
  "src/app/api/history/getOccupiedTimeSlots/route.ts"
  "src/app/api/history/update/route.ts"
  "src/app/api/history/updateStatus/route.ts"
  "src/app/api/user/checkUserSetting/route.ts"
  "src/app/api/user/createUserSetting/route.ts"
  "src/app/api/user/getByRole/route.ts"
  "src/app/api/user/getUserInformation/route.ts"
  "src/app/api/user/updateBasicInfo/route.ts"
)

for route in "${routes[@]}"; do
  # Check if file exists
  if [ -f "$route" ]; then
    # Check if it already has the dynamic export
    if ! grep -q "export const dynamic" "$route"; then
      # Find the line number of the first "export async function"
      line_num=$(grep -n "export async function" "$route" | head -1 | cut -d: -f1)
      
      if [ -n "$line_num" ]; then
        # Insert the cache-disabling exports before the function
        sed -i '' "${line_num}i\\
\\
// Disable caching for this route\\
export const dynamic = 'force-dynamic'\\
export const revalidate = 0\\
" "$route"
        echo "✓ Updated: $route"
      fi
    else
      echo "⊘ Skipped (already has cache config): $route"
    fi
  else
    echo "✗ File not found: $route"
  fi
done

echo ""
echo "Done! Cache-disabling exports added to API routes."
