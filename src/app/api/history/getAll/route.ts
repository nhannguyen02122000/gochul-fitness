// src/app/api/history/getAll/route.ts
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

    // Get pagination and filter parameters from query string
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    const statusesParam = searchParams.get('statuses')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    // Parse statuses filter (comma-separated)
    const statusesFilter = statusesParam ? statusesParam.split(',').map(s => s.trim()) : null

    // Parse date range filters
    const startDate = startDateParam ? parseInt(startDateParam) : null
    const endDate = endDateParam ? parseInt(endDateParam) : null

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
    let history: any[] = []

    // Role-based query
    if (role === 'ADMIN') {
      // ADMIN: Get all history records
      const data = await instantServer.query({
        history: {
          $: {
            limit: limit + 1, // Fetch one extra to check if there are more
            offset: offset
          },
          users: {},
          contract: {
            users: {},
            sale_by_user: {
              user_setting: {} // Get user_setting for sales person
            },
            purchased_by_user: {
              user_setting: {} // Get user_setting for customer
            }
          }
        }
      })
      history = data.history || []

    } else if (role === 'STAFF') {
      // STAFF: Get only history where their instant_id is in teach_by
      const data = await instantServer.query({
        history: {
          $: {
            where: {
              teach_by: userInstantId
            },
            limit: limit + 1,
            offset: offset
          },
          users: {},
          contract: {
            users: {},
            sale_by_user: {
              user_setting: {} // Get user_setting for sales person
            },
            purchased_by_user: {
              user_setting: {} // Get user_setting for customer
            }
          }
        }
      })
      history = data.history || []

    } else if (role === 'CUSTOMER') {
      // CUSTOMER: Get only history for contracts they purchased
      // First, get all contract IDs purchased by this user
      const contractsData = await instantServer.query({
        contract: {
          $: {
            where: {
              purchased_by: userInstantId
            }
          },
          users: {},
          sale_by_user: {
            user_setting: {} // Get user_setting for sales person
          },
          purchased_by_user: {
            user_setting: {} // Get user_setting for customer
          },
          history: {
            users: {} // Get users relation for history items
          }
        }
      })

      console.log('=== DEBUG: CUSTOMER Contract Query ===')
      console.log('User Instant ID:', userInstantId)
      console.log('Contracts found:', contractsData.contract?.length || 0)
      if (contractsData.contract && contractsData.contract.length > 0) {
        console.log('Sample contract:', JSON.stringify({
          id: contractsData.contract[0].id,
          purchased_by: contractsData.contract[0].purchased_by,
          history_count: contractsData.contract[0].history?.length || 0
        }, null, 2))
      }
      console.log('=====================================')

      // Get all history from the contracts
      const allHistory: any[] = []
      contractsData.contract?.forEach(contract => {
        if (contract.history && contract.history.length > 0) {
          contract.history.forEach(h => {
            // Spread contract data but remove the history array to avoid circular reference
            const { history: _, ...contractWithoutHistory } = contract
            allHistory.push({
              ...h,
              contract: [contractWithoutHistory] // Wrap in array to match ADMIN/STAFF schema
            })
          })
        }
      })

      // Apply pagination manually
      const paginatedHistory = allHistory.slice(offset, offset + limit + 1)
      history = paginatedHistory

    } else {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 403 }
      )
    }

    // Debug: Log raw history before filtering
    console.log('=== DEBUG: Before Filtering ===')
    console.log('Raw history count:', history.length)
    console.log('Role:', role)
    console.log('Filters - statuses:', statusesFilter)
    console.log('Filters - startDate:', startDate)
    console.log('Filters - endDate:', endDate)
    if (history.length > 0) {
      console.log('Sample raw history:', JSON.stringify({
        id: history[0].id,
        status: history[0].status,
        date: history[0].date,
        contract_id: history[0].contract?.id,
        has_contract: !!history[0].contract,
        purchased_by: history[0].contract?.purchased_by,
        purchased_by_user_length: history[0].contract?.purchased_by_user?.length
      }, null, 2))
    }
    console.log('===============================')

    // Apply filters
    let filteredHistory = history

    // Filter by statuses
    if (statusesFilter && statusesFilter.length > 0) {
      filteredHistory = filteredHistory.filter(h => statusesFilter.includes(h.status))
    }

    // Filter by date range
    if (startDate !== null) {
      filteredHistory = filteredHistory.filter(h => h.date >= startDate)
    }
    if (endDate !== null) {
      filteredHistory = filteredHistory.filter(h => h.date <= endDate)
    }

    // Check for expired sessions and update them
    const now = Date.now()
    const expiredHistoryIds: string[] = []

    for (const session of filteredHistory) {
      // Skip if already expired or canceled
      if (session.status === 'EXPIRED' || session.status === 'CANCELED') {
        continue
      }

      // Calculate session end time: date (timestamp) + to (minutes from midnight) * 60000 (ms per minute)
      const sessionEndTime = session.date + (session.to * 60 * 1000)

      if (sessionEndTime < now) {
        expiredHistoryIds.push(session.id)
        // Update the status in the filtered list for immediate response
        session.status = 'EXPIRED'
      }
    }

    // Batch update expired sessions in the database
    if (expiredHistoryIds.length > 0) {
      const transactions = expiredHistoryIds.map(id =>
        instantServer.tx.history[id].update({ status: 'EXPIRED' })
      )
      await instantServer.transact(transactions)
    }

    // Check if there are more pages (we fetched limit + 1)
    const hasMore = filteredHistory.length > limit
    if (hasMore) {
      filteredHistory = filteredHistory.slice(0, limit)
    }

    // Debug logging
    console.log('=== DEBUG: History Query Results ===')
    console.log('Total filtered history:', filteredHistory.length)
    if (filteredHistory.length > 0) {
      const sample = filteredHistory[0]
      console.log('Sample history ID:', sample.id)
      console.log('Has contract?:', !!sample.contract)
      console.log('Contract purchased_by_user:', sample.contract?.purchased_by_user?.[0])
      console.log('Customer user_setting:', sample.contract?.purchased_by_user?.[0]?.user_setting?.[0])
      console.log('Contract sale_by_user:', sample.contract?.sale_by_user?.[0])
      console.log('Sales user_setting:', sample.contract?.sale_by_user?.[0]?.user_setting?.[0])
    }
    console.log('===================================')

    return NextResponse.json({
      history: filteredHistory,
      pagination: {
        page,
        limit,
        total: filteredHistory.length,
        hasMore
      },
      role
    })

  } catch (error) {
    console.error('Error fetching history:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

