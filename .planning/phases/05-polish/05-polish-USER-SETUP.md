---
phase: 05-polish
---

# Phase 5: Polish — User Setup

**External services require manual configuration.**

---

## Upstash Redis (Rate Limiting)

The chatbot uses Upstash Redis for rate limiting on `POST /api/ai-chatbot` (20 req/min per user).

### 1. Create an Upstash Redis database

1. Go to [upstash.com](https://upstash.com) → Create a **Redis** database
2. Choose a region closest to your deployment (e.g., `Southeast Asia` for Vietnam)
3. Copy the **REST URL** and **REST Token** from the dashboard

### 2. Add environment variables

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://xxx-xxx-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

> **Note:** These are the only environment variables required for Phase 5. The other variables (`CLAUDE_API_KEY`, `CLERK_SECRET_KEY`, etc.) were already configured in prior phases.

### 3. Verify

```bash
# Start the dev server and check no errors
npm run dev
```

Then open the chatbot and send 20+ rapid messages — you should receive a friendly rate-limit message instead of errors.

### Troubleshooting

**`Redis connection failed`** or `UPSTASH_REDIS_REST_URL is not set`:
- Verify the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` values are correct
- Ensure the database is not paused (Upstash free tier pauses after 14 days of inactivity)
- Check network connectivity from your deployment environment

**Rate limiting not working:**
- Rate limit state is per-IP for unauthenticated requests and per-userId for authenticated requests
- In local development, if you are not logged in, the rate limiter may not apply correctly — this is expected behavior (the route returns 401 before reaching rate limit in that case)

---

*Phase: 05-polish*
