/**
 * POST /api/ai-chatbot — GoChul Fitness AI Chatbot route handler.
 *
 * Phase 1: Verifies auth, resolves role, builds system prompt.
 * Phase 3: Accepts messages[] array, returns type + bot response.
 * Phase 4: Implements tool-use loop.
 * Phase 5: Adds rate limiting, streaming Response, and language nudge.
 *
 * @file src/app/api/ai-chatbot/route.ts
 */

import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/lib/ai/systemPrompt'
import { callClaudeWithTools, detectLanguage } from '@/lib/ai/anthropicService'
import { requireRole } from '@/lib/roleCheck'
import { ratelimit } from '@/lib/ratelimit'
import { textToStream } from '@/lib/ai/streamUtils'
import type { Role } from '@/app/type/api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AIChatRequestBody = {
  message: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(request: Request) {
  // ── 1. Authenticate ─────────────────────────────────────────────────────────
  const authCtx = await auth()
  const { userId } = authCtx

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized — please sign in to use the chatbot' },
      { status: 401 }
    )
  }

  // ── 2. Rate limiting (Phase 5) ───────────────────────────────────────────────
  const { success: rateOk, remaining, reset } = await ratelimit.limit(userId)
  if (!rateOk) {
    return NextResponse.json(
      {
        error: "You're sending messages too quickly. Please wait a moment and try again.",
        type: 'nudge',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      }
    )
  }

  // ── 3. Parse request body ────────────────────────────────────────────────────
  let body: AIChatRequestBody
  try {
    body = (await request.json()) as AIChatRequestBody
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body — expected JSON with { message: string }' },
      { status: 400 }
    )
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: message (string)' },
      { status: 400 }
    )
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
            clerk_id: userId
          }
        },
        users: {}
      }
    })

    const userSetting = userData.user_setting[0]

    if (!userSetting) {
      return NextResponse.json(
        { error: 'User settings not found — please complete onboarding' },
        { status: 404 }
      )
    }

    const rawRole = userSetting.role
    if (!requireRole(rawRole, ['ADMIN', 'STAFF', 'CUSTOMER'])) {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 }
      )
    }

    userRole = rawRole as Role
    userInstantId = userSetting.users?.[0]?.id ?? ''
    userName = [userSetting.first_name, userSetting.last_name]
      .filter(Boolean)
      .join(' ') || userId
  } catch (error) {
    console.error('Error resolving user role:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to resolve user session — please try again' },
      { status: 500 }
    )
  }

  // ── 5. Get Clerk token for API forwarding ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clerkToken: string | null = await authCtx.getToken({ template: 'gochul-fitness' })

  // ── 6. Build system prompt ───────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    role: userRole,
    userName,
    userInstantId,
  })

  // ── 7. Build conversation messages ───────────────────────────────────────────
  const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(body.messages ?? []),
    { role: 'user', content: body.message },
  ]

  // ── 8. Language switch detection (Phase 5) ───────────────────────────────────
  const userMessages = conversationMessages.filter(m => m.role === 'user')
  const lastTwoUsers = userMessages.slice(-2)
  const langSwitched =
    lastTwoUsers.length >= 2 &&
    detectLanguage([lastTwoUsers[lastTwoUsers.length - 2]]) !==
      detectLanguage([lastTwoUsers[lastTwoUsers.length - 1]])

  if (langSwitched) {
    const currentLang = detectLanguage([lastTwoUsers[lastTwoUsers.length - 1]])
    const detectedLabel = currentLang === 'vi' ? 'Vietnamese' : 'English'
    const nudgeText = `I noticed you switched language. I'll respond in ${detectedLabel}.`
    const nudgeMessages = [
      ...(body.messages ?? []),
      { role: 'user', content: body.message },
      { role: 'assistant', content: nudgeText },
    ]
    // Stream nudge as a non-streaming JSON response (small message, no streaming needed)
    return NextResponse.json({
      reply: nudgeText,
      type: 'nudge' as const,
      detectedLang: currentLang,
      messages: nudgeMessages,
    })
  }

  // ── 9. Call Claude with tool-use loop ───────────────────────────────────────
  let callResult: { type: 'text' | 'proposal'; text: string }
  try {
    callResult = await callClaudeWithTools({
      messages: conversationMessages,
      systemPrompt,
      role: userRole,
      clerkToken: clerkToken ?? undefined,
    })
  } catch (error) {
    console.error('Anthropic API error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'AI service temporarily unavailable — please try again in a moment' },
      { status: 502 }
    )
  }

  const { type: responseType, text: botReply } = callResult

  const finalMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(body.messages ?? []),
    { role: 'user', content: body.message },
    { role: 'assistant', content: botReply },
  ]

  // ── 10. Return response ──────────────────────────────────────────────────────
  if (responseType === 'proposal') {
    return NextResponse.json({
      reply: botReply,
      type: 'proposal' as const,
      role: userRole,
      messages: finalMessages,
    })
  }

  // Stream text response using AI SDK data stream format (Phase 5)
  const stream = textToStream(botReply)
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(reset),
    },
  })
}
