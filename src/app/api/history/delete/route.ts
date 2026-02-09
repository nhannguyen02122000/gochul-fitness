// src/app/api/history/delete/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'


// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0
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

    // Get user settings to check role
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
        { error: 'User settings not found' },
        { status: 404 }
      )
    }

    const userInstantId = userSetting.users?.[0]?.id

    if (!userInstantId) {
      return NextResponse.json(
        { error: 'User instant ID not found' },
        { status: 404 }
      )
    }

    const role = userSetting.role

    // Parse request body
    const body = await request.json()
    const { history_id } = body

    // Validate required field: history_id
    if (!history_id || typeof history_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: history_id must be a string' },
        { status: 400 }
      )
    }

    // Check if history exists
    const existingHistoryData = await instantServer.query({
      history: {
        $: {
          where: {
            id: history_id
          }
        },
        users: {},
        contract: {
          purchased_by_user: {}
        }
      }
    })

    const existingHistory = existingHistoryData.history[0]

    if (!existingHistory) {
      return NextResponse.json(
        { error: 'History not found' },
        { status: 404 }
      )
    }

    // Check permissions based on role
    if (role === 'CUSTOMER') {
      // CUSTOMER: Must be the one who purchased the contract
      const contract = existingHistory.contract?.[0]
      const contractPurchasedBy = contract?.purchased_by
      if (contractPurchasedBy !== userInstantId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only delete history for contracts you purchased' },
          { status: 403 }
        )
      }
    } else if (role !== 'ADMIN') {
      // STAFF or other roles: Must be the user who created the history
      const createdByUser = existingHistory.users?.[0]?.id
      if (createdByUser !== userInstantId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only delete your own history records' },
          { status: 403 }
        )
      }
    }
    // ADMIN can delete any history

    // Soft delete: Update status to CANCELED instead of hard delete
    await instantServer.transact([
      instantServer.tx.history[history_id].update({
        status: 'CANCELED'
      })
    ])

    return NextResponse.json(
      {
        message: 'History canceled successfully',
        history_id: history_id
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

