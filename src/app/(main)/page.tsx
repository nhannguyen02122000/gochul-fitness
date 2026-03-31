// src/app/(main)/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, FileText, Clock, Loader2 } from 'lucide-react'
import { useInfiniteHistory } from '@/hooks/useHistory'
import { useInfiniteContracts } from '@/hooks/useContracts'
import SessionCard from '@/components/cards/SessionCard'
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse, HistoryFilters } from '@/app/type/api'
import CreateContractModal from '@/components/modals/CreateContractModal'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) throw new Error('Failed to fetch user information')
  return response.json()
}

function startOfDayTimestamp(date: Date): number {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next.getTime()
}

function endOfDayTimestamp(date: Date): number {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next.getTime()
}

export default function HomePage() {
  const [createContractOpen, setCreateContractOpen] = useState(false)
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    enabled: isSignedIn
  })

  const upcomingWindowFilters = useMemo<HistoryFilters>(() => {
    const now = new Date()
    const twoDaysFromNow = new Date(now)
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

    return {
      statuses: ['NEWLY_CREATED', 'CHECKED_IN'],
      start_date: startOfDayTimestamp(now),
      end_date: endOfDayTimestamp(twoDaysFromNow)
    }
  }, [])

  const { data: historyData, isLoading: historyLoading } = useInfiniteHistory(50, upcomingWindowFilters)
  const { data: contractsData } = useInfiniteContracts(10)

  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId =
    userInfo && 'instantUser' in userInfo
      ? userInfo.instantUser?.[0]?.id
      : undefined

  const upcomingSessions = useMemo(() => {
    if (!historyData) return []
    const allSessions = historyData.pages.flatMap(page =>
      'history' in page ? page.history : []
    )
    const now = Date.now()
    const maxWindowTime = now + (2 * 24 * 60 * 60 * 1000)
    return allSessions
      .filter(session => {
        const sessionEndTime = session.date + (session.to * 60 * 1000)
        const sessionStartTime = session.date + (session.from * 60 * 1000)
        return sessionEndTime >= now && sessionStartTime <= maxWindowTime
      })
      .sort((a, b) => {
        const aTime = a.date + (a.from * 60 * 1000)
        const bTime = b.date + (b.from * 60 * 1000)
        return aTime - bTime
      })
      .slice(0, 3)
  }, [historyData])

  const activeContractsCount = useMemo(() => {
    if (!contractsData) return 0
    const allContracts = contractsData.pages.flatMap(page =>
      'contracts' in page ? page.contracts : []
    )
    return allContracts.filter(c => c.status === 'ACTIVE').length
  }, [contractsData])

  const isStaffOrAdmin = userInfo && 'role' in userInfo && (userInfo.role === 'ADMIN' || userInfo.role === 'STAFF')

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* Header section */}
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Track your progress and manage your fitness journey</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-3 mb-5 animate-fade-in">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-cta)]/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-[var(--color-cta)]" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground leading-none tabular-nums">{activeContractsCount}</p>
                <p className="text-[10px] text-muted-foreground">Contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-success-bg)] flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-[var(--color-success)]" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-foreground leading-none tabular-nums">{upcomingSessions.length}</p>
                <p className="text-[10px] text-muted-foreground">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Create Contract Button for ADMIN/STAFF */}
      {isStaffOrAdmin && (
        <div className="mb-5 px-4 animate-slide-up">
          <Button
            onClick={() => setCreateContractOpen(true)}
            className="w-full h-12 text-sm font-semibold bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Contract
          </Button>
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Upcoming Sessions</h2>
            <p className="text-xs text-muted-foreground">Next {upcomingSessions.length} sessions</p>
          </div>
          {upcomingSessions.length > 0 && (
            <button
              onClick={() => router.push('/history')}
              className="text-xs font-medium text-[var(--color-cta)] hover:underline cursor-pointer"
            >
              View All
            </button>
          )}
        </div>

        {historyLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="w-14 h-14 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : upcomingSessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No upcoming sessions</p>
              <p className="text-xs text-muted-foreground">Book your next training session to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session, index) => (
              <div
                key={session.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <SessionCard
                  session={session}
                  userRole={userRole}
                  userInstantId={userInstantId as string}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Contract Modal */}
      <CreateContractModal
        open={createContractOpen}
        onClose={() => setCreateContractOpen(false)}
      />
    </div>
  )
}
