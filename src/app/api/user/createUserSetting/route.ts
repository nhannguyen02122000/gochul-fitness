// src/app/api/user/createUserSetting/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import { id } from '@instantdb/admin'

export async function POST(request: Request) {
  try {
    // Check if user is signed in
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
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

    // Check if user_setting already exists
    const existingData = await instantServer.query({
      user_setting: {
        $: {
          where: {
            clerk_id: userId
          }
        }
      }
    })

    if (existingData.user_setting.length > 0) {
      return NextResponse.json(
        { error: 'User setting already exists' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { first_name, last_name } = body

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name and last_name are required' },
        { status: 400 }
      )
    }

    // Validate field types
    if (typeof first_name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: first_name must be a string' },
        { status: 400 }
      )
    }

    if (typeof last_name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: last_name must be a string' },
        { status: 400 }
      )
    }

    // Get email from Clerk user
    const email = clerkUser.emailAddresses?.[0]?.emailAddress

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found in Clerk user data' },
        { status: 400 }
      )
    }

    // Query $users table to find the existing user by email
    // InstantDB automatically creates $users records when users sign in via Clerk
    const usersData = await instantServer.query({
      $users: {
        $: {
          where: {
            email: email
          }
        }
      }
    })

    const existingUser = usersData.$users[0]

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found in $users table. Please ensure you are signed in.' },
        { status: 404 }
      )
    }

    // Generate unique ID for the new user_setting record
    const userSettingId = id()

    // Create user_setting record and link it to the existing $users record
    await instantServer.transact([
      instantServer.tx.user_setting[userSettingId].update({
        clerk_id: userId,
        role: 'CUSTOMER',
        first_name,
        last_name
      }).link({ users: existingUser.id })
    ])

    // Query the created user_setting to return it
    const createdUserSettingData = await instantServer.query({
      user_setting: {
        $: {
          where: {
            id: userSettingId
          }
        },
        users: {}
      }
    })

    const createdUserSetting = createdUserSettingData.user_setting[0]

    if (!createdUserSetting) {
      return NextResponse.json(
        { error: 'User setting created but could not be retrieved' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { user_setting: createdUserSetting },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating user setting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

