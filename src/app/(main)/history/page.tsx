// src/app/history/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Loader2,
  Inbox,
} from 'lucide-react'
import type { GetUserInformationResponse } from '@/app/type/api'
import SessionCard from '@/components/cards/SessionCard'
import { useInfiniteHistory } from '@/hooks/useHistory'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { isCompletedHistoryStatus } from '@/utils/statusUtils'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function HistoryPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('upcoming')

  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
  })

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteHistory(10)

  const userRole =
    userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId =
    userInfo && 'instantUser' in userInfo
      ? userInfo.instantUser?.[0]?.id
      : undefined

  const allHistory =
    data?.pages.flatMap((page) =>
      'history' in page ? page.history : []
    ) || []

  // Use current time from state to avoid impure function in useMemo
  const [now] = useState(() => Date.now())

  // Categorize sessions
  const categorizedSessions = useMemo(() => {
    // Upcoming: NEWLY_CREATED or CHECKED_IN where session end time hasn't passed
    const upcoming = allHistory
      .filter((session) => {
        const sessionEndTime = session.date + session.to * 60 * 1000
        return (
          sessionEndTime >= now &&
          (session.status === 'NEWLY_CREATED' ||
            isCompletedHistoryStatus(session.status))
        )
      })
      .sort((a, b) => {
        const aTime = a.date + a.from * 60 * 1000
        const bTime = b.date + b.from * 60 * 1000
        return aTime - bTime
      })

    // Past: Only CHECKED_IN status where session end time has passed
    const past = allHistory
      .filter((session) => {
        const sessionEndTime = session.date + session.to * 60 * 1000
        return isCompletedHistoryStatus(session.status) && sessionEndTime < now
      })
      .sort((a, b) => {
        const aTime = a.date + a.from * 60 * 1000
        const bTime = b.date + b.from * 60 * 1000
        return bTime - aTime
      })

    // Overdue: NEWLY_CREATED where session end time has passed
    const overdue = allHistory
      .filter((session) => {
        const sessionEndTime = session.date + session.to * 60 * 1000
        return (
          sessionEndTime < now &&
          session.status === 'NEWLY_CREATED'
        )
      })
      .sort((a, b) => {
        const aTime = a.date + a.from * 60 * 1000
        const bTime = b.date + b.from * 60 * 1000
        return bTime - aTime
      })

    // Inactive: EXPIRED or CANCELED status
    const inactive = allHistory
      .filter(
        (session) =>
          session.status === 'EXPIRED' || session.status === 'CANCELED'
      )
      .sort((a, b) => {
        const aTime = a.date + a.from * 60 * 1000
        const bTime = b.date + b.from * 60 * 1000
        return bTime - aTime
      })

    const completed = past.length

    return { upcoming, past, overdue, inactive, completed, all: allHistory }
  }, [allHistory, now])

  const sessionsByTab: Record<string, typeof allHistory> = {
    upcoming: categorizedSessions.upcoming,
    past: categorizedSessions.past,
    overdue: categorizedSessions.overdue,
    inactive: categorizedSessions.inactive,
  }

  const displayedSessions = sessionsByTab[activeTab] || []

  // All roles can create sessions
  const canCreateSession = !!userRole

  const emptyMessages: Record<string, { title: string; subtitle: string }> = {
    upcoming: {
      title: 'No upcoming sessions',
      subtitle: 'Book your next training session to get started',
    },
    past: {
      title: 'No past sessions',
      subtitle: 'Completed sessions will appear here',
    },
    overdue: {
      title: 'No overdue sessions',
      subtitle: 'Overdue sessions that need attention will appear here',
    },
    inactive: {
      title: 'No inactive sessions',
      subtitle: 'Canceled and expired sessions will appear here',
    },
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-xl font-bold text-foreground mb-1">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your training sessions
        </p>
      </div>

      {/* Create Session Button */}
      {canCreateSession && (
        <div className="px-4 mt-3 mb-4 animate-slide-up">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="w-full h-12 text-sm font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Session
          </Button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-3 mb-5 animate-fade-in">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total</p>
            <p className="text-xl font-bold text-foreground leading-none tabular-nums">
              {categorizedSessions.all.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-info-bg)]/60 border-[var(--color-warning)]/25">
          <CardContent className="p-3">
            <p className="text-[10px] text-[var(--color-warning)] font-medium mb-0.5">
              Upcoming
            </p>
            <p className="text-xl font-bold text-[var(--color-warning)] leading-none tabular-nums">
              {categorizedSessions.upcoming.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-success-bg)]/60 border-[var(--color-success)]/25">
          <CardContent className="p-3">
            <p className="text-[10px] text-[var(--color-success)] font-medium mb-0.5">
              Completed
            </p>
            <p className="text-xl font-bold text-[var(--color-success)] leading-none tabular-nums">
              {categorizedSessions.completed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as string)}
        >
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="upcoming" className="text-xs">
              Upcoming
              <span className="ml-1 text-[10px] opacity-60">
                {categorizedSessions.upcoming.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="past" className="text-xs">
              Past
              <span className="ml-1 text-[10px] opacity-60">
                {categorizedSessions.completed}
              </span>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs">
              Overdue
              <span className="ml-1 text-[10px] opacity-60">
                {categorizedSessions.overdue.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">
              Inactive
              <span className="ml-1 text-[10px] opacity-60">
                {categorizedSessions.inactive.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sessions List */}
      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayedSessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {emptyMessages[activeTab]?.title || 'No sessions'}
              </p>
              <p className="text-xs text-muted-foreground">
                {emptyMessages[activeTab]?.subtitle || ''}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {displayedSessions.map((session, index) => (
                <div
                  key={session.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <SessionCard
                    session={session}
                    userRole={userRole}
                    userInstantId={userInstantId}
                    onClick={() => {
                      // TODO: Open session detail modal
                    }}
                  />
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="min-w-[180px] h-11"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
