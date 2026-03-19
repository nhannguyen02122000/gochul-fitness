import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { instantServer } from '@/lib/dbServer'
import { createChatCompletion } from '@/lib/ai/chat/client'
import { buildResponderPrompt } from '@/lib/ai/chat/prompts/responder'
import { executePlannerActions } from '@/lib/ai/chat/executor'
import { createTextStreamFromSseResponse } from '@/lib/ai/chat/parsers'
import { validatePlannerResponse } from '@/lib/ai/chat/types'
import type { PlannerResponse, StreamRequestBody } from '@/lib/ai/chat/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function toValidatedPlan(value: unknown): PlannerResponse {
    return validatePlannerResponse(value)
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        const userData = await instantServer.query({
            user_setting: {
                $: { where: { clerk_id: userId } },
                users: {}
            }
        })

        const userSetting = userData.user_setting[0]
        const role = (userSetting?.role as 'ADMIN' | 'STAFF' | 'CUSTOMER') ?? 'CUSTOMER'

        const body = await request.json() as StreamRequestBody
        const message = typeof body?.message === 'string' ? body.message.trim() : ''

        if (!message) {
            return NextResponse.json(
                { error: 'Missing required field: message' },
                { status: 400 }
            )
        }

        const plan = toValidatedPlan(body?.plan)
        const confirmed = Boolean(body?.confirmed)

        const execution = await executePlannerActions(request, plan, confirmed)

        const conversationHistory = Array.isArray(body?.conversationHistory)
            ? body.conversationHistory
                .filter((item) => typeof item?.content === 'string' && (item?.role === 'user' || item?.role === 'assistant'))
                .map((item) => ({ role: item.role, content: item.content }))
                .slice(-12)
            : []

        const locale: 'vi' | 'en' = plan.locale === 'en' ? 'en' : 'vi'
        const responderPrompt = buildResponderPrompt({
            role,
            today: Date.now(),
            locale,
            hasConversationHistory: conversationHistory.length > 0
        })

        const contextPayload = {
            user_message: message,
            locale,
            user_intent: plan.user_intent,
            requires_confirmation: plan.requires_confirmation,
            confirmation_message: plan.confirmation_message,
            confirmed,
            conversation_history: conversationHistory,
            execution
        }

        const response = await createChatCompletion({
            messages: [
                { role: 'system', content: responderPrompt },
                {
                    role: 'user',
                    content: `Generate a final user-facing response from this JSON context:\n${JSON.stringify(contextPayload)}`
                }
            ],
            stream: true,
            temperature: 0.2
        })

        const readable = createTextStreamFromSseResponse(response)

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive'
            }
        })
    } catch (error) {
        console.error('POST /api/ai-chat/stream failed:', error)

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to stream AI chat response'
            },
            { status: 500 }
        )
    }
}
