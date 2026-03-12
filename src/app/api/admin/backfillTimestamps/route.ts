// src/app/api/admin/backfillTimestamps/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

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

export async function POST() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
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

        if (userSetting.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden - Only ADMIN can backfill timestamps' },
                { status: 403 }
            )
        }

        const now = Date.now()

        const [contractsData, historyData] = await Promise.all([
            instantServer.query({
                contract: {
                    $: {}
                }
            }),
            instantServer.query({
                history: {
                    $: {}
                }
            })
        ])

        const contractTransactions = (contractsData.contract || [])
            .map((contract) => {
                const hasCreatedAt = typeof contract.created_at === 'number'
                const hasUpdatedAt = typeof contract.updated_at === 'number'

                if (hasCreatedAt && hasUpdatedAt) {
                    return null
                }

                const fallbackCreatedAt =
                    typeof contract.start_date === 'number'
                        ? contract.start_date
                        : typeof contract.end_date === 'number'
                            ? contract.end_date
                            : now

                return instantServer.tx.contract[contract.id].update({
                    ...(hasCreatedAt ? {} : { created_at: fallbackCreatedAt }),
                    ...(hasUpdatedAt
                        ? {}
                        : {
                            updated_at: hasCreatedAt
                                ? (contract.created_at as number)
                                : fallbackCreatedAt
                        })
                })
            })
            .filter((tx): tx is NonNullable<typeof tx> => tx !== null)

        const historyTransactions = (historyData.history || [])
            .map((session) => {
                const hasCreatedAt = typeof session.created_at === 'number'
                const hasUpdatedAt = typeof session.updated_at === 'number'

                if (hasCreatedAt && hasUpdatedAt) {
                    return null
                }

                const fallbackCreatedAt =
                    typeof session.date === 'number' ? session.date : now

                return instantServer.tx.history[session.id].update({
                    ...(hasCreatedAt ? {} : { created_at: fallbackCreatedAt }),
                    ...(hasUpdatedAt
                        ? {}
                        : {
                            updated_at: hasCreatedAt
                                ? (session.created_at as number)
                                : fallbackCreatedAt
                        })
                })
            })
            .filter((tx): tx is NonNullable<typeof tx> => tx !== null)

        const allTransactions = [...contractTransactions, ...historyTransactions]

        if (allTransactions.length > 0) {
            const chunks = chunkArray(allTransactions, BATCH_SIZE)
            for (const chunk of chunks) {
                await instantServer.transact(chunk)
            }
        }

        return NextResponse.json(
            {
                message: 'Timestamp backfill completed',
                updated_contracts: contractTransactions.length,
                updated_history: historyTransactions.length,
                total_updates: allTransactions.length
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error backfilling timestamps:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
