// src/app/api/history/getOccupiedTimeSlots/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getHistoryCreatedAt(session: Record<string, unknown>): number {
  if (typeof session.created_at === 'number') return session.created_at
  if (typeof session.date === 'number') return session.date
  return 0
}

function getHistoryUpdatedAt(session: Record<string, unknown>): number {
  if (typeof session.updated_at === 'number') return session.updated_at
  return getHistoryCreatedAt(session)
}

function compareHistoryLatestFirst(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): number {
  const updatedDiff = getHistoryUpdatedAt(b) - getHistoryUpdatedAt(a)
  if (updatedDiff !== 0) return updatedDiff

  const createdDiff = getHistoryCreatedAt(b) - getHistoryCreatedAt(a)
  if (createdDiff !== 0) return createdDiff

  const bDate = typeof b.date === 'number' ? b.date : 0
  const aDate = typeof a.date === 'number' ? a.date : 0
  if (bDate !== aDate) return bDate - aDate

  const bFrom = typeof b.from === 'number' ? b.from : 0
  const aFrom = typeof a.from === 'number' ? a.from : 0
  if (bFrom !== aFrom) return bFrom - aFrom

  const bId = typeof b.id === 'string' ? b.id : ''
  const aId = typeof a.id === 'string' ? a.id : ''
  return bId.localeCompare(aId)
}

export async function GET(request: Request) {
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

    const requesterInstantId = userSetting.users?.[0]?.id

    if (!requesterInstantId) {
      return NextResponse.json(
        { error: 'User instant ID not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const trainerUserId = searchParams.get('user_id')
    const dateParam = searchParams.get('date')

    // Validate required parameters
    if (!trainerUserId) {
      return NextResponse.json(
        { error: 'Missing required parameter: user_id' },
        { status: 400 }
      )
    }

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: date' },
        { status: 400 }
      )
    }

    const date = parseInt(dateParam)

    if (isNaN(date)) {
      return NextResponse.json(
        { error: 'Invalid date parameter: must be a number (timestamp)' },
        { status: 400 }
      )
    }

    const role = userSetting.role

    // Role validation:
    // - ADMIN can query any trainer
    // - STAFF can query their own schedule
    // - CUSTOMER can query any trainer for booking availability
    if (role === 'STAFF' && requesterInstantId !== trainerUserId) {
      return NextResponse.json(
        { error: 'Forbidden - STAFF can only query their own schedule' },
        { status: 403 }
      )
    }

    if (role !== 'ADMIN' && role !== 'STAFF' && role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Forbidden - Invalid user role' },
        { status: 403 }
      )
    }

    // Query existing history records for that trainer (teach_by) on the same date
    const existingHistoryData = await instantServer.query({
      history: {
        $: {
          where: {
            teach_by: trainerUserId,
            date
          }
        }
      }
    })

    const existingHistory = existingHistoryData.history || []

    // Filter out canceled and expired sessions, then sort latest-first
    const occupiedSessions = existingHistory
      .filter(
        (session) => session.status !== 'CANCELED' && session.status !== 'EXPIRED'
      )
      .sort((a, b) =>
        compareHistoryLatestFirst(
          a as Record<string, unknown>,
          b as Record<string, unknown>
        )
      )

    // Return occupied slots in session-latest order
    const occupiedSlots = occupiedSessions.map((session) => ({
      from: session.from,
      to: session.to
    }))

    return NextResponse.json({
      occupied_slots: occupiedSlots
    })
  } catch (error) {
    console.error('Error fetching occupied time slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

