// src/app/api/contract/getAll/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { ContractStatus, ContractKind } from '@/app/type/api'
import { isCompletedHistoryStatus, isPreActiveContractStatus } from '@/utils/statusUtils'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const CONTRACT_STATUS_VALUES: ContractStatus[] = [
  'NEWLY_CREATED',
  'CUSTOMER_REVIEW',
  'CUSTOMER_CONFIRMED',
  'CUSTOMER_PAID',
  'PT_CONFIRMED',
  'ACTIVE',
  'CANCELED',
  'EXPIRED'
]

const CONTRACT_KIND_VALUES: ContractKind[] = ['PT', 'REHAB', 'PT_MONTHLY']

type FilterWhereValue =
  | string
  | number
  | boolean
  | {
    $in?: string[]
    $gte?: number
    $lte?: number
  }

type ContractWhere = Record<string, FilterWhereValue>

function normalizeKeyword(value: string | null): string {
  return (value || '').trim().toLowerCase()
}

function getFullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim().toLowerCase()
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10)
  if (Number.isNaN(parsed) || parsed <= 0) return fallback
  return parsed
}

function parseTimestamp(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function hasAvailableCreditsForContract(contract: Record<string, unknown>): boolean {
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
    const page = parsePositiveInt(searchParams.get('page'), 1)
    const limit = parsePositiveInt(searchParams.get('limit'), 10)
    const offset = (page - 1) * limit

    const statusesParam = searchParams.get('statuses')
    const kindParam = searchParams.get('kind')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')
    const saleByNameParam = searchParams.get('sale_by_name')
    const purchasedByNameParam = searchParams.get('purchased_by_name')

    const statusesFilter = statusesParam
      ? statusesParam
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean) as ContractStatus[]
      : []

    if (statusesFilter.some((status) => !CONTRACT_STATUS_VALUES.includes(status))) {
      return NextResponse.json(
        { error: 'Invalid statuses filter' },
        { status: 400 }
      )
    }

    const kindFilterRaw = kindParam?.trim()
    const kindFilter = kindFilterRaw
      ? (kindFilterRaw as ContractKind)
      : undefined

    if (kindFilter && !CONTRACT_KIND_VALUES.includes(kindFilter)) {
      return NextResponse.json(
        { error: 'Invalid kind filter' },
        { status: 400 }
      )
    }

    const startDate = parseTimestamp(startDateParam)
    const endDate = parseTimestamp(endDateParam)

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

    // Build contract where clause (DB-level filtering)
    const contractWhere: ContractWhere = {}

    // Role scope
    if (role === 'STAFF') {
      contractWhere.sale_by = userInstantId
    } else if (role === 'CUSTOMER') {
      contractWhere.purchased_by = userInstantId
    } else if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 403 }
      )
    }

    // Basic filters
    if (kindFilter) {
      contractWhere.kind = kindFilter
    }

    if (statusesFilter.length === 1) {
      contractWhere.status = statusesFilter[0]
    } else if (statusesFilter.length > 1) {
      contractWhere.status = { $in: statusesFilter }
    }

    if (startDate !== null || endDate !== null) {
      const createdAtRange: { $gte?: number; $lte?: number } = {}
      if (startDate !== null) createdAtRange.$gte = startDate
      if (endDate !== null) createdAtRange.$lte = endDate
      contractWhere.created_at = createdAtRange
    }

    // Name filters -> resolve to user IDs, then apply as DB-level id filters
    const saleByKeyword = normalizeKeyword(saleByNameParam)
    const purchasedByKeyword = normalizeKeyword(purchasedByNameParam)

    const shouldResolveSaleByIds =
      saleByKeyword.length > 0 && (role === 'ADMIN' || role === 'CUSTOMER')
    const shouldResolvePurchasedByIds =
      purchasedByKeyword.length > 0 && (role === 'ADMIN' || role === 'STAFF')

    if (shouldResolveSaleByIds || shouldResolvePurchasedByIds) {
      const userSettingsData = await instantServer.query({
        user_setting: {
          users: {}
        }
      })

      const saleByIds: string[] = []
      const purchasedByIds: string[] = []

      userSettingsData.user_setting.forEach((setting) => {
        const id = setting.users?.[0]?.id
        if (!id) return

        const fullName = getFullName(setting.first_name, setting.last_name)

        if (shouldResolveSaleByIds && fullName.includes(saleByKeyword)) {
          saleByIds.push(id)
        }

        if (
          shouldResolvePurchasedByIds &&
          fullName.includes(purchasedByKeyword)
        ) {
          purchasedByIds.push(id)
        }
      })

      if (shouldResolveSaleByIds) {
        if (saleByIds.length === 0) {
          return NextResponse.json({
            contracts: [],
            pagination: {
              page,
              limit,
              total: 0,
              hasMore: false
            },
            role
          })
        }
        contractWhere.sale_by = { $in: saleByIds }
      }

      if (shouldResolvePurchasedByIds) {
        if (purchasedByIds.length === 0) {
          return NextResponse.json({
            contracts: [],
            pagination: {
              page,
              limit,
              total: 0,
              hasMore: false
            },
            role
          })
        }
        contractWhere.purchased_by = { $in: purchasedByIds }
      }
    }

    // Query paginated contracts directly at DB level
    const pagedData = await instantServer.query({
      contract: {
        $: {
          where: contractWhere as never,
          limit: limit + 1,
          offset
        },
        users: {},
        sale_by_user: {
          user_setting: {}
        },
        purchased_by_user: {
          user_setting: {}
        },
        history: {}
      }
    })

    let contracts = pagedData.contract || []
    const hasMore = contracts.length > limit
    if (hasMore) {
      contracts = contracts.slice(0, limit)
    }

    // Lightweight total query (same filters, no heavy nested relations)
    const totalData = await instantServer.query({
      contract: {
        $: {
          where: contractWhere as never
        }
      }
    })
    const total = totalData.contract?.length || 0

    // Calculate used_credits and auto-expire eligible contracts in current page
    const now = Date.now()
    const contractsToExpire: string[] = []

    contracts.forEach((contract) => {
      const usedCreditsCount =
        contract.history?.filter((h) => isCompletedHistoryStatus(h.status || ''))
          .length || 0

      contract.used_credits = usedCreditsCount

      const shouldExpireByDate =
        isPreActiveContractStatus(contract.status) &&
        !!contract.end_date &&
        contract.end_date < now

      const shouldExpireByCredits =
        contract.status === 'ACTIVE' && !hasAvailableCreditsForContract(contract)

      if (shouldExpireByDate || shouldExpireByCredits) {
        contractsToExpire.push(contract.id)
        contract.status = 'EXPIRED'
      }
    })

    if (contractsToExpire.length > 0) {
      await instantServer.transact(
        contractsToExpire.map((contractId) =>
          instantServer.tx.contract[contractId].update({ status: 'EXPIRED' })
        )
      )
    }

    return NextResponse.json({
      contracts,
      pagination: {
        page,
        limit,
        total,
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
