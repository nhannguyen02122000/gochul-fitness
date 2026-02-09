# Cache Management Guide

## Changes Made to Disable Caching

### 1. Next.js Configuration (`next.config.ts`)
- Added `onDemandEntries` config to disable caching in development

### 2. Service Worker (`public/sw.js`)
- **Bumped cache versions** from v1 to v2 (forces cache refresh on next visit)
- **Changed caching strategy** for HTML/navigation requests from "cache first" to "network first"
- This ensures the UI always fetches the latest version from the network

### 3. Layout Files
- Added `export const dynamic = 'force-dynamic'` to disable static rendering
- Added `export const revalidate = 0` to disable ISR caching
- Applied to:
  - `src/app/layout.tsx` (root layout)
  - `src/app/(main)/layout.tsx` (main app layout)

### 4. API Routes
- Added cache-disabling exports to `src/app/api/contract/getAll/route.ts`
- Example:
  ```typescript
  export const dynamic = 'force-dynamic'
  export const revalidate = 0
  ```

## How to Force Clear Cache

### Option 1: Use the Browser DevTools
1. Open DevTools (F12 or Right-click → Inspect)
2. Go to **Application** tab
3. Under **Storage**, click "Clear site data"
4. Check all boxes and click "Clear site data"
5. Refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Option 2: Use the Utility Function
Add a button in your UI to call the clear cache function:

```typescript
import { resetPWA } from '@/utils/clearCache'

// In your component
<button onClick={() => resetPWA()}>
  Clear Cache & Reload
</button>
```

### Option 3: Manual Service Worker Update
In browser console, run:
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister())
}).then(() => location.reload())
```

### Option 4: Hard Refresh
- **Windows/Linux**: Ctrl + Shift + R or Ctrl + F5
- **Mac**: Cmd + Shift + R

## Development Workflow

### To see changes immediately:
1. Save your code changes
2. The Next.js dev server will auto-reload
3. If using PWA:
   - The service worker skips caching on localhost
   - Hard refresh (Ctrl+Shift+R) if needed

### For production/deployed app:
1. When you deploy new code, bump the cache version in `public/sw.js`:
   ```javascript
   const CACHE_NAME = 'gochul-fitness-v3'; // Increment version
   const RUNTIME_CACHE = 'gochul-runtime-v3';
   ```
2. Users will get the new service worker on next visit
3. Old caches will be automatically cleared

## Troubleshooting

### Still seeing old UI?
1. Check if service worker is registered:
   - DevTools → Application → Service Workers
   - Click "Unregister" if needed

2. Clear all caches:
   - DevTools → Application → Cache Storage
   - Right-click and delete all caches

3. Check Network tab:
   - Look for "(from Service Worker)" or "(from cache)"
   - If present, the old cache is being used

4. Disable service worker temporarily:
   - DevTools → Application → Service Workers
   - Check "Bypass for network"

### API returning stale data?
- Check Response Headers in Network tab
- Should see `Cache-Control: no-store, must-revalidate`
- If not, the route config might not be applied

## Cache Strategy Summary

| Resource Type | Strategy | Reason |
|--------------|----------|---------|
| HTML/Pages | Network First | Always get latest UI |
| API Requests | Network First | Always get fresh data |
| JS/CSS/Images | Cache First | Better performance, versioned by build |
| localhost | No Cache | Development mode |

## Best Practices

1. **Always bump cache version** when deploying UI changes
2. **Use hard refresh** during development if needed
3. **Test in incognito** to verify changes without cache
4. **Monitor Service Worker** updates in DevTools
5. **Educate users** to refresh if they report old UI

## Quick Commands

```bash
# Clear Next.js build cache
rm -rf .next

# Restart dev server
npm run dev

# Build for production (clears previous build)
npm run build
```
