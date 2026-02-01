// src/app/api/contract/getAll/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Check if user is signed in
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contracts: any[] = []

    // Role-based query
    if (role === 'ADMIN') {
      // ADMIN: Get all contracts
      const data = await instantServer.query({
        contract: {
          $: {
            limit: limit,
            offset: offset
          },
          users: {}, // Customer who owns the contract
          sale_by_user: {}, // Staff who sold the contract
          history: {}
        }
      })
      contracts = data.contract || []

    } else if (role === 'STAFF') {
      // STAFF: Get only contracts they sold
      const data = await instantServer.query({
        contract: {
          $: {
            where: {
              sale_by: userInstantId
            },
            limit: limit,
            offset: offset
          },
          users: {}, // Customer who owns the contract
          sale_by_user: {}, // Staff who sold the contract (themselves)
          history: {}
        }
      })
      contracts = data.contract || []

    } else if (role === 'CUSTOMER') {
      // CUSTOMER: Get only their own contracts
      const data = await instantServer.query({
        $users: {
          $: {
            where: {
              id: userInstantId
            }
          },
          contract: {
            $: {
              limit: limit,
              offset: offset
            },
            sale_by_user: {}, // Staff who sold the contract
            history: {}
          }
        }
      })
      const user = data.$users[0]
      contracts = user?.contract || []

    } else {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 403 }
      )
    }

    // Calculate pagination metadata
    const hasMore = contracts.length === limit

    return NextResponse.json({
      contracts,
      pagination: {
        page,
        limit,
        total: contracts.length,
        hasMore
      },
      role
    })

  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}