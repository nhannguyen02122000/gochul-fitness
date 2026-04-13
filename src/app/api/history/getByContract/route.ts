// src/app/api/history/getByContract/route.ts
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
        // Check if user is signed in
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        // Get contract_id from query parameters
        const { searchParams } = new URL(request.url)
        const contractId = searchParams.get('contract_id')

        if (!contractId) {
            return NextResponse.json(
                { error: 'contract_id is required' },
                { status: 400 }
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

        // First, get the contract to verify it exists and check permissions
        const contractData = await instantServer.query({
            contract: {
                $: {
                    where: {
                        id: contractId
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

        const contract = contractData.contract?.[0]

        if (!contract) {
            return NextResponse.json(
                { error: 'Contract not found' },
                { status: 404 }
            )
        }

        // Role-based access control
        let hasAccess = false

        if (role === 'ADMIN') {
            // ADMIN can view any contract's history
            hasAccess = true
        } else if (role === 'CUSTOMER') {
            // CUSTOMER can only view their own contracts
            hasAccess = contract.purchased_by === userInstantId
        } else if (role === 'STAFF') {
            // STAFF can view if they are the trainer (sale_by) for the contract
            hasAccess = contract.sale_by === userInstantId
        }

        if (!hasAccess) {
            return NextResponse.json(
                { error: 'You do not have permission to view this contract\'s history' },
                { status: 403 }
            )
        }

        // Get all history for this contract
        const history = (contract.history || []) as Array<Record<string, unknown>>

        // Sort history by updated_at (latest first) with deterministic fallbacks
        history.sort(compareHistoryLatestFirst)

        // Remove the history from contract to avoid circular reference in response
        const { history: contractHistory, ...contractWithoutHistory } = contract
        void contractHistory

        return NextResponse.json({
            history,
            contract: contractWithoutHistory,
            role
        })

    } catch (error) {
        console.error('Error fetching contract history:', JSON.stringify(error, null, 2))
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
