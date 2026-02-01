// src/app/api/user/getUserInformation/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get the authenticated user from Clerk
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get full Clerk user data
    const clerkUser = await currentUser()

    if (!clerkUser) {
      return NextResponse.json(
        { error: 'Clerk user not found' },
        { status: 404 }
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

    const userSetting = data.user_setting[0] || {}

    // Merge Clerk user data with database settings
    return NextResponse.json({
      ...clerkUser,
      ...userSetting,
      // If you want to keep the instantDB user data separate
      instantUser: userSetting.users
    })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}