/**
 * Upstash Redis + Ratelimit initialization for the AI chatbot.
 * Phase 5: Rate limiting on POST /api/ai-chatbot (20 req/min per userId).
 * @file src/lib/ratelimit.ts
 */

import 'server-only'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiter: 20 requests per minute, per authenticated userId.
 * Falls back to IP for unauthenticated requests (route returns 401 before
 * reaching this, so this is a safety net only).
 */
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
})
