// src/app/api/history/getAll/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    const statusesParam = searchParams.get('statuses')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    const statusesFilter = statusesParam ? statusesParam.split(',').map(s => s.trim()) : null
    const startDate = startDateParam ? parseInt(startDateParam) : null
    const endDate = endDateParam ? parseInt(endDateParam) : null

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

    if (role === 'ADMIN') {
      const data = await instantServer.query({
        history: {
          $: {
            limit: limit + 1,
            offset
          },
          users: {},
          contract: {
            users: {},
            sale_by_user: {
              user_setting: {}
            },
            purchased_by_user: {
              user_setting: {}
            }
          }
        }
      })
      history = data.history || []
    } else if (role === 'STAFF') {
      const data = await instantServer.query({
        history: {
          $: {
            where: {
              teach_by: userInstantId
            },
            limit: limit + 1,
            offset
          },
          users: {},
          contract: {
            users: {},
            sale_by_user: {
              user_setting: {}
            },
            purchased_by_user: {
              user_setting: {}
            }
          }
        }
      })
      history = data.history || []
    } else if (role === 'CUSTOMER') {
      const contractsData = await instantServer.query({
        contract: {
          $: {
            where: {
              purchased_by: userInstantId
            }
          },
          users: {},
          sale_by_user: {
            user_setting: {}
          },
          purchased_by_user: {
            user_setting: {}
          },
          history: {
            users: {}
          }
        }
      })

      const allHistory: Array<Record<string, unknown>> = []
      contractsData.contract?.forEach(contract => {
        if (contract.history && contract.history.length > 0) {
          contract.history.forEach(h => {
            const { history: _, ...contractWithoutHistory } = contract
            allHistory.push({
              ...h,
              contract: [contractWithoutHistory]
            })
          })
        }
      })

      history = allHistory.slice(offset, offset + limit + 1)
    } else {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 403 }
      )
    }

    let filteredHistory = history

    if (statusesFilter && statusesFilter.length > 0) {
      filteredHistory = filteredHistory.filter(h => statusesFilter.includes(h.status))
    }

    if (startDate !== null) {
      filteredHistory = filteredHistory.filter(h => h.date >= startDate)
    }

    if (endDate !== null) {
      filteredHistory = filteredHistory.filter(h => h.date <= endDate)
    }

    // New expiry rule: only expire NEWLY_CREATED records
    const now = Date.now()
    const expiredHistoryIds: string[] = []

    for (const session of filteredHistory) {
      if (session.status !== 'NEWLY_CREATED') {
        continue
      }

      const sessionEndTime = session.date + (session.to * 60 * 1000)

      if (sessionEndTime < now) {
        expiredHistoryIds.push(session.id)
        session.status = 'EXPIRED'
      }
    }

    if (expiredHistoryIds.length > 0) {
      const transactions = expiredHistoryIds.map(id =>
        instantServer.tx.history[id].update({ status: 'EXPIRED' })
      )
      await instantServer.transact(transactions)
    }

    const hasMore = filteredHistory.length > limit
    if (hasMore) {
      filteredHistory = filteredHistory.slice(0, limit)
    }

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
