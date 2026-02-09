// src/app/history/page.tsx
'use client'

import type { GetUserInformationResponse } from '@/app/type/api'
import SessionCard from '@/components/cards/SessionCard'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import { useInfiniteHistory } from '@/hooks/useHistory'
import { CalendarOutlined, CheckCircleOutlined, PlusOutlined, StopOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Empty, Tabs, Spin, Typography } from 'antd'
import { useMemo, useState } from 'react'

const { Title, Text } = Typography

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
    queryFn: fetchUserInfo
  })

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteHistory(10)

  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId = userInfo && 'instantUser' in userInfo ? userInfo.instantUser?.[0]?.id : undefined

  // Allow CUSTOMER, ADMIN, and STAFF to create sessions
  const canCreateSession = userRole && ['CUSTOMER', 'ADMIN', 'STAFF'].includes(userRole)

  const allHistory = data?.pages.flatMap(page => 'history' in page ? page.history : []) || []

  // Use current time from state to avoid impure function in useMemo
  const [now] = useState(() => Date.now())

  // Categorize sessions
  const categorizedSessions = useMemo(() => {
    // Upcoming: NEWLY_CREATED, PT_CONFIRMED, USER_CHECKED_IN, PT_CHECKED_IN where session end time hasn't passed
    const upcoming = allHistory
      .filter(session => {
        const sessionEndTime = session.date + (session.to * 60 * 1000)
        return sessionEndTime >= now &&
          (session.status === 'NEWLY_CREATED' ||
            session.status === 'PT_CONFIRMED' ||
            session.status === 'USER_CHECKED_IN' ||
            session.status === 'PT_CHECKED_IN')
      })
      .sort((a, b) => {
        const aTime = a.date + (a.from * 60 * 1000)
        const bTime = b.date + (b.from * 60 * 1000)
        return aTime - bTime
      })

    // Past: Only PT_CHECKED_IN status where session end time has passed
    const past = allHistory
      .filter(session => {
        const sessionEndTime = session.date + (session.to * 60 * 1000)
        return session.status === 'PT_CHECKED_IN' && sessionEndTime < now
      })
      .sort((a, b) => {
        const aTime = a.date + (a.from * 60 * 1000)
        const bTime = b.date + (b.from * 60 * 1000)
        return bTime - aTime
      })

    // Overdue: NEWLY_CREATED, PT_CONFIRMED, USER_CHECKED_IN, PT_CHECKED_IN where session end time has passed
    // (excluding PT_CHECKED_IN which goes to Past)
    const overdue = allHistory
      .filter(session => {
        const sessionEndTime = session.date + (session.to * 60 * 1000)
        return sessionEndTime < now &&
          (session.status === 'NEWLY_CREATED' ||
            session.status === 'PT_CONFIRMED' ||
            session.status === 'USER_CHECKED_IN')
      })
      .sort((a, b) => {
        const aTime = a.date + (a.from * 60 * 1000)
        const bTime = b.date + (b.from * 60 * 1000)
        return bTime - aTime
      })

    // Inactive: EXPIRED or CANCELED status
    const inactive = allHistory
      .filter(session => session.status === 'EXPIRED' || session.status === 'CANCELED')
      .sort((a, b) => {
        const aTime = a.date + (a.from * 60 * 1000)
        const bTime = b.date + (b.from * 60 * 1000)
        return bTime - aTime
      })

    const completed = past.length

    return { upcoming, past, overdue, inactive, completed, all: allHistory }
  }, [allHistory, now])

  const sessionsByTab = {
    upcoming: categorizedSessions.upcoming,
    past: categorizedSessions.past,
    overdue: categorizedSessions.overdue,
    inactive: categorizedSessions.inactive
  }

  const displayedSessions = sessionsByTab[activeTab as keyof typeof sessionsByTab] || []

  const tabItems = [
    {
      key: 'upcoming',
      label: (
        <span className="flex items-center gap-2">
          <CalendarOutlined />
          Upcoming
          <Badge count={categorizedSessions.upcoming.length} showZero style={{ backgroundColor: '#5A9CB5' }} />
        </span>
      )
    },
    {
      key: 'past',
      label: (
        <span className="flex items-center gap-2">
          <CheckCircleOutlined />
          Past
          <Badge count={categorizedSessions.completed} showZero style={{ backgroundColor: '#10b981' }} />
        </span>
      )
    },
    {
      key: 'overdue',
      label: (
        <span className="flex items-center gap-2">
          <ExclamationCircleOutlined />
          Overdue
          <Badge count={categorizedSessions.overdue.length} showZero style={{ backgroundColor: '#f59e0b' }} />
        </span>
      )
    },
    {
      key: 'inactive',
      label: (
        <span className="flex items-center gap-2">
          <StopOutlined />
          Inactive
          <Badge count={categorizedSessions.inactive.length} showZero style={{ backgroundColor: '#6b7280' }} />
        </span>
      )
    }
  ]

  return (
    <div className="pb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mt-5 mb-5 animate-fade-in px-4">
        <Card className="!border-0 shadow-sm" styles={{ body: { padding: '12px' } }}>
          <Text className="text-[10px] text-gray-500 block mb-1">Total</Text>
          <Text strong className="text-xl block leading-none">{categorizedSessions.all.length}</Text>
        </Card>
        <Card className="!border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50" styles={{ body: { padding: '12px' } }}>
          <Text className="text-[10px] text-blue-600 block mb-1 font-medium">Upcoming</Text>
          <Text strong className="text-xl block text-blue-600 leading-none">{categorizedSessions.upcoming.length}</Text>
        </Card>
        <Card className="!border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50" styles={{ body: { padding: '12px' } }}>
          <Text className="text-[10px] text-green-600 block mb-1 font-medium">Completed</Text>
          <Text strong className="text-xl block text-green-600 leading-none">{categorizedSessions.completed}</Text>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <div className="mb-3 px-4">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="modern-tabs"
        />
      </div>

      {/* Sessions List */}
      <div className="px-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : displayedSessions.length === 0 ? (
          <Card className="!border-2 !border-dashed">
            <Empty
              description={
                <div className="py-6">
                  <Text className="text-gray-500 block mb-3 text-base font-medium">
                    {activeTab === 'upcoming' && 'No upcoming sessions'}
                    {activeTab === 'past' && 'No past sessions'}
                    {activeTab === 'overdue' && 'No overdue sessions'}
                    {activeTab === 'inactive' && 'No inactive sessions'}
                  </Text>
                  <Text type="secondary" className="text-sm">
                    {activeTab === 'upcoming' && 'Book your next training session to get started'}
                    {activeTab === 'past' && 'Completed sessions will appear here'}
                    {activeTab === 'overdue' && 'Overdue sessions will appear here'}
                    {activeTab === 'inactive' && 'Canceled and expired sessions will appear here'}
                  </Text>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : (
          <>
            <div className="space-y-4">
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
                  size="large"
                  onClick={() => fetchNextPage()}
                  loading={isFetchingNextPage}
                  className="min-w-[180px]"
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button for CUSTOMER/ADMIN/STAFF */}
      {canCreateSession && (
        <button
          onClick={() => setCreateModalOpen(true)}
          className="fab"
          aria-label="Create Session"
        >
          <PlusOutlined className="text-white text-2xl" />
        </button>
      )}

      {/* Create Modal */}
      <CreateSessionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}

