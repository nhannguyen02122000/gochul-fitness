// src/app/api/user/checkUserSetting/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'


// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function GET() {
  try {
    // Check if user is signed in
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Query the user_setting entity by clerk_id
    const data = await instantServer.query({
      user_setting: {
        $: {
          where: {
            clerk_id: userId
          }
        },
        users: {}
      }
    })

    const userSetting = data.user_setting[0]

    // Return whether user_setting exists
    if (userSetting) {
      return NextResponse.json({
        exists: true,
        user_setting: userSetting
      })
    } else {
      return NextResponse.json({
        exists: false
      })
    }

  } catch (error) {
    console.error('Error checking user setting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

