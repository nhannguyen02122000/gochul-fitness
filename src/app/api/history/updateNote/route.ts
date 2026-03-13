import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { instantServer } from '@/lib/dbServer'
import { publishRealtimeEventSafely } from '@/lib/realtime/ablyServer'
import type { Role } from '@/app/type/api'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getNoteFieldByRole(role: Role): 'staff_note' | 'customer_note' | null {
  if (role === 'CUSTOMER') {
    return 'customer_note'
  }

  if (role === 'STAFF' || role === 'ADMIN') {
    return 'staff_note'
  }

  return null
}

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

    const role = userSetting.role as Role
    const noteField = getNoteFieldByRole(role)

    if (!noteField) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { history_id, note } = body

    if (!history_id || typeof history_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: history_id must be a string' },
        { status: 400 }
      )
    }

    if (typeof note !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: note must be a string' },
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

    if (!contract) {
      return NextResponse.json(
        { error: 'History record has no associated contract' },
        { status: 400 }
      )
    }

    if (role === 'CUSTOMER' && contract.purchased_by !== userInstantId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update notes for contracts you purchased' },
        { status: 403 }
      )
    }

    if (role === 'STAFF' && history.teach_by !== userInstantId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update notes for your assigned sessions' },
        { status: 403 }
      )
    }

    const now = Date.now()

    await instantServer.transact([
      instantServer.tx.history[history_id].update({
        [noteField]: note,
        updated_at: now
      })
    ])

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

    const updatedContract = updatedHistory.contract?.[0]

    await publishRealtimeEventSafely({
      eventName: 'history.changed',
      userIds: [
        userInstantId,
        updatedHistory.users?.[0]?.id,
        updatedContract?.purchased_by,
        updatedContract?.sale_by,
        updatedHistory.teach_by
      ],
      payload: {
        entity_id: updatedHistory.id,
        action: 'update_note',
        triggered_by: userInstantId,
        timestamp: now
      }
    })

    return NextResponse.json(
      { history: updatedHistory },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating history note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

