// src/app/api/contract/updateStatus/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { ContractStatus } from '@/app/type/api'
import { isCompletedHistoryStatus, isPreActiveContractStatus } from '@/utils/statusUtils'


// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    return isCompletedHistoryStatus(typeof status === 'string' ? status : '')
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
    const { contract_id, status } = body

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
      'CUSTOMER_REVIEW',
      'CUSTOMER_CONFIRMED',
      'CUSTOMER_PAID',
      'PT_CONFIRMED',
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
      currentStatus === 'ACTIVE' && !hasAvailableCredits(contract)

    if (shouldExpireByDate || shouldExpireByCredits) {
      await instantServer.transact([
        instantServer.tx.contract[contract_id].update({
          status: 'EXPIRED'
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
    } else if (newStatus === 'CANCELED') {
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

      if (role === 'CUSTOMER' && contract.purchased_by !== userInstantId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only cancel contracts you purchased' },
          { status: 403 }
        )
      }
    } else if (role === 'STAFF') {
      // STAFF can: NEWLY_CREATED -> CUSTOMER_REVIEW -> (customer steps) -> CUSTOMER_PAID -> PT_CONFIRMED -> ACTIVE
      const isAllowedStaffTransition =
        (currentStatus === 'NEWLY_CREATED' && newStatus === 'CUSTOMER_REVIEW') ||
        (currentStatus === 'CUSTOMER_PAID' && newStatus === 'PT_CONFIRMED') ||
        (currentStatus === 'PT_CONFIRMED' && newStatus === 'ACTIVE')

      if (!isAllowedStaffTransition) {
        return NextResponse.json(
          { error: 'Invalid status transition for STAFF role' },
          { status: 403 }
        )
      }
    } else if (role === 'CUSTOMER') {
      if (contract.purchased_by !== userInstantId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only update contracts you purchased' },
          { status: 403 }
        )
      }

      const isAllowedCustomerTransition =
        (currentStatus === 'CUSTOMER_REVIEW' && newStatus === 'CUSTOMER_CONFIRMED') ||
        (currentStatus === 'CUSTOMER_CONFIRMED' && newStatus === 'CUSTOMER_PAID')

      if (!isAllowedCustomerTransition) {
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

    // Handle date adjustments when activating a contract before its start_date
    const dateUpdates: { start_date?: number; end_date?: number } = {}

    if (newStatus === 'ACTIVE' && contract.start_date && contract.end_date) {
      // If activating before the start_date, adjust both dates
      if (now < contract.start_date) {
        // Calculate the original contract duration (in milliseconds)
        const contractDuration = contract.end_date - contract.start_date

        // Set new start_date to current date
        dateUpdates.start_date = now

        // Set new end_date to current date + original duration
        dateUpdates.end_date = now + contractDuration
      }
    }

    // Update the contract status and dates if needed
    const updateData: { status: ContractStatus; start_date?: number; end_date?: number } = {
      status: newStatus,
      ...dateUpdates
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

