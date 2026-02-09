// src/app/api/user/getByRole/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'


// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function GET(request: Request) {
  try {
    // Check if user is signed in
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Get role parameter from query string
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    if (!role) {
      return NextResponse.json(
        { error: 'Missing required parameter: role' },
        { status: 400 }
      )
    }

    // Get user settings to check if requester is ADMIN or STAFF
    const userData = await instantServer.query({
      user_setting: {
        $: {
          where: {
            clerk_id: userId
          }
        }
      }
    })

    const userSetting = userData.user_setting[0]

    if (!userSetting) {
      return NextResponse.json(
        { error: 'User settings not found' },
        { status: 404 }
      )
    }

    // Only ADMIN and STAFF can query users by role
    if (userSetting.role !== 'ADMIN' && userSetting.role !== 'STAFF') {
      return NextResponse.json(
        { error: 'Forbidden - Only ADMIN or STAFF can query users' },
        { status: 403 }
      )
    }

    // Query users by role
    const usersData = await instantServer.query({
      user_setting: {
        $: {
          where: {
            role: role
          }
        },
        users: {}
      }
    })

    const users = usersData.user_setting || []

    return NextResponse.json({
      users
    })

  } catch (error) {
    console.error('Error fetching users by role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

