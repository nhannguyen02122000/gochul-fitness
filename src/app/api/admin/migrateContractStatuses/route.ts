
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { Contract } from '@/app/type/api'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BATCH_SIZE = 100

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize))
    }
    return chunks
}

export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
        }

        const userData = await instantServer.query({
            user_setting: { $: { where: { clerk_id: userId } }, users: {} }
        })
        const userSetting = userData.user_setting[0]

        if (!userSetting) {
            return NextResponse.json({ error: 'User settings not found' }, { status: 404 })
        }

        if (userSetting.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Only ADMIN can preview migration' }, { status: 403 })
        }

        const [reviewData, confirmedData, paidData, ptData] = await Promise.all([
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_REVIEW' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_CONFIRMED' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_PAID' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'PT_CONFIRMED' } } } })
        ])

        const reviewContracts = reviewData.contract || []
        const confirmedContracts = confirmedData.contract || []
        const paidContracts = paidData.contract || []
        const ptContracts = ptData.contract || []

        const contracts = [
            ...(reviewContracts.map((c) => ({ ...c, current_status: 'CUSTOMER_REVIEW' as const })) as (Contract & { current_status: 'CUSTOMER_REVIEW' })[]),
            ...(confirmedContracts.map((c) => ({ ...c, current_status: 'CUSTOMER_CONFIRMED' as const })) as (Contract & { current_status: 'CUSTOMER_CONFIRMED' })[]),
            ...(paidContracts.map((c) => ({ ...c, current_status: 'CUSTOMER_PAID' as const })) as (Contract & { current_status: 'CUSTOMER_PAID' })[]),
            ...(ptContracts.map((c) => ({ ...c, current_status: 'PT_CONFIRMED' as const })) as (Contract & { current_status: 'PT_CONFIRMED' })[])
        ]

        return NextResponse.json({
            counts: {
                CUSTOMER_REVIEW: reviewContracts.length,
                CUSTOMER_CONFIRMED: confirmedContracts.length,
                CUSTOMER_PAID: paidContracts.length,
                PT_CONFIRMED: ptContracts.length
            },
            total: contracts.length,
            contracts: contracts.map((c) => ({
                id: c.id,
                current_status: c.current_status,
                start_date: c.start_date ?? null,
                purchased_by: c.purchased_by,
                kind: c.kind
            }))
        }, { status: 200 })
    } catch (error) {
        console.error('Error previewing migration:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
        }

        const userData = await instantServer.query({
            user_setting: { $: { where: { clerk_id: userId } }, users: {} }
        })
        const userSetting = userData.user_setting[0]

        if (!userSetting) {
            return NextResponse.json({ error: 'User settings not found' }, { status: 404 })
        }

        if (userSetting.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Only ADMIN can run migration' }, { status: 403 })
        }

        const [reviewData, confirmedData, paidData, ptData] = await Promise.all([
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_REVIEW' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_CONFIRMED' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'CUSTOMER_PAID' } } } }),
            instantServer.query({ contract: { $: { where: { status: 'PT_CONFIRMED' } } } })
        ])

        const allContracts = [
            ...(reviewData.contract || []),
            ...(confirmedData.contract || []),
            ...(paidData.contract || []),
            ...(ptData.contract || [])
        ]

        if (allContracts.length === 0) {
            return NextResponse.json({
                message: 'No contracts to migrate',
                migrated: 0,
                by_status: {
                    CUSTOMER_REVIEW: 0,
                    CUSTOMER_CONFIRMED: 0,
                    CUSTOMER_PAID: 0,
                    PT_CONFIRMED: 0
                }
            }, { status: 200 })
        }

        const now = Date.now()
        const transactions = allContracts.map((contract) =>
            instantServer.tx.contract[contract.id].update({
                status: 'ACTIVE',
                updated_at: now
            })
        )

        const chunks = chunkArray(transactions, BATCH_SIZE)
        for (const chunk of chunks) {
            await instantServer.transact(chunk)
        }

        const byStatus = {
            CUSTOMER_REVIEW: (reviewData.contract || []).length,
            CUSTOMER_CONFIRMED: (confirmedData.contract || []).length,
            CUSTOMER_PAID: (paidData.contract || []).length,
            PT_CONFIRMED: (ptData.contract || []).length
        }

        return NextResponse.json({
            message: 'Contract status migration completed',
            migrated: allContracts.length,
            by_status: byStatus
        }, { status: 200 })
    } catch (error) {
        console.error('Error migrating contract statuses:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
