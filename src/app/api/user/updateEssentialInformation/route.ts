import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { instantServer } from '@/lib/dbServer'
import { getMissingEssentialQuestions } from '@/lib/essentialInformation'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

function parseEssentialInformation(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string') {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
    }

    const body = await request.json()
    const { essential_information, is_submit } = body

    if (typeof is_submit !== 'boolean') {
      return NextResponse.json({ error: 'Invalid field: is_submit must be a boolean' }, { status: 400 })
    }

    const parsedAnswers = parseEssentialInformation(essential_information)

    if (!parsedAnswers) {
      return NextResponse.json(
        { error: 'Invalid field: essential_information must be a valid JSON object string' },
        { status: 400 }
      )
    }

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
      return NextResponse.json({ error: 'User settings not found' }, { status: 404 })
    }

    const missingQuestions = getMissingEssentialQuestions(parsedAnswers)

    if (is_submit && missingQuestions.length > 0) {
      return NextResponse.json(
        {
          error: 'Please complete all required questions before submitting',
          missing_question_ids: missingQuestions.map((question) => question.id),
          missing_question_titles: missingQuestions.map((question) => question.title),
        },
        { status: 400 }
      )
    }

    await instantServer.transact([
      instantServer.tx.user_setting[userSetting.id].update({
        essential_information,
        essential_ready: is_submit && missingQuestions.length === 0,
      }),
    ])

    const updatedUserSettingData = await instantServer.query({
      user_setting: {
        $: {
          where: {
            id: userSetting.id,
          },
        },
        users: {},
      },
    })

    const updatedUserSetting = updatedUserSettingData.user_setting[0]

    if (!updatedUserSetting) {
      return NextResponse.json({ error: 'User setting updated but could not be retrieved' }, { status: 500 })
    }

    return NextResponse.json({ user_setting: updatedUserSetting }, { status: 200 })
  } catch (error) {
    console.error('Error updating essential information:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


