// src/app/api/history/getByContract/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

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
        const history = contract.history || []

        // Check for expired sessions and update them
        const now = Date.now()
        const expiredHistoryIds: string[] = []

        for (const session of history) {
            // Skip if already expired or canceled
            if (session.status === 'EXPIRED' || session.status === 'CANCELED') {
                continue
            }

            // Calculate session end time: date + to (minutes from midnight) * 60000
            const sessionEndTime = session.date + (session.to * 60 * 1000)

            if (sessionEndTime < now) {
                expiredHistoryIds.push(session.id)
                // Update the status in the list for immediate response
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

        // Sort history by date (newest first)
        history.sort((a, b) => {
            // First sort by date
            if (b.date !== a.date) {
                return b.date - a.date
            }
            // If same date, sort by time (from)
            return b.from - a.from
        })

        // Remove the history from contract to avoid circular reference in response
        const { history: _, ...contractWithoutHistory } = contract

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
