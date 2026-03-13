'use client'

import type { GetUserInformationResponse } from '@/app/type/api'
import { contractKeys } from '@/hooks/useContracts'
import { historyKeys } from '@/hooks/useHistory'
import { getUserRealtimeChannel } from '@/lib/realtime/channel'
import { useAuth } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import Ably from 'ably'
import { useEffect } from 'react'

export default function RealtimeProvider() {
  const queryClient = useQueryClient()
  const { isSignedIn } = useAuth()

  useEffect(() => {
    if (!isSignedIn) {
      return
    }

    let isUnmounted = false
    let realtimeClient: Ably.Realtime | null = null
    let channel: Ably.RealtimeChannelCallbacks | null = null

    const initializeRealtime = async () => {
      const userResponse = await fetch('/api/user/getUserInformation')
      if (!userResponse.ok) {
        return
      }

      const userData = await userResponse.json() as GetUserInformationResponse
      if ('error' in userData) {
        return
      }

      const userInstantId = userData.instantUser?.[0]?.id
      if (!userInstantId || isUnmounted) {
        return
      }

      realtimeClient = new Ably.Realtime({
        authUrl: '/api/realtime/token'
      })

      channel = realtimeClient.channels.get(getUserRealtimeChannel(userInstantId))

      const handleRealtimeUpdate = () => {
        queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
        queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
      }

      channel.subscribe('contract.changed', handleRealtimeUpdate)
      channel.subscribe('history.changed', handleRealtimeUpdate)
    }

    initializeRealtime().catch((error) => {
      console.error('Failed to initialize realtime client:', error)
    })

    return () => {
      isUnmounted = true
      if (channel) {
        channel.unsubscribe()
      }
      if (realtimeClient) {
        realtimeClient.close()
      }
    }
  }, [isSignedIn, queryClient])

  return null
}

