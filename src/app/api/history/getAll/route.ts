// src/app/api/history/getAll/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { HistoryStatus } from '@/app/type/api'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const HISTORY_STATUS_VALUES: HistoryStatus[] = [
  'NEWLY_CREATED',
  'CHECKED_IN',
  'CANCELED',
  'EXPIRED'
]

function normalizeKeyword(input: string | null): string {
  if (!input) return ''
  return input.trim().toLowerCase().replace(/\s+/g, ' ')
}

function getFullName(firstName: unknown, lastName: unknown): string {
  return [firstName, lastName]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase())
    .join(' ')
}

function parseTimestamp(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

function parseMinute(value: string | null): number | null | undefined {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return undefined
  return parsed
}

function extractContract(
  session: Record<string, unknown>
): Record<string, unknown> | null {
  const contractValue = session.contract
  if (Array.isArray(contractValue)) {
    const first = contractValue[0]
    return first && typeof first === 'object'
      ? (first as Record<string, unknown>)
      : null
  }
  if (contractValue && typeof contractValue === 'object') {
    return contractValue as Record<string, unknown>
  }
  return null
}

function extractUserFullName(
  contract: Record<string, unknown> | null,
  key: 'sale_by_user' | 'purchased_by_user'
): string {
  if (!contract) return ''
  const usersValue = contract[key]
  if (!Array.isArray(usersValue) || usersValue.length === 0) return ''
  const user = usersValue[0]
  if (!user || typeof user !== 'object') return ''
  const userSettingValue = (user as Record<string, unknown>).user_setting
  if (!Array.isArray(userSettingValue) || userSettingValue.length === 0) return ''
  const userSetting = userSettingValue[0]
  if (!userSetting || typeof userSetting !== 'object') return ''
  return getFullName(
    (userSetting as Record<string, unknown>).first_name,
    (userSetting as Record<string, unknown>).last_name
  )
}

function overlapsTimeWindow(
  sessionFrom: unknown,
  sessionTo: unknown,
  fromMinute: number,
  toMinute: number
): boolean {
  if (typeof sessionFrom !== 'number' || typeof sessionTo !== 'number') {
    return false
  }
  return sessionFrom < toMinute && sessionTo > fromMinute
}

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
    const teachByNameParam = searchParams.get('teach_by_name')
    const customerNameParam = searchParams.get('customer_name')
    const fromMinuteParam = searchParams.get('from_minute')
    const toMinuteParam = searchParams.get('to_minute')

    const statusesFilter = statusesParam
      ? statusesParam
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean) as HistoryStatus[]
      : []
    const startDate = parseTimestamp(startDateParam)
    const endDate = parseTimestamp(endDateParam)
    const teachByKeyword = normalizeKeyword(teachByNameParam)
    const customerKeyword = normalizeKeyword(customerNameParam)
    const fromMinute = parseMinute(fromMinuteParam)
    const toMinute = parseMinute(toMinuteParam)

    if (statusesFilter.some((status) => !HISTORY_STATUS_VALUES.includes(status))) {
      return NextResponse.json(
        { error: 'Invalid statuses filter' },
        { status: 400 }
      )
    }

    if (fromMinute === undefined || toMinute === undefined) {
      return NextResponse.json(
        { error: 'from_minute and to_minute must be valid integers' },
        { status: 400 }
      )
    }

    const hasTimeFilter = fromMinute !== null || toMinute !== null
    const effectiveFromMinute = fromMinute ?? 0
    const effectiveToMinute = toMinute ?? 1440

    if (
      hasTimeFilter &&
      (
        effectiveFromMinute < 0 ||
        effectiveFromMinute > 1440 ||
        effectiveToMinute < 0 ||
        effectiveToMinute > 1440 ||
        effectiveFromMinute >= effectiveToMinute
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid time window. Expect 0 <= from_minute < to_minute <= 1440' },
        { status: 400 }
      )
    }

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

      if (statusesFilter.length > 0) {
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

      if (role === 'ADMIN' && teachByKeyword.length > 0) {
        pagedHistory = pagedHistory.filter((session) => {
          const trainerName = extractUserFullName(
            extractContract(session as Record<string, unknown>),
            'sale_by_user'
          )
          return trainerName.includes(teachByKeyword)
        })
      }

      if ((role === 'ADMIN' || role === 'STAFF') && customerKeyword.length > 0) {
        pagedHistory = pagedHistory.filter((session) => {
          const customerName = extractUserFullName(
            extractContract(session as Record<string, unknown>),
            'purchased_by_user'
          )
          return customerName.includes(customerKeyword)
        })
      }

      if (hasTimeFilter) {
        pagedHistory = pagedHistory.filter((session) =>
          overlapsTimeWindow(
            (session as Record<string, unknown>).from,
            (session as Record<string, unknown>).to,
            effectiveFromMinute,
            effectiveToMinute
          )
        )
      }
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

      if (statusesFilter.length > 0) {
        filteredHistory = filteredHistory.filter((h) =>
          statusesFilter.includes(h.status as HistoryStatus)
        )
      }

      if (startDate !== null) {
        filteredHistory = filteredHistory.filter(h => (h.date as number) >= startDate)
      }

      if (endDate !== null) {
        filteredHistory = filteredHistory.filter(h => (h.date as number) <= endDate)
      }

      if (teachByKeyword.length > 0) {
        filteredHistory = filteredHistory.filter((session) => {
          const trainerName = extractUserFullName(
            extractContract(session),
            'sale_by_user'
          )
          return trainerName.includes(teachByKeyword)
        })
      }

      if (hasTimeFilter) {
        filteredHistory = filteredHistory.filter((session) =>
          overlapsTimeWindow(
            session.from,
            session.to,
            effectiveFromMinute,
            effectiveToMinute
          )
        )
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
