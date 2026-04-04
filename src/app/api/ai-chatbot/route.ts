/**
 * POST /api/ai-chatbot — GoChul Fitness AI Chatbot route handler.
 *
 * Phase 1: Verifies auth (401 without session), resolves user role,
 * builds system prompt, returns a placeholder AI response.
 * Phase 3: Accepts messages[] array, returns type + bot response.
 * Phase 4: Implements tool-use loop with TOOL_DEFINITIONS.
 *
 * Auth: Clerk session cookie → auth() → getUserSetting() → role.
 * Token forwarding: getToken({ template: 'gochul-fitness' }) → forwarded as
 *   Authorization: Bearer <token> to GoChul API routes (Phase 4 execution).
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
import type { Role } from '@/app/type/api'

// Disable Next.js caching — this route must always run fresh
export const dynamic = 'force-dynamic'
export const revalidate = 0

type AIChatRequestBody = {
  /** The user's latest message text */
  message: string
  /** Phase 3+: Full conversation history [{role: 'user'|'assistant', content: string}] */
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(request: Request) {
  // ── 1. Authenticate via Clerk session cookie ─────────────────────────────────
  const authCtx = await auth()
  const { userId } = authCtx

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized — please sign in to use the chatbot' },
      { status: 401 }
    )
  }

  // ── 2. Parse request body ─────────────────────────────────────────────────────
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

  // ── 3. Resolve user role via InstantDB user_setting ──────────────────────────
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

  // ── 4. (Phase 1 stub) Get Clerk scoped token for downstream API forwarding ────
  // D-01: Clerk JWT template 'gochul-fitness' must be configured in Clerk Dashboard.
  // If the template is missing, getToken returns null and we fall back to same-origin
  // cookie forwarding (automatic for internal fetch calls within the same Next.js app).
  // The token is stored in a local variable — it is NEVER logged or sent to Anthropic.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clerkToken: string | null = await authCtx.getToken({ template: 'gochul-fitness' })

  // ── 5. Build system prompt ────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    role: userRole,
    userName,
    userInstantId,
  })

  // ── 6. Call Claude with tool-use loop ────────────────────────────────────────
  // Phase 4: callClaudeWithTools() handles the full multi-turn loop internally —
  // history is built from body.messages, tools are dispatched and their formatted
  // results are fed back to Claude until it returns plain text.
  let callResult: { type: 'text' | 'proposal'; text: string }
  try {
    const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...(body.messages ?? []),
      { role: 'user', content: body.message },
    ]
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

  // ── 7. Return response ───────────────────────────────────────────────────────
  if (responseType === 'proposal') {
    return NextResponse.json({
      reply: botReply,
      type: 'proposal' as const,
      role: userRole,
      messages: finalMessages,
    })
  }

  return NextResponse.json({
    reply: botReply,
    type: 'text' as const,
    role: userRole,
    messages: finalMessages,
  })
}
