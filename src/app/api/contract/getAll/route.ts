// src/app/api/contract/getAll/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { History } from '@/app/type/api'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
            limit: limit + 1, // Fetch one extra to check if there are more
            offset: offset
          },
          users: {}, // Customer who owns the contract
          sale_by_user: {
            user_setting: {} // Get user_setting for sales person
          }, // Staff who sold the contract
          purchased_by_user: {
            user_setting: {} // Get user_setting for customer
          }, // User who purchased the contract
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
            limit: limit + 1, // Fetch one extra to check if there are more
            offset: offset
          },
          users: {}, // Customer who owns the contract
          sale_by_user: {
            user_setting: {} // Get user_setting for sales person
          }, // Staff who sold the contract (themselves)
          purchased_by_user: {
            user_setting: {} // Get user_setting for customer
          }, // User who purchased the contract
          history: {}
        }
      })
      contracts = data.contract || []

    } else if (role === 'CUSTOMER') {
      // CUSTOMER: Get only their own contracts (where they are the purchaser)
      const data = await instantServer.query({
        contract: {
          $: {
            where: {
              purchased_by: userInstantId
            },
            limit: limit + 1, // Fetch one extra to check if there are more
            offset: offset
          },
          users: {}, // Customer who owns the contract
          sale_by_user: {
            user_setting: {} // Get user_setting for sales person
          }, // Staff who sold the contract
          purchased_by_user: {
            user_setting: {} // Get user_setting for customer
          }, // User who purchased the contract
          history: {}
        }
      })
      contracts = data.contract || []

    } else {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 403 }
      )
    }

    // Check if there are more pages (we fetched limit + 1)
    const hasMore = contracts.length > limit
    if (hasMore) {
      contracts = contracts.slice(0, limit)
    }

    // Collect all unique user IDs from contracts
    const userIds = new Set<string>()
    contracts.forEach(contract => {
      if (contract.purchased_by) userIds.add(contract.purchased_by)
      if (contract.sale_by) userIds.add(contract.sale_by)
    })

    // Fetch user_setting data for all users
    const userSettingsData = await instantServer.query({
      user_setting: {
        users: {}
      }
    })

    // Create a map of user_id -> user_setting
    const userSettingsMap = new Map()
    userSettingsData.user_setting.forEach((setting: any) => {
      const userId = setting.users?.[0]?.id
      if (userId) {
        userSettingsMap.set(userId, setting)
      }
    })

    // Attach user_setting data to the users in contracts
    contracts.forEach(contract => {
      if (contract.purchased_by_user?.[0]) {
        const userId = contract.purchased_by_user[0].id
        const userSetting = userSettingsMap.get(userId)
        if (userSetting) {
          contract.purchased_by_user[0].user_setting = [userSetting]
        }
      }
      if (contract.sale_by_user?.[0]) {
        const userId = contract.sale_by_user[0].id
        const userSetting = userSettingsMap.get(userId)
        if (userSetting) {
          contract.sale_by_user[0].user_setting = [userSetting]
        }
      }
    })

    // Calculate used_credits for each contract
    // used_credits = number of history records with status PT_CHECKED_IN
    contracts.forEach(contract => {
      const usedCreditsCount = contract.history?.filter(
        (h: History) => h.status === 'PT_CHECKED_IN'
      ).length || 0

      contract.used_credits = usedCreditsCount
    })

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