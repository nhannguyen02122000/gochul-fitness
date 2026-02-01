// src/app/api/contract/update/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

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
        const { contract_id, kind, status, money, start_date, end_date, credits, sale_by } = body

        // Validate required field: contract_id
        if (!contract_id || typeof contract_id !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid required field: contract_id must be a string' },
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

        // Check if there are any fields to update
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'No fields to update provided' },
                { status: 400 }
            )
        }

        // Update the contract using InstantDB transaction
        await instantServer.transact([
            instantServer.tx.contract[contract_id].update(updateData)
        ])

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

