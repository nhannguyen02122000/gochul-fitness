// src/app/api/contract/updateStatus/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { ContractStatus } from '@/app/type/api'


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

    // Check if contract has expired
    const now = Date.now()
    if (contract.end_date && contract.end_date < now) {
      // Auto-set to EXPIRED
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
      // No restrictions
    } else if (newStatus === 'CANCELED') {
      // Anyone can cancel from any status except ACTIVE, CANCELED, EXPIRED
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
      // For CUSTOMER, verify ownership
      if (role === 'CUSTOMER' && contract.purchased_by !== userInstantId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only cancel contracts you purchased' },
          { status: 403 }
        )
      }
      // Allowed to cancel
    } else {
      // Validate workflow transitions
      if (role === 'STAFF') {
        // STAFF can: NEWLY_CREATED → CUSTOMER_REVIEW
        if (currentStatus === 'NEWLY_CREATED' && newStatus === 'CUSTOMER_REVIEW') {
          // Allowed
        } else {
          return NextResponse.json(
            { error: 'Invalid status transition for STAFF role' },
            { status: 403 }
          )
        }
      } else if (role === 'CUSTOMER') {
        // Verify this is the customer who purchased the contract
        if (contract.purchased_by !== userInstantId) {
          return NextResponse.json(
            { error: 'Forbidden - You can only update contracts you purchased' },
            { status: 403 }
          )
        }

        // CUSTOMER can: CUSTOMER_REVIEW → CUSTOMER_CONFIRMED, CUSTOMER_CONFIRMED → ACTIVE
        if (currentStatus === 'CUSTOMER_REVIEW' && newStatus === 'CUSTOMER_CONFIRMED') {
          // Allowed
        } else if (currentStatus === 'CUSTOMER_CONFIRMED' && newStatus === 'ACTIVE') {
          // Check not expired before activating
          if (contract.end_date && contract.end_date < now) {
            return NextResponse.json(
              { error: 'Cannot activate an expired contract' },
              { status: 400 }
            )
          }
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

    // Update the contract status
    await instantServer.transact([
      instantServer.tx.contract[contract_id].update({
        status: newStatus
      })
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

