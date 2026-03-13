// src/components/layout/TopBar.tsx
'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GetUserInformationResponse } from '@/app/type/api'
import { historyKeys } from '@/hooks/useHistory'
import { contractKeys } from '@/hooks/useContracts'
import { userKeys } from '@/hooks/useUser'
import { useState } from 'react'
import { RefreshCw, User } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    enabled: typeof window !== 'undefined'
  })

  const handleRefresh = async () => {
    if (isRefreshing) return

    setIsRefreshing(true)

    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: historyKeys.all }),
        queryClient.invalidateQueries({ queryKey: contractKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['userInfo'] }),
      ])

      await queryClient.refetchQueries({
        type: 'active',
        stale: true
      })
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setTimeout(() => {
        setIsRefreshing(false)
      }, 500)
    }
  }

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard'
    if (pathname === '/contracts') return 'Contracts'
    if (pathname === '/history') return 'Sessions'
    if (pathname === '/profile/essential-information') return 'Essential Information'
    if (pathname === '/profile') return 'Profile'
    return 'GoChul Fitness'
  }

  if (isLoading || typeof window === 'undefined') {
    return (
      <header className="shrink-0 z-50 bg-white border-b border-border safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="w-24 h-4 rounded" />
                <Skeleton className="w-14 h-3 rounded" />
              </div>
            </div>
            <Skeleton className="w-9 h-9 rounded-lg" />
          </div>
        </div>
      </header>
    )
  }

  if (!data || 'error' in data) {
    return null
  }

  const firstName = data.first_name || data.username || 'User'
  const initials = [data.first_name?.[0], data.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U'

  const getRoleVariant = () => {
    const roleMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      ADMIN: { label: 'Admin', variant: 'default' },
      STAFF: { label: 'Staff', variant: 'secondary' },
      CUSTOMER: { label: 'Member', variant: 'outline' }
    }
    return roleMap[data.role as string] || roleMap.CUSTOMER
  }

  const roleBadge = getRoleVariant()

  return (
    <header className="shrink-0 z-50 bg-white border-b border-border safe-area-top">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* User Info */}
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-3 cursor-pointer active:scale-[0.97] transition-transform"
          >
            <div className="relative">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={data.imageUrl} alt={firstName} />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--color-success)] border-2 border-white rounded-full" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-foreground text-sm leading-tight">
                {firstName}
              </span>
              <Badge variant={roleBadge.variant} className="text-[10px] h-4 px-1.5 mt-0.5">
                {roleBadge.label}
              </Badge>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* Page title */}
            <span className="text-sm font-medium text-muted-foreground mr-2 hidden sm:block">
              {getPageTitle()}
            </span>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-white hover:bg-muted active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
