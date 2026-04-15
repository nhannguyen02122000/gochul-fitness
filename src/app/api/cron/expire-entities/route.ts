// src/app/api/cron/expire-entities/route.ts
import { instantServer } from '@/lib/dbServer'
import { publishRealtimeEventSafely } from '@/lib/realtime/ablyServer'
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

// -----------------------------------------------------------------------
// Credit helpers (same logic as contract/getAll/route.ts)
// -----------------------------------------------------------------------
function isCreditUsedHistoryStatus(status: unknown): boolean {
  return status === 'NEWLY_CREATED' || status === 'CHECKED_IN'
}

function hasAvailableCredits(contract: Record<string, unknown>): boolean {
  const kind = typeof contract.kind === 'string' ? contract.kind : undefined
  const credits = typeof contract.credits === 'number' ? contract.credits : undefined
  const history = Array.isArray(contract.history) ? contract.history : []

  if (kind !== 'PT' && kind !== 'REHAB') {
    return true
  }

  if (!credits || credits <= 0) {
    return false
  }

  const usedCredits = history.filter((item) => {
    if (!item || typeof item !== 'object') return false
    const status = (item as Record<string, unknown>).status
    return isCreditUsedHistoryStatus(typeof status === 'string' ? status : '')
  }).length

  return usedCredits < credits
}

export async function GET(request: Request) {
  try {
    // Vercel cron always sends this user-agent
    const userAgent = request.headers.get('user-agent')
    if (userAgent !== 'vercel-cron/1.0') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify CRON_SECRET from Authorization header (added in Vercel cron config)
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dry_run') === 'true'

    const now = Date.now()
    const result: {
      contractsExpired: number
      sessionsExpired: number
      errors: string[]
      dryRun: boolean
    } = {
      contractsExpired: 0,
      sessionsExpired: 0,
      errors: [],
      dryRun
    }

    // -------------------------------------------------------------------
    // Step 1: Query all contracts with their history (for credit check)
    // -------------------------------------------------------------------
    const contractsData = await instantServer.query({
      contract: {
        $: {},
        users: {},
        sale_by_user: {},
        purchased_by_user: {}
      }
    })

    const contracts = contractsData.contract || []

    // -------------------------------------------------------------------
    // Step 2: Identify contracts to expire
    // -------------------------------------------------------------------
    const contractTxToExpire: Array<{ id: string; reason: string }> = []

    for (const contract of contracts) {
      if (contract.status === 'NEWLY_CREATED') {
        if (contract.end_date && contract.end_date < now) {
          contractTxToExpire.push({ id: contract.id, reason: 'NEWLY_CREATED date expired' })
        }
      } else if (contract.status === 'ACTIVE') {
        if (contract.end_date && contract.end_date < now) {
          contractTxToExpire.push({ id: contract.id, reason: 'ACTIVE date expired' })
        } else if (!hasAvailableCredits(contract)) {
          contractTxToExpire.push({ id: contract.id, reason: 'ACTIVE credits exhausted' })
        }
      }
    }

    // -------------------------------------------------------------------
    // Step 3: Query all history/sessions
    // -------------------------------------------------------------------
    const historyData = await instantServer.query({
      history: {
        $: {},
        users: {},
        contract: {}
      }
    })

    const sessions = historyData.history || []

    // -------------------------------------------------------------------
    // Step 4: Identify sessions to expire
    // -------------------------------------------------------------------
    const sessionTxToExpire: string[] = []

    for (const session of sessions) {
      if (session.status === 'NEWLY_CREATED') {
        const sessionEndTime = session.date + (session.to * 60 * 1000)
        if (sessionEndTime < now) {
          sessionTxToExpire.push(session.id)
        }
      }
    }

    // -------------------------------------------------------------------
    // Step 5: Dry run — return counts without writing
    // -------------------------------------------------------------------
    if (dryRun) {
      return NextResponse.json({
        contractsToExpire: contractTxToExpire,
        sessionsToExpire: sessionTxToExpire,
        dryRun: true
      })
    }

    // -------------------------------------------------------------------
    // Step 6: Write contracts to EXPIRED in batches
    // -------------------------------------------------------------------
    if (contractTxToExpire.length > 0) {
      const contractChunks = chunkArray(contractTxToExpire, BATCH_SIZE)

      for (const chunk of contractChunks) {
        try {
          const txs = chunk.map(({ id }) =>
            instantServer.tx.contract[id].update({
              status: 'EXPIRED',
              updated_at: now
            })
          )
          await instantServer.transact(txs)
          result.contractsExpired += chunk.length
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          result.errors.push(`contract batch error: ${msg}`)
        }
      }

      // Publish contract.changed events per expired contract
      for (const { id } of contractTxToExpire) {
        const contract = contracts.find((c) => c.id === id)
        if (contract) {
          await publishRealtimeEventSafely({
            eventName: 'contract.changed',
            userIds: [
              contract.sale_by,
              contract.purchased_by
            ],
            payload: {
              entity_id: id,
              action: 'update_status',
              triggered_by: 'cron:expire-entities',
              timestamp: now
            }
          })
        }
      }
    }

    // -------------------------------------------------------------------
    // Step 7: Write sessions to EXPIRED in batches
    // -------------------------------------------------------------------
    if (sessionTxToExpire.length > 0) {
      const sessionChunks = chunkArray(sessionTxToExpire, BATCH_SIZE)

      for (const chunk of sessionChunks) {
        try {
          const txs = chunk.map((id) =>
            instantServer.tx.history[id].update({
              status: 'EXPIRED',
              updated_at: now
            })
          )
          await instantServer.transact(txs)
          result.sessionsExpired += chunk.length
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          result.errors.push(`history batch error: ${msg}`)
        }
      }

      // Publish history.changed events per expired session
      for (const id of sessionTxToExpire) {
        const session = sessions.find((s) => s.id === id)
        const contract = Array.isArray(session?.contract) ? session.contract[0] : null
        if (session) {
          await publishRealtimeEventSafely({
            eventName: 'history.changed',
            userIds: [
              session.users?.[0]?.id,
              contract?.purchased_by,
              contract?.sale_by,
              session.teach_by
            ],
            payload: {
              entity_id: id,
              action: 'update_status',
              triggered_by: 'cron:expire-entities',
              timestamp: now
            }
          })
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in expire-entities cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
