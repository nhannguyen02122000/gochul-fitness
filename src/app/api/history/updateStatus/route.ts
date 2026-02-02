// src/app/api/history/updateStatus/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { HistoryStatus } from '@/app/type/api'

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
    const { history_id, status } = body

    // Validate required fields
    if (!history_id || typeof history_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: history_id must be a string' },
        { status: 400 }
      )
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: status must be a string' },
        { status: 400 }
      )
    }

    // Check if history exists
    const historyData = await instantServer.query({
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

    const history = historyData.history[0]

    if (!history) {
      return NextResponse.json(
        { error: 'History not found' },
        { status: 404 }
      )
    }

    const currentStatus = history.status as HistoryStatus
    const newStatus = status as HistoryStatus

    // Calculate session end time: date + (to * 60 * 1000)
    const sessionEndTime = history.date + (history.to * 60 * 1000)
    const now = Date.now()

    // Check if session has expired
    if (sessionEndTime < now) {
      // Auto-set to EXPIRED
      await instantServer.transact([
        instantServer.tx.history[history_id].update({
          status: 'EXPIRED'
        })
      ])

      return NextResponse.json(
        { error: 'Session has expired and cannot be updated' },
        { status: 400 }
      )
    }

    // Validate status transitions based on role
    if (role === 'ADMIN') {
      // ADMIN can force any status change
      // No restrictions
    } else if (newStatus === 'CANCELED') {
      // Anyone can cancel from any status except PT_CHECKED_IN, EXPIRED, CANCELED
      if (currentStatus === 'PT_CHECKED_IN' || currentStatus === 'EXPIRED' || currentStatus === 'CANCELED') {
        return NextResponse.json(
          { error: `Cannot cancel a session with status ${currentStatus}` },
          { status: 400 }
        )
      }
      // Verify user has permission to cancel
      const contract = history.contract?.[0]
      const contractPurchasedBy = contract?.purchased_by
      const isCustomerOwner = contractPurchasedBy === userInstantId
      const isStaff = role === 'STAFF'

      if (!isCustomerOwner && !isStaff) {
        return NextResponse.json(
          { error: 'Forbidden - You do not have permission to cancel this session' },
          { status: 403 }
        )
      }
      // Allowed to cancel
    } else {
      // Validate workflow transitions
      if (role === 'STAFF') {
        // STAFF can: NEWLY_CREATED → PT_CONFIRMED, USER_CHECKED_IN → PT_CHECKED_IN
        if (currentStatus === 'NEWLY_CREATED' && newStatus === 'PT_CONFIRMED') {
          // Allowed
        } else if (currentStatus === 'USER_CHECKED_IN' && newStatus === 'PT_CHECKED_IN') {
          // Allowed
        } else {
          return NextResponse.json(
            { error: 'Invalid status transition for STAFF role' },
            { status: 403 }
          )
        }
      } else if (role === 'CUSTOMER') {
        // Verify this is the customer who purchased the contract
        const contract = history.contract?.[0]
        const contractPurchasedBy = contract?.purchased_by
        if (contractPurchasedBy !== userInstantId) {
          return NextResponse.json(
            { error: 'Forbidden - You can only update sessions for contracts you purchased' },
            { status: 403 }
          )
        }

        // CUSTOMER can: PT_CONFIRMED → USER_CHECKED_IN
        if (currentStatus === 'PT_CONFIRMED' && newStatus === 'USER_CHECKED_IN') {
          // Allowed
        } else {
          return NextResponse.json(
            { error: 'Invalid status transition for CUSTOMER role' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 403 }
        )
      }
    }

    // Update the history status
    await instantServer.transact([
      instantServer.tx.history[history_id].update({
        status: newStatus
      })
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
    console.error('Error updating history status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

