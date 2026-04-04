/**
 * Upstash Redis + Ratelimit initialization for the AI chatbot.
 * Phase 5: Rate limiting on POST /api/ai-chatbot (20 req/min per userId).
 *
 * Gracefully skips when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * are not configured (local dev without Upstash).
 *
 * @file src/lib/ratelimit.ts
 */

import 'server-only'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

/**
 * Rate limiter: 20 requests per minute, per authenticated userId.
 * Falls back to IP for unauthenticated requests (route returns 401 before
 * reaching this, so this is a safety net only).
 * Is undefined when Upstash env vars are not configured.
 */
export const ratelimit =
  UPSTASH_URL && UPSTASH_TOKEN
    ? new Ratelimit({
        redis: new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }),
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        analytics: true,
      })
    : undefined
