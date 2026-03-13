import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { instantServer } from '@/lib/dbServer'
import { createScopedTokenRequest } from '@/lib/realtime/ablyServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
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
        $: {
          where: {
            clerk_id: userId
          }
        },
        users: {}
      }
    })

    const userSetting = userData.user_setting[0]
    const userInstantId = userSetting?.users?.[0]?.id

    if (!userInstantId) {
      return NextResponse.json(
        { error: 'User instant ID not found' },
        { status: 404 }
      )
    }

    const tokenRequest = await createScopedTokenRequest(userInstantId)
    return NextResponse.json(tokenRequest, { status: 200 })
  } catch (error) {
    console.error('Error creating realtime token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

