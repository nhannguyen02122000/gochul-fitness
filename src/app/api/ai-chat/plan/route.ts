import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { instantServer } from '@/lib/dbServer'
import { createNonStreamChatCompletion } from '@/lib/ai/chat/client'
import { buildPlannerPrompt } from '@/lib/ai/chat/prompts/planner'
import { parseJsonObjectFromModel } from '@/lib/ai/chat/parsers'
import { validatePlannerResponse } from '@/lib/ai/chat/types'
import type { PlanRequestBody } from '@/lib/ai/chat/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

        const body = await request.json() as PlanRequestBody
        const message = typeof body?.message === 'string' ? body.message.trim() : ''

        if (!message) {
            return NextResponse.json(
                { error: 'Missing required field: message' },
                { status: 400 }
            )
        }

        const conversationLocale = body?.conversationLocale === 'en' || body?.conversationLocale === 'vi'
            ? body.conversationLocale
            : undefined

        const conversationHistory = Array.isArray(body?.conversationHistory)
            ? body.conversationHistory
                .filter((item) => typeof item?.content === 'string' && (item?.role === 'user' || item?.role === 'assistant'))
                .map((item) => ({ role: item.role, content: item.content }))
                .slice(-12)
            : []

        const plannerPrompt = buildPlannerPrompt({
            role,
            today: Date.now(),
            conversationLocale,
            hasConversationHistory: conversationHistory.length > 0
        })

        const plannerRaw = await createNonStreamChatCompletion(
            [
                { role: 'system', content: plannerPrompt },
                ...(conversationHistory.length > 0
                    ? [{
                        role: 'user' as const,
                        content: `Conversation history JSON:\n${JSON.stringify(conversationHistory)}`
                    }]
                    : []),
                { role: 'user', content: message }
            ],
            0
        )

        const plannerJson = parseJsonObjectFromModel<unknown>(plannerRaw)
        const plan = validatePlannerResponse(plannerJson)

        return NextResponse.json({ plan }, { status: 200 })
    } catch (error) {
        console.error('POST /api/ai-chat/plan failed:', error)

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to build AI execution plan'
            },
            { status: 500 }
        )
    }
}
