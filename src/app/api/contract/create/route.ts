// src/app/api/contract/create/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import { id } from '@instantdb/admin'


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

    // Check if user has permission to create contracts (ADMIN or STAFF only)
    if (role !== 'ADMIN' && role !== 'STAFF') {
      return NextResponse.json(
        { error: 'Forbidden - Only ADMIN or STAFF can create contracts' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { kind, money, purchased_by, start_date, end_date, credits } = body

    // Validate required fields
    if (!kind || money === undefined || !purchased_by) {
      return NextResponse.json(
        { error: 'Missing required fields: kind, money, and purchased_by are required' },
        { status: 400 }
      )
    }

    // Validate field types
    if (typeof kind !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: kind must be a string' },
        { status: 400 }
      )
    }

    if (typeof money !== 'number') {
      return NextResponse.json(
        { error: 'Invalid field: money must be a number' },
        { status: 400 }
      )
    }

    if (typeof purchased_by !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: purchased_by must be a string' },
        { status: 400 }
      )
    }

    // Set default status to NEWLY_CREATED
    const status = 'NEWLY_CREATED'

    // Validate optional fields if provided
    if (start_date !== undefined && typeof start_date !== 'number') {
      return NextResponse.json(
        { error: 'Invalid field: start_date must be a number (timestamp)' },
        { status: 400 }
      )
    }

    if (end_date !== undefined && typeof end_date !== 'number') {
      return NextResponse.json(
        { error: 'Invalid field: end_date must be a number (timestamp)' },
        { status: 400 }
      )
    }

    if (credits !== undefined && typeof credits !== 'number') {
      return NextResponse.json(
        { error: 'Invalid field: credits must be a number' },
        { status: 400 }
      )
    }

    // Auto-fill created_at with current timestamp
    const created_at = Date.now()

    // Generate a unique ID for the new contract using InstantDB's id() function
    const contractId = id()

    // Create the contract using InstantDB transaction
    await instantServer.transact([
      instantServer.tx.contract[contractId].update({
        created_at,
        kind,
        status,
        money,
        sale_by: userInstantId,
        purchased_by,
        ...(start_date !== undefined && { start_date }),
        ...(end_date !== undefined && { end_date }),
        ...(credits !== undefined && { credits })
      })
        .link({ sale_by_user: userInstantId })
        .link({ purchased_by_user: purchased_by })
    ])

    // Query the created contract to return it
    const createdContractData = await instantServer.query({
      contract: {
        $: {
          where: {
            id: contractId
          }
        },
        users: {},
        sale_by_user: {},
        purchased_by_user: {},
        history: {}
      }
    })

    const createdContract = createdContractData.contract[0]

    if (!createdContract) {
      return NextResponse.json(
        { error: 'Contract created but could not be retrieved' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { contract: createdContract },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

