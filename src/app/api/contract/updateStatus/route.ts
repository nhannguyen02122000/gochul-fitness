// src/app/api/contract/updateStatus/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { publishRealtimeEventSafely } from '@/lib/realtime/ablyServer'
import { NextResponse } from 'next/server'
import type { ContractStatus } from '@/app/type/api'
import { isPreActiveContractStatus } from '@/utils/statusUtils'


// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

function isCreditUsedHistoryStatus(status: unknown): boolean {
  return status === 'NEWLY_CREATED' || status === 'CHECKED_IN'
}

function hasAvailableCredits(contract: Record<string, unknown>): boolean {
  const kind = typeof contract.kind === 'string' ? contract.kind : undefined
  const credits = typeof contract.credits === 'number' ? contract.credits : undefined
  const history = Array.isArray(contract.history)
    ? contract.history
    : []

  if (kind !== 'PT' && kind !== 'REHAB') {
    return true
  }

  if (!credits || credits <= 0) {
    return false
  }

  const usedCredits = history.filter((item) => {
    if (!item || typeof item !== 'object') return false
    const status = (item as Record<string, unknown>).status
    return isCreditUsedHistoryStatus(typeof status === 'string' ? status : '')
  }).length

  return usedCredits < credits
}

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
    const { contract_id, status, start_date: bodyStartDate, end_date: bodyEndDate } = body

    // Validate required fields
    if (!contract_id || typeof contract_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: contract_id must be a string' },
        { status: 400 }
      )
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: status must be a string' },
        { status: 400 }
      )
    }

    // Parse optional date overrides
    const startDateOverride =
      typeof bodyStartDate === 'number' ? bodyStartDate : undefined
    const endDateOverride =
      typeof bodyEndDate === 'number' ? bodyEndDate : undefined

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
        purchased_by_user: {},
        history: {}
      }
    })

    const contract = contractData.contract[0]

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    const currentStatus = contract.status as ContractStatus
    const newStatus = status as ContractStatus

    const validStatuses: ContractStatus[] = [
      'NEWLY_CREATED',
      'ACTIVE',
      'CANCELED',
      'EXPIRED'
    ]

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Auto-expire checks before transition validation
    const now = Date.now()
    const shouldExpireByDate =
      isPreActiveContractStatus(currentStatus) &&
      !!contract.end_date &&
      contract.end_date < now

    const shouldExpireByCredits =
      currentStatus === 'ACTIVE' &&
      !!contract.end_date &&
      contract.end_date < now &&
      !hasAvailableCredits(contract)

    if (shouldExpireByDate || shouldExpireByCredits) {
      await instantServer.transact([
        instantServer.tx.contract[contract_id].update({
          status: 'EXPIRED',
          updated_at: now
        })
      ])

      return NextResponse.json(
        { error: 'Contract has expired and cannot be updated' },
        { status: 400 }
      )
    }

    // Validate status transitions based on role
    if (role === 'ADMIN') {
      // ADMIN can force any status change
    } else if (role === 'STAFF') {
      // STAFF can cancel NEWLY_CREATED contracts (with sale_by ownership check)
      if (newStatus === 'CANCELED' && currentStatus === 'NEWLY_CREATED') {
        // ownership check: STAFF can only cancel contracts they sold
        if (contract.sale_by !== userInstantId) {
          return NextResponse.json(
            { error: 'Forbidden - You can only cancel contracts you sold' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid status transition for STAFF role' },
          { status: 403 }
        )
      }
    } else if (role === 'CUSTOMER') {
      if (newStatus === 'CANCELED') {
        // Non-admin can cancel only pre-ACTIVE and non-terminal statuses
        if (currentStatus === 'ACTIVE') {
          return NextResponse.json(
            { error: 'Cannot cancel an ACTIVE contract. Only ADMIN can perform this action.' },
            { status: 403 }
          )
        }
        if (currentStatus === 'CANCELED') {
          return NextResponse.json(
            { error: 'Contract is already canceled' },
            { status: 400 }
          )
        }
        if (currentStatus === 'EXPIRED') {
          return NextResponse.json(
            { error: 'Cannot cancel an expired contract' },
            { status: 400 }
          )
        }
        if (contract.purchased_by !== userInstantId) {
          return NextResponse.json(
            { error: 'Forbidden - You can only cancel contracts you purchased' },
            { status: 403 }
          )
        }
      } else if (newStatus === 'ACTIVE' && currentStatus === 'NEWLY_CREATED') {
        // CUSTOMER activates their own NEWLY_CREATED contract
        // Dates are reset to today in the update below (D-12)
        if (contract.purchased_by !== userInstantId) {
          return NextResponse.json(
            { error: 'Forbidden - You can only update contracts you purchased' },
            { status: 403 }
          )
        }
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

    // Update the contract status
    // Use date overrides if provided (client-side Case 2 flow), otherwise use current time
    const effectiveStartDate = startDateOverride ?? now
    const effectiveEndDate = endDateOverride ?? now

    const updateData: {
      status: ContractStatus
      updated_at: number
      start_date: number
      end_date: number
    } = {
      status: newStatus,
      updated_at: now,
      start_date: effectiveStartDate,
      end_date: effectiveEndDate
    }

    await instantServer.transact([
      instantServer.tx.contract[contract_id].update(updateData)
    ])

    // Query the updated contract to return it
    const updatedContractData = await instantServer.query({
      contract: {
        $: {
          where: {
            id: contract_id
          }
        },
        users: {},
        sale_by_user: {},
        purchased_by_user: {},
        history: {}
      }
    })

    const updatedContract = updatedContractData.contract[0]

    if (!updatedContract) {
      return NextResponse.json(
        { error: 'Contract updated but could not be retrieved' },
        { status: 500 }
      )
    }

    await publishRealtimeEventSafely({
      eventName: 'contract.changed',
      userIds: [userInstantId, updatedContract.sale_by, updatedContract.purchased_by],
      payload: {
        entity_id: updatedContract.id,
        action: 'update_status',
        triggered_by: userInstantId,
        timestamp: Date.now()
      }
    })

    return NextResponse.json(
      { contract: updatedContract },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating contract status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

