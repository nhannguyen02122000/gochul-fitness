import Ably from 'ably'
import { getUserRealtimeChannel } from './channel'

export type RealtimeEventName = 'contract.changed' | 'history.changed'

export interface RealtimePublishPayload {
  entity_id: string
  action: 'create' | 'update' | 'delete' | 'update_status' | 'update_note'
  triggered_by: string
  timestamp: number
}

export function isRealtimeEnabled(): boolean {
  return process.env.NODE_ENV === 'production'
}

function getAblyApiKey(): string {
  const key = process.env.ABLY_API_KEY
  if (!key) {
    throw new Error('Missing ABLY_API_KEY in environment')
  }
  return key
}

let ablyRest: Ably.Rest | null = null

function getAblyRestClient(): Ably.Rest {
  if (ablyRest) {
    return ablyRest
  }

  ablyRest = new Ably.Rest(getAblyApiKey())
  return ablyRest
}

export function sanitizeUserIds(userIds: Array<string | undefined | null>): string[] {
  return Array.from(new Set(userIds.filter((userId): userId is string => Boolean(userId))))
}

export async function publishRealtimeEvent(options: {
  eventName: RealtimeEventName
  payload: RealtimePublishPayload
  userIds: Array<string | undefined | null>
}): Promise<void> {
  if (!isRealtimeEnabled()) {
    return
  }

  const targetUserIds = sanitizeUserIds(options.userIds)

  if (targetUserIds.length === 0) {
    return
  }

  await Promise.all(
    targetUserIds.map((userId) =>
      getAblyRestClient()
        .channels
        .get(getUserRealtimeChannel(userId))
        .publish(options.eventName, options.payload)
    )
  )
}

export async function publishRealtimeEventSafely(options: {
  eventName: RealtimeEventName
  payload: RealtimePublishPayload
  userIds: Array<string | undefined | null>
}): Promise<void> {
  if (!isRealtimeEnabled()) {
    return
  }

  try {
    await publishRealtimeEvent(options)
  } catch (error) {
    console.error('Failed to publish realtime event:', error)
  }
}

export async function createScopedTokenRequest(userId: string) {
  if (!isRealtimeEnabled()) {
    throw new Error('Realtime is disabled in non-production environments')
  }

  return getAblyRestClient().auth.createTokenRequest({
    clientId: userId,
    capability: JSON.stringify({
      [getUserRealtimeChannel(userId)]: ['subscribe']
    })
  })
}

