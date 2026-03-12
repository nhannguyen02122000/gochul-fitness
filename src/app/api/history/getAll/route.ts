// src/app/api/history/getAll/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getHistoryCreatedAt(session: Record<string, unknown>): number {
  if (typeof session.created_at === 'number') return session.created_at
  if (typeof session.date === 'number') return session.date
  return 0
}

function getHistoryUpdatedAt(session: Record<string, unknown>): number {
  if (typeof session.updated_at === 'number') return session.updated_at
  return getHistoryCreatedAt(session)
}

function compareHistoryLatestFirst(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): number {
  const updatedDiff = getHistoryUpdatedAt(b) - getHistoryUpdatedAt(a)
  if (updatedDiff !== 0) return updatedDiff

  const createdDiff = getHistoryCreatedAt(b) - getHistoryCreatedAt(a)
  if (createdDiff !== 0) return createdDiff

  const bDate = typeof b.date === 'number' ? b.date : 0
  const aDate = typeof a.date === 'number' ? a.date : 0
  if (bDate !== aDate) return bDate - aDate

  const bFrom = typeof b.from === 'number' ? b.from : 0
  const aFrom = typeof a.from === 'number' ? a.from : 0
  if (bFrom !== aFrom) return bFrom - aFrom

  const bId = typeof b.id === 'string' ? b.id : ''
  const aId = typeof a.id === 'string' ? a.id : ''
  return bId.localeCompare(aId)
}

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
    let pagedHistory: any[] = []
    let total = 0

    if (role === 'ADMIN' || role === 'STAFF') {
      const historyWhere: Record<string, unknown> = {}

      if (role === 'STAFF') {
        historyWhere.teach_by = userInstantId
      }

      if (statusesFilter && statusesFilter.length > 0) {
        historyWhere.status =
          statusesFilter.length === 1 ? statusesFilter[0] : { $in: statusesFilter }
      }

      if (startDate !== null || endDate !== null) {
        const dateRange: { $gte?: number; $lte?: number } = {}
        if (startDate !== null) dateRange.$gte = startDate
        if (endDate !== null) dateRange.$lte = endDate
        historyWhere.date = dateRange
      }

      const totalData = await instantServer.query({
        history: {
          $: {
            where: historyWhere as never
          }
        }
      })
      total = (totalData.history || []).length

      const allHistoryData = await instantServer.query({
        history: {
          $: {
            where: historyWhere as never
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
      pagedHistory = allHistoryData.history || []
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

      const flattenedHistory: Array<Record<string, unknown>> = []
      contractsData.contract?.forEach(contract => {
        if (contract.history && contract.history.length > 0) {
          contract.history.forEach(h => {
            const contractWithoutHistory: Record<string, unknown> = { ...contract }
            delete contractWithoutHistory.history
            flattenedHistory.push({
              ...h,
              contract: [contractWithoutHistory]
            })
          })
        }
      })

      let filteredHistory = flattenedHistory

      if (statusesFilter && statusesFilter.length > 0) {
        filteredHistory = filteredHistory.filter(h => statusesFilter.includes(h.status as string))
      }

      if (startDate !== null) {
        filteredHistory = filteredHistory.filter(h => (h.date as number) >= startDate)
      }

      if (endDate !== null) {
        filteredHistory = filteredHistory.filter(h => (h.date as number) <= endDate)
      }

      total = filteredHistory.length
      pagedHistory = filteredHistory
    } else {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 403 }
      )
    }

    // New expiry rule: only expire NEWLY_CREATED records
    const now = Date.now()
    const expiredHistoryIds: string[] = []

    for (const session of pagedHistory) {
      if (session.status !== 'NEWLY_CREATED') {
        continue
      }

      const sessionEndTime = session.date + (session.to * 60 * 1000)

      if (sessionEndTime < now) {
        expiredHistoryIds.push(session.id)
        session.status = 'EXPIRED'
        session.updated_at = now
      }
    }

    if (expiredHistoryIds.length > 0) {
      const transactions = expiredHistoryIds.map(id =>
        instantServer.tx.history[id].update({
          status: 'EXPIRED',
          updated_at: now
        })
      )
      await instantServer.transact(transactions)
    }

    pagedHistory.sort(compareHistoryLatestFirst)

    total = pagedHistory.length
    const pagedResult = pagedHistory.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return NextResponse.json({
      history: pagedResult,
      pagination: {
        page,
        limit,
        total,
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
