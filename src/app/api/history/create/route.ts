// src/app/api/history/create/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import { id } from '@instantdb/admin'
import type { History } from '@/app/type/api'


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
    const { contract_id, date, from, to } = body

    // Validate required fields
    if (!contract_id || date === undefined || from === undefined || to === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: contract_id, date, from, and to are required' },
        { status: 400 }
      )
    }

    // Validate field types
    if (typeof contract_id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: contract_id must be a string' },
        { status: 400 }
      )
    }

    if (typeof date !== 'number') {
      return NextResponse.json(
        { error: 'Invalid field: date must be a number (timestamp)' },
        { status: 400 }
      )
    }

    if (typeof from !== 'number') {
      return NextResponse.json(
        { error: 'Invalid field: from must be a number' },
        { status: 400 }
      )
    }

    if (typeof to !== 'number') {
      return NextResponse.json(
        { error: 'Invalid field: to must be a number' },
        { status: 400 }
      )
    }

    // Validate time range
    if (from >= to) {
      return NextResponse.json(
        { error: 'Invalid time range: from must be less than to' },
        { status: 400 }
      )
    }

    // Check if contract exists
    const contractData = await instantServer.query({
      contract: {
        $: {
          where: {
            id: contract_id
          }
        },
        users: {},
        sale_by_user: {},
        purchased_by_user: {}
      }
    })

    const contract = contractData.contract[0]

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Role-based authorization
    if (role === 'CUSTOMER') {
      // CUSTOMER can only create history for contracts they purchased
      if (contract.purchased_by !== userInstantId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only create history for contracts you purchased' },
          { status: 403 }
        )
      }
    } else if (role === 'ADMIN' || role === 'STAFF') {
      // ADMIN/STAFF can create history for any contract
      // No additional checks needed
    } else {
      // Unknown role
      return NextResponse.json(
        { error: 'Forbidden - Invalid user role' },
        { status: 403 }
      )
    }

    // Check if contract status is ACTIVE
    if (contract.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Contract is not active. Only active contracts can create sessions.' },
        { status: 400 }
      )
    }

    // Check if contract has expired
    const now = Date.now()
    if (contract.end_date && contract.end_date < now) {
      // Update contract status to EXPIRED
      await instantServer.transact([
        instantServer.tx.contract[contract_id].update({
          status: 'EXPIRED'
        })
      ])

      return NextResponse.json(
        { error: 'Contract has expired' },
        { status: 400 }
      )
    }

    // Check credits for PT and REHAB contracts
    if (contract.kind === 'PT' || contract.kind === 'REHAB') {
      if (!contract.credits) {
        return NextResponse.json(
          { error: 'Contract does not have credits assigned' },
          { status: 400 }
        )
      }

      // Count history records with PT_CHECKED_IN status for this contract
      const usedCredits = contract.history?.filter(
        (h: History) => h.status === 'PT_CHECKED_IN'
      ).length || 0

      if (usedCredits >= contract.credits) {
        return NextResponse.json(
          { error: `No credits available. Used ${usedCredits} of ${contract.credits} credits.` },
          { status: 400 }
        )
      }
    }

    // Get teach_by user from contract's sale_by field
    const teachBy = contract.sale_by

    if (!teachBy) {
      return NextResponse.json(
        { error: 'Contract does not have a sale_by user assigned' },
        { status: 400 }
      )
    }

    // Query existing history records for that teach_by user on the same date
    const existingHistoryData = await instantServer.query({
      history: {
        $: {
          where: {
            teach_by: teachBy,
            date: date
          }
        }
      }
    })

    const existingHistory = existingHistoryData.history || []

    // Check for time overlap with existing sessions
    for (const session of existingHistory) {
      // Skip canceled or expired sessions
      if (session.status === 'CANCELED' || session.status === 'EXPIRED') {
        continue
      }

      // Check if time ranges overlap
      // Overlap if: newFrom < existingTo AND newTo > existingFrom
      if (from < session.to && to > session.from) {
        return NextResponse.json(
          {
            error: `Time conflict: The trainer already has a session from ${session.from} to ${session.to} on this date`
          },
          { status: 400 }
        )
      }
    }

    // Generate a unique ID for the new history record
    const historyId = id()

    // Create the history record with status NEWLY_CREATED
    await instantServer.transact([
      instantServer.tx.history[historyId].update({
        date,
        from,
        to,
        status: 'NEWLY_CREATED',
        teach_by: teachBy
      }),
      // Link history to contract
      instantServer.tx.history[historyId].link({
        contract: contract_id
      }),
      // Link history to user who created it
      instantServer.tx.history[historyId].link({
        users: userInstantId
      })
    ])

    // Query the created history to return it
    const createdHistoryData = await instantServer.query({
      history: {
        $: {
          where: {
            id: historyId
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

    const createdHistory = createdHistoryData.history[0]

    if (!createdHistory) {
      return NextResponse.json(
        { error: 'History created but could not be retrieved' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { history: createdHistory },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

