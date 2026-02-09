// src/app/api/contract/delete/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'


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

    const role = userSetting.role

    // Check if user has permission to delete contracts (ADMIN only)
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only ADMIN can delete contracts' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { contract_id } = body

    // Validate required field: contract_id
    if (!contract_id || typeof contract_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: contract_id must be a string' },
        { status: 400 }
      )
    }

    // Check if contract exists
    const existingContractData = await instantServer.query({
      contract: {
        $: {
          where: {
            id: contract_id
          }
        }
      }
    })

    const existingContract = existingContractData.contract[0]

    if (!existingContract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Soft delete: Update status to CANCELED instead of hard delete
    await instantServer.transact([
      instantServer.tx.contract[contract_id].update({
        status: 'CANCELED'
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
      { 
        message: 'Contract canceled successfully',
        contract_id: contract_id
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

