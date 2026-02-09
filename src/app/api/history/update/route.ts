// src/app/api/history/update/route.ts
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
    const { history_id, date, from, to, status } = body

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
          users: {},
          sale_by_user: {},
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
          { error: 'Forbidden - You can only update history for contracts you purchased' },
          { status: 403 }
        )
      }
    } else if (role !== 'ADMIN') {
      // STAFF or other roles: Must be the user who created the history
      const createdByUser = existingHistory.users?.[0]?.id
      if (createdByUser !== userInstantId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only update your own history records' },
          { status: 403 }
        )
      }
    }
    // ADMIN can update any history

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    // Validate and add optional fields if provided
    if (date !== undefined) {
      if (typeof date !== 'number') {
        return NextResponse.json(
          { error: 'Invalid field: date must be a number (timestamp)' },
          { status: 400 }
        )
      }
      updateData.date = date
    }

    if (from !== undefined) {
      if (typeof from !== 'number') {
        return NextResponse.json(
          { error: 'Invalid field: from must be a number' },
          { status: 400 }
        )
      }
      updateData.from = from
    }

    if (to !== undefined) {
      if (typeof to !== 'number') {
        return NextResponse.json(
          { error: 'Invalid field: to must be a number' },
          { status: 400 }
        )
      }
      updateData.to = to
    }

    if (status !== undefined) {
      if (typeof status !== 'string') {
        return NextResponse.json(
          { error: 'Invalid field: status must be a string' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update provided' },
        { status: 400 }
      )
    }

    // If date, from, or to is being changed, validate time conflicts
    const newDate = date !== undefined ? date : existingHistory.date
    const newFrom = from !== undefined ? from : existingHistory.from
    const newTo = to !== undefined ? to : existingHistory.to

    // Validate time range
    if (newFrom >= newTo) {
      return NextResponse.json(
        { error: 'Invalid time range: from must be less than to' },
        { status: 400 }
      )
    }

    // If time or date changed, check contract and conflicts
    if (date !== undefined || from !== undefined || to !== undefined) {
      const contract = existingHistory.contract?.[0]

      if (!contract) {
        return NextResponse.json(
          { error: 'History record has no associated contract' },
          { status: 400 }
        )
      }

      // Check if contract status is ACTIVE
      if (contract.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Contract is not active. Cannot update session.' },
          { status: 400 }
        )
      }

      // Check if contract has expired
      const now = Date.now()
      if (contract.end_date && contract.end_date < now) {
        // Update contract status to EXPIRED
        await instantServer.transact([
          instantServer.tx.contract[contract.id].update({
            status: 'EXPIRED'
          })
        ])

        return NextResponse.json(
          { error: 'Contract has expired' },
          { status: 400 }
        )
      }

      // Query existing history records for that teach_by user on the same date
      const conflictHistoryData = await instantServer.query({
        history: {
          $: {
            where: {
              teach_by: existingHistory.teach_by,
              date: newDate
            }
          }
        }
      })

      const conflictHistory = conflictHistoryData.history || []

      // Check for time overlap with existing sessions (excluding current session)
      for (const session of conflictHistory) {
        // Skip the current session being updated
        if (session.id === history_id) {
          continue
        }

        // Skip canceled or expired sessions
        if (session.status === 'CANCELED' || session.status === 'EXPIRED') {
          continue
        }

        // Check if time ranges overlap
        if (newFrom < session.to && newTo > session.from) {
          return NextResponse.json(
            {
              error: `Time conflict: The trainer already has a session from ${session.from} to ${session.to} on this date`
            },
            { status: 400 }
          )
        }
      }
    }

    // Update the history using InstantDB transaction
    await instantServer.transact([
      instantServer.tx.history[history_id].update(updateData)
    ])

    // Query the updated history to return it
    const updatedHistoryData = await instantServer.query({
      history: {
        $: {
          where: {
            id: history_id
          }
        },
        users: {},
        contract: {
          users: {},
          sale_by_user: {},
          purchased_by_user: {}
        }
      }
    })

    const updatedHistory = updatedHistoryData.history[0]

    if (!updatedHistory) {
      return NextResponse.json(
        { error: 'History updated but could not be retrieved' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { history: updatedHistory },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

