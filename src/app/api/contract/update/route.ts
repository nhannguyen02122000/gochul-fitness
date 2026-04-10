// src/app/api/contract/update/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { publishRealtimeEventSafely } from '@/lib/realtime/ablyServer'
import { NextResponse } from 'next/server'
import type { ContractStatus } from '@/app/type/api'

const CONTRACT_STATUS_VALUES: ContractStatus[] = [
    'NEWLY_CREATED',
    'ACTIVE',
    'CANCELED',
    'EXPIRED'
]

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

        // Check if user has permission to update contracts (ADMIN only)
        if (role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden - Only ADMIN can update contracts' },
                { status: 403 }
            )
        }

        // Parse request body
        const body = await request.json()
        const { contract_id, kind, status, money, duration_per_session, start_date, end_date, credits, sale_by, purchased_by } = body

        // Validate required fields
        if (!contract_id || typeof contract_id !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid required field: contract_id must be a string' },
                { status: 400 }
            )
        }

        if (duration_per_session === undefined) {
            return NextResponse.json(
                { error: 'Missing required field: duration_per_session is required' },
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

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {}
        const now = Date.now()

        // Validate and add optional fields if provided
        if (kind !== undefined) {
            if (typeof kind !== 'string') {
                return NextResponse.json(
                    { error: 'Invalid field: kind must be a string' },
                    { status: 400 }
                )
            }
            updateData.kind = kind
        }

        if (status !== undefined) {
            if (typeof status !== 'string') {
                return NextResponse.json(
                    { error: 'Invalid field: status must be a string' },
                    { status: 400 }
                )
            }

            if (!CONTRACT_STATUS_VALUES.includes(status as ContractStatus)) {
                return NextResponse.json(
                    { error: 'Invalid field: status must be a valid ContractStatus' },
                    { status: 400 }
                )
            }

            updateData.status = status
        }

        if (money !== undefined) {
            if (typeof money !== 'number') {
                return NextResponse.json(
                    { error: 'Invalid field: money must be a number' },
                    { status: 400 }
                )
            }
            updateData.money = money
        }

        if (!isValidDurationPerSession(duration_per_session)) {
            return NextResponse.json(
                { error: 'Invalid field: duration_per_session must be an integer between 15 and 180, divisible by 15' },
                { status: 400 }
            )
        }
        updateData.duration_per_session = duration_per_session

        if (start_date !== undefined) {
            if (typeof start_date !== 'number') {
                return NextResponse.json(
                    { error: 'Invalid field: start_date must be a number (timestamp)' },
                    { status: 400 }
                )
            }
            updateData.start_date = start_date
        }

        if (end_date !== undefined) {
            if (typeof end_date !== 'number') {
                return NextResponse.json(
                    { error: 'Invalid field: end_date must be a number (timestamp)' },
                    { status: 400 }
                )
            }
            updateData.end_date = end_date
        }

        if (credits !== undefined) {
            if (typeof credits !== 'number') {
                return NextResponse.json(
                    { error: 'Invalid field: credits must be a number' },
                    { status: 400 }
                )
            }
            updateData.credits = credits
        }

        if (sale_by !== undefined) {
            if (typeof sale_by !== 'string') {
                return NextResponse.json(
                    { error: 'Invalid field: sale_by must be a string' },
                    { status: 400 }
                )
            }
            updateData.sale_by = sale_by
        }

        if (purchased_by !== undefined) {
            if (typeof purchased_by !== 'string') {
                return NextResponse.json(
                    { error: 'Invalid field: purchased_by must be a string' },
                    { status: 400 }
                )
            }
            updateData.purchased_by = purchased_by
        }

        // Check if there are any fields to update
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'No fields to update provided' },
                { status: 400 }
            )
        }

        updateData.updated_at = now

        // Build transaction with links if sale_by or purchased_by are being updated
        const transaction = instantServer.tx.contract[contract_id].update(updateData)

        // Add links if the user references are being updated
        if (sale_by !== undefined) {
            transaction.link({ sale_by_user: sale_by })
        }
        if (purchased_by !== undefined) {
            transaction.link({ purchased_by_user: purchased_by })
        }

        // Update the contract using InstantDB transaction
        await instantServer.transact([transaction])

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

        await publishRealtimeEventSafely({
            eventName: 'contract.changed',
            userIds: [userInstantId, updatedContract.sale_by, updatedContract.purchased_by],
            payload: {
                entity_id: updatedContract.id,
                action: 'update',
                triggered_by: userInstantId,
                timestamp: Date.now()
            }
        })

        return NextResponse.json(
            { contract: updatedContract },
            { status: 200 }
        )

    } catch (error) {
        console.error('Error updating contract:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

