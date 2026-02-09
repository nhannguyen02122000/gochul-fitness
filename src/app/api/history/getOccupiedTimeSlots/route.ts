// src/app/api/history/getOccupiedTimeSlots/route.ts
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'


// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const dateParam = searchParams.get('date')

    // Validate required parameters
    if (!userId) {
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

    // Query existing history records for that user (teach_by) on the same date
    const existingHistoryData = await instantServer.query({
      history: {
        $: {
          where: {
            teach_by: userId,
            date: date
          }
        }
      }
    })

    const existingHistory = existingHistoryData.history || []

    console.log('=== DEBUG: getOccupiedTimeSlots ===')
    console.log('User ID:', userId)
    console.log('Date:', date, '(', new Date(date).toISOString(), ')')
    console.log('Total history records found:', existingHistory.length)
    console.log('History records:', existingHistory.map(h => ({
      id: h.id,
      status: h.status,
      from: h.from,
      to: h.to
    })))
    console.log('===================================')

    // Filter out canceled and expired sessions, and extract time ranges
    const occupiedSlots = existingHistory
      .filter(session => {
        const isActive = session.status !== 'CANCELED' && session.status !== 'EXPIRED'
        console.log(`Session ${session.id}: status=${session.status}, isActive=${isActive}`)
        return isActive
      })
      .map(session => ({
        from: session.from,
        to: session.to
      }))

    console.log('Occupied slots after filtering:', occupiedSlots)

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

