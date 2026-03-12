// src/app/api/history/updateStatus/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { HistoryStatus } from '@/app/type/api'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED_HISTORY_STATUS: HistoryStatus[] = [
  'NEWLY_CREATED',
  'CHECKED_IN',
  'CANCELED',
  'EXPIRED'
]

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

    const body = await request.json()
    const { history_id, status } = body

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

    if (!ALLOWED_HISTORY_STATUS.includes(status as HistoryStatus)) {
      return NextResponse.json(
        { error: 'Invalid history status' },
        { status: 400 }
      )
    }

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

    const contract = history.contract?.[0]
    const currentStatus = history.status as HistoryStatus
    const requestedStatus = status as HistoryStatus

    if (!contract) {
      return NextResponse.json(
        { error: 'History record has no associated contract' },
        { status: 400 }
      )
    }

    const now = Date.now()
    const sessionEndTime = history.date + (history.to * 60 * 1000)

    // New rule: only NEWLY_CREATED can become EXPIRED by time
    if (currentStatus === 'NEWLY_CREATED' && sessionEndTime < now) {
      await instantServer.transact([
        instantServer.tx.history[history_id].update({
          status: 'EXPIRED',
          updated_at: now
        })
      ])

      return NextResponse.json(
        { error: 'Session has expired and cannot be updated' },
        { status: 400 }
      )
    }

    if (currentStatus === 'CANCELED' || currentStatus === 'EXPIRED') {
      return NextResponse.json(
        { error: `Cannot update a session with status ${currentStatus}` },
        { status: 400 }
      )
    }

    // CUSTOMER scope must match purchased contract
    if (role === 'CUSTOMER' && contract.purchased_by !== userInstantId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update sessions for contracts you purchased' },
        { status: 403 }
      )
    }

    let lastCheckInBy: 'CUSTOMER' | 'STAFF' | 'ADMIN' | null = null

    // Handle cancel
    if (requestedStatus === 'CANCELED') {
      if (currentStatus !== 'NEWLY_CREATED') {
        return NextResponse.json(
          { error: 'Only NEWLY_CREATED sessions can be canceled' },
          { status: 400 }
        )
      }

      await instantServer.transact([
        instantServer.tx.history[history_id].update({
          status: 'CANCELED',
          updated_at: now
        })
      ])
    } else if (requestedStatus === 'CHECKED_IN') {
      if (currentStatus === 'CHECKED_IN') {
        return NextResponse.json(
          { error: 'Session is already CHECKED_IN' },
          { status: 400 }
        )
      }

      if (currentStatus !== 'NEWLY_CREATED') {
        return NextResponse.json(
          { error: 'Only NEWLY_CREATED sessions can be checked in' },
          { status: 400 }
        )
      }

      const updateData: {
        status: HistoryStatus
        updated_at: number
        user_check_in_time?: number
        staff_check_in_time?: number
      } = {
        status: 'NEWLY_CREATED',
        updated_at: now
      }

      if (role === 'CUSTOMER') {
        if (history.user_check_in_time) {
          return NextResponse.json(
            { error: 'Customer has already checked in' },
            { status: 400 }
          )
        }
        updateData.user_check_in_time = now
        lastCheckInBy = 'CUSTOMER'
      } else if (role === 'STAFF' || role === 'ADMIN') {
        if (history.staff_check_in_time) {
          return NextResponse.json(
            { error: 'Staff has already checked in' },
            { status: 400 }
          )
        }
        updateData.staff_check_in_time = now
        lastCheckInBy = role
      } else {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 403 }
        )
      }

      const nextUserCheckInTime = updateData.user_check_in_time ?? history.user_check_in_time
      const nextStaffCheckInTime = updateData.staff_check_in_time ?? history.staff_check_in_time

      if (nextUserCheckInTime && nextStaffCheckInTime) {
        updateData.status = 'CHECKED_IN'
      }

      await instantServer.transact([
        instantServer.tx.history[history_id].update(updateData)
      ])
    } else {
      return NextResponse.json(
        { error: 'Invalid transition request' },
        { status: 400 }
      )
    }

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
      {
        history: updatedHistory,
        last_check_in_by: lastCheckInBy
      },
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
