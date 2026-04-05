// src/app/api/contract/create/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { publishRealtimeEventSafely } from '@/lib/realtime/ablyServer'
import { NextResponse } from 'next/server'
import { id } from '@instantdb/admin'


const MIN_SESSION_DURATION = 15
const MAX_SESSION_DURATION = 180
const SESSION_DURATION_STEP = 15

function isValidDurationPerSession(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_SESSION_DURATION &&
    value <= MAX_SESSION_DURATION &&
    value % SESSION_DURATION_STEP === 0
  )
}

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

    // Check if user has permission to create contracts (ADMIN or STAFF only)
    if (role !== 'ADMIN' && role !== 'STAFF') {
      return NextResponse.json(
        { error: 'Forbidden - Only ADMIN or STAFF can create contracts' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: Record<string, unknown> = await request.json()

    // ── Required fields ─────────────────────────────────────────────────────────
    const rawKind = body.kind
    const rawMoney = body.money
    const rawPurchasedBy = body.purchased_by
    const rawDuration = body.duration_per_session

    if (!rawKind || rawMoney === undefined || !rawPurchasedBy || rawDuration === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: kind, money, purchased_by, and duration_per_session are required' },
        { status: 400 }
      )
    }

    if (typeof rawKind !== 'string') {
      return NextResponse.json({ error: 'Invalid field: kind must be a string' }, { status: 400 })
    }
    const kind: string = rawKind

    if (typeof rawPurchasedBy !== 'string') {
      return NextResponse.json({ error: 'Invalid field: purchased_by must be a string' }, { status: 400 })
    }
    const purchased_by: string = rawPurchasedBy

    // Validate purchased_by is a valid $users.id in InstantDB (required for link to work)
    const allUserSettings = await instantServer.query({
      user_setting: { users: {} }
    })
    const validUserIds = (allUserSettings.user_setting ?? [])
      .map((s) => s.users?.[0]?.id)
      .filter((id): id is string => typeof id === 'string')
    console.log('[contract/create] valid user IDs count:', validUserIds.length)
    console.log('[contract/create] purchased_by:', purchased_by)
    console.log('[contract/create] is valid:', validUserIds.includes(purchased_by))
    if (!validUserIds.includes(purchased_by)) {
      return NextResponse.json(
        { error: `Invalid purchased_by: "${purchased_by}" is not a valid user ID. Must be an InstantDB $users.id of an existing user.` },
        { status: 400 }
      )
    }

    // money: accept number or numeric string
    const moneyRaw = typeof rawMoney === 'number' ? rawMoney : Number(rawMoney)
    if (!Number.isFinite(moneyRaw) || moneyRaw <= 0) {
      return NextResponse.json({ error: 'Invalid field: money must be a positive number' }, { status: 400 })
    }
    const money: number = moneyRaw

    // duration_per_session: accept number or numeric string
    const durationRaw = typeof rawDuration === 'number' ? rawDuration : Number(rawDuration)
    if (!isValidDurationPerSession(durationRaw)) {
      return NextResponse.json(
        { error: `duration_per_session must be 15–180 and divisible by 15. Got: ${rawDuration}` },
        { status: 400 }
      )
    }
    const duration_per_session: number = durationRaw

    // ── Optional fields ─────────────────────────────────────────────────────────
    let start_date: number | undefined
    let end_date: number | undefined
    let credits: number | undefined

    if (body.start_date !== undefined) {
      const s = typeof body.start_date === 'number'
        ? (body.start_date as number)
        : new Date(String(body.start_date)).getTime()
      if (Number.isFinite(s)) start_date = s
    }
    if (body.end_date !== undefined) {
      const e = typeof body.end_date === 'number'
        ? (body.end_date as number)
        : new Date(String(body.end_date)).getTime()
      if (Number.isFinite(e)) end_date = e
    }
    if (body.credits !== undefined) {
      const c = typeof body.credits === 'number' ? (body.credits as number) : Number(body.credits)
      if (Number.isFinite(c) && c > 0) credits = c
    }

    // ── Status ─────────────────────────────────────────────────────────────────
    const status = 'NEWLY_CREATED'

    // Auto-fill timestamps with current timestamp
    const created_at = Date.now()
    const updated_at = created_at

    // Generate a unique ID for the new contract using InstantDB's id() function
    const contractId = id()

    // Create the contract using InstantDB transaction
    await instantServer.transact([
      instantServer.tx.contract[contractId].update({
        created_at,
        updated_at,
        kind,
        status,
        money,
        sale_by: userInstantId,
        purchased_by,
        duration_per_session,
        ...(start_date !== undefined ? { start_date } : {}),
        ...(end_date !== undefined ? { end_date } : {}),
        ...(credits !== undefined ? { credits } : {}),
      })
        .link({ sale_by_user: userInstantId })
        .link({ purchased_by_user: purchased_by })
    ])

    // Query the created contract to return it
    const createdContractData = await instantServer.query({
      contract: {
        $: {
          where: {
            id: contractId
          }
        },
        users: {},
        sale_by_user: {},
        purchased_by_user: {},
        history: {}
      }
    })

    const createdContract = createdContractData.contract[0]

    if (!createdContract) {
      return NextResponse.json(
        { error: 'Contract created but could not be retrieved' },
        { status: 500 }
      )
    }

    await publishRealtimeEventSafely({
      eventName: 'contract.changed',
      userIds: [userInstantId, createdContract.sale_by, createdContract.purchased_by],
      payload: {
        entity_id: createdContract.id,
        action: 'create',
        triggered_by: userInstantId,
        timestamp: Date.now()
      }
    })

    return NextResponse.json(
      { contract: createdContract },
      { status: 201 }
    )

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('Validation failed')) {
      // Log the full input on validation failures so we can debug
      console.error('[contract/create] Validation error:', msg)
      return NextResponse.json(
        { error: `Validation failed: ${msg}` },
        { status: 400 }
      )
    }
    console.error('[contract/create] Error:', msg)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
