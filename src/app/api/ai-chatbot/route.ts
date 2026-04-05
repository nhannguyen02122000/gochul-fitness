/**
 * POST /api/ai-chatbot — GoChul Fitness AI Chatbot route handler.
 *
 * Phase 1: Verifies auth, resolves role, builds system prompt.
 * Phase 3: Accepts messages[] array, returns type + bot response.
 * Phase 4: Implements tool-use loop.
 * Phase 5: Adds rate limiting, streaming Response, and language nudge.
 *
 * AI SDK v6 integration:
 * - useChat sends: { messages: UIMessage[], trigger, messageId }
 * - useChat expects: SSE Response (AI SDK UI message chunk format)
 * - Non-streaming responses (nudge/proposal) also returned as SSE
 *
 * @file src/app/api/ai-chatbot/route.ts
 */

import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/lib/ai/systemPrompt'
import { callClaudeWithTools } from '@/lib/ai/anthropicService'
import { requireRole } from '@/lib/roleCheck'
import { ratelimit } from '@/lib/ratelimit'
import { textToStream } from '@/lib/ai/streamUtils'
import type { Role } from '@/app/type/api'
import { isTextUIPart, type UIMessage } from 'ai'

export const dynamic = 'force-dynamic'

/*** Extract the latest user text from a UIMessage array.
 * AI SDK v6 sends messages as UIMessage[] with parts[] — extract text content.
 */
function extractLatestUserText(messages: UIMessage[]): string {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length === 0) return ''
  const last = userMessages[userMessages.length - 1]
  return last.parts
    .filter(isTextUIPart)
    .map(p => p.text)
    .join('')
}

/**
 * Convert UIMessage[] to conversation format for callClaudeWithTools.
 */
function toConversationMessages(
  messages: UIMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.parts
        .filter(isTextUIPart)
        .map(p => p.text)
        .join(''),
    }))
}

export async function POST(request: Request) {
  // ── 1. Authenticate ─────────────────────────────────────────────────────────
  const authCtx = await auth()
  const { userId } = authCtx

  if (!userId) {
    return textToStream('Unauthorized — please sign in to use the chatbot.')
  }

  // ── 2. Rate limiting (Phase 5) ───────────────────────────────────────────────
  // ratelimit is undefined when UPSTASH_REDIS_REST_URL/TOKEN not configured
  if (ratelimit) {
    const { success: rateOk } = await ratelimit.limit(userId)
    if (!rateOk) {
      return textToStream(
        "You're sending messages too quickly. Please wait a moment and try again."
      )
    }
  }

  // ── 3. Parse request body ────────────────────────────────────────────────────
  // AI SDK v6 useChat sends: { messages: UIMessage[], trigger, messageId }
  let body: { messages: UIMessage[]; trigger?: string; messageId?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return textToStream('Invalid request body.')
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return textToStream('Missing messages array.')
  }

  const latestUserText = extractLatestUserText(body.messages)
  if (!latestUserText.trim()) {
    return textToStream('No message provided.')
  }

  // ── 4. Resolve user role ─────────────────────────────────────────────────────
  let userRole: Role
  let userInstantId: string
  let userName: string

  try {
    const userData = await instantServer.query({
      user_setting: {
        $: {
          where: {
            clerk_id: userId,
          },
        },
        users: {},
      },
    })

    const userSetting = userData.user_setting[0]

    if (!userSetting) {
      return textToStream('User settings not found — please complete onboarding.')
    }

    const rawRole = userSetting.role
    if (!requireRole(rawRole, ['ADMIN', 'STAFF', 'CUSTOMER'])) {
      return textToStream('You do not have permission to use this feature.')
    }

    userRole = rawRole as Role
    userInstantId = userSetting.users?.[0]?.id ?? ''
    userName = [userSetting.first_name, userSetting.last_name]
      .filter(Boolean)
      .join(' ') || userId
  } catch (error) {
    console.error('Error resolving user role:', error instanceof Error ? error.message : String(error))
    return textToStream('Failed to resolve user session — please try again.')
  }

  // ── 5. Get Clerk token for API forwarding ────────────────────────────────────
  const clerkToken: string | null = await authCtx.getToken({ template: 'gochul-fitness' })

  // ── 6. Build system prompt ───────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    role: userRole,
    userName,
    userInstantId,
  })

  // ── 7. Build conversation messages ───────────────────────────────────────────
  const conversationMessages = toConversationMessages(body.messages)

  // ── 8. Call Claude with tool-use loop (30s timeout) ──────────────────────────
  let callResult: { type: 'text' | 'proposal'; text: string }
  try {
    callResult = await callClaudeWithTools({
      messages: conversationMessages,
      systemPrompt,
      role: userRole,
      clerkToken: clerkToken ?? undefined,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[chatbot] callClaudeWithTools threw:', msg)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return textToStream('The AI request timed out after 30s. Please try a simpler request.')
    }
    return textToStream(`AI error: ${msg}`)
  }

  const { type: responseType, text: botReply } = callResult

  console.log('[chatbot route] callResult type:', responseType, '| text length:', botReply.length, '| text preview:', JSON.stringify(botReply.slice(0, 80)))

  // ── 10. Return response ──────────────────────────────────────────────────────
  // All responses stream via SSE (AI SDK v6 useChat format)
  return textToStream(botReply)
}
