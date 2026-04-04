# Clerk JWT Template Setup — gochul-fitness

> **Required for AI chatbot auth forwarding.** Complete this step before testing
> the chatbot in production or with token-forwarding flows.

## Why This Is Needed

The AI chatbot route (`POST /api/ai-chatbot`) uses Clerk scoped tokens to
forward authentication to GoChul API routes when executing tool calls in Phase 4.

Decision D-01 specifies: `getToken({ template: 'gochul-fitness' })`
— a short-lived JWT issued by Clerk, scoped to this application.

## Setup Steps

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → your application
2. Navigate to **Configure → JWT Templates**
3. Click **New template → Empty template**
4. Configure:
   - **Name**: `gochul-fitness`
   - **Token lifetime**: `5 minutes` (short-lived — enough for a single tool call chain)
   - **Claims**: ensure `sub` (user ID) and `sid` (session ID) are included
   - Leave all other options at defaults
5. Save the template

## What Happens If Not Configured

`getToken({ template: 'gochul-fitness' })` returns `null`.
The chatbot route handles this gracefully — it falls back to same-origin
cookie forwarding for internal GoChul API calls (automatic in Next.js).

However, **short-lived scoped tokens are recommended** for:
- Minimizing blast radius if a token is leaked
- Better auditability of bot-initiated API calls
- Supporting cross-service tool execution in future phases

## Verification

After setup, verify the template works:

```bash
# Sign in to the app, then from the browser console run:
Clerk.session.getToken({ template: 'gochul-fitness' }).then(console.log)
# Should return a JWT string (eyJhbG...), not null
```

If the output is `null`, the template name or configuration is incorrect.

## Troubleshooting

| Symptom | Likely Cause |
|---------|-------------|
| `getToken()` returns `null` | Template name mismatch (check spelling: `gochul-fitness`) |
| 401 from internal API calls | Token forwarding not set up; same-origin fallback not working |
| Token rejected by GoChul routes | GoChul API routes may need update to verify forwarded JWT (Phase 4) |
