// src/app/history/page.tsx
'use client'

import { Button, Empty, Spin, Typography, Select, Tabs, Badge, Card, Segmented } from 'antd'
import { PlusOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, StopOutlined } from '@ant-design/icons'
import { useInfiniteHistory } from '@/hooks/useHistory'
import SessionCard from '@/components/cards/SessionCard'
import { useState, useMemo } from 'react'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse } from '@/app/type/api'

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
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>('upcoming')

  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo
  })

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteHistory(10)

  const isCustomer = userInfo && 'role' in userInfo && userInfo.role === 'CUSTOMER'
  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId = userInfo && 'instantUser' in userInfo ? userInfo.instantUser?.[0]?.id : undefined

  const allHistory = data?.pages.flatMap(page => 'history' in page ? page.history : []) || []

  // Categorize sessions
  const categorizedSessions = useMemo(() => {
    const now = Date.now()
    
    const upcoming = allHistory
      .filter(session => {
        const sessionTime = session.date + (session.from * 60 * 1000)
        return sessionTime >= now && session.status !== 'CANCELED' && session.status !== 'EXPIRED'
      })
      .sort((a, b) => {
        const aTime = a.date + (a.from * 60 * 1000)
        const bTime = b.date + (b.from * 60 * 1000)
        return aTime - bTime
      })

    const past = allHistory
      .filter(session => {
        const sessionTime = session.date + (session.from * 60 * 1000)
        return sessionTime < now || session.status === 'CANCELED' || session.status === 'EXPIRED'
      })
      .sort((a, b) => {
        const aTime = a.date + (a.from * 60 * 1000)
        const bTime = b.date + (b.from * 60 * 1000)
        return bTime - aTime
      })

    const completed = past.filter(s => s.status === 'PT_CHECKED_IN')

    return { upcoming, past, completed, all: allHistory }
  }, [allHistory])

  const displayedSessions = timeFilter === 'upcoming' 
    ? categorizedSessions.upcoming 
    : categorizedSessions.past

  return (
    <div className="pb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-in px-4">
        <Card className="!border-0 shadow-sm" styles={{ body: { padding: '16px' } }}>
          <Text className="text-xs text-gray-500 block mb-2">Total</Text>
          <Text strong className="text-2xl block">{categorizedSessions.all.length}</Text>
        </Card>
        <Card className="!border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50" styles={{ body: { padding: '16px' } }}>
          <Text className="text-xs text-blue-600 block mb-2 font-medium">Upcoming</Text>
          <Text strong className="text-2xl block text-blue-600">{categorizedSessions.upcoming.length}</Text>
        </Card>
        <Card className="!border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50" styles={{ body: { padding: '16px' } }}>
          <Text className="text-xs text-green-600 block mb-2 font-medium">Completed</Text>
          <Text strong className="text-2xl block text-green-600">{categorizedSessions.completed.length}</Text>
        </Card>
      </div>

      {/* Time Filter Segmented Control */}
      <div className="mb-4 px-4">
        <Segmented
          value={timeFilter}
          onChange={(value) => setTimeFilter(value as 'upcoming' | 'past')}
          options={[
            {
              label: (
                <div className="flex items-center gap-2 px-3">
                  <CalendarOutlined />
                  <span>Upcoming</span>
                  <Badge count={categorizedSessions.upcoming.length} showZero style={{ backgroundColor: '#5A9CB5' }} />
                </div>
              ),
              value: 'upcoming'
            },
            {
              label: (
                <div className="flex items-center gap-2 px-3">
                  <ClockCircleOutlined />
                  <span>Past</span>
                  <Badge count={categorizedSessions.past.length} showZero style={{ backgroundColor: '#6b7280' }} />
                </div>
              ),
              value: 'past'
            }
          ]}
          block
          size="large"
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
                    {timeFilter === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
                  </Text>
                  <Text type="secondary" className="text-sm">
                    {timeFilter === 'upcoming' 
                      ? 'Book your next training session to get started'
                      : 'Your session history will appear here'
                    }
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

      {/* Floating Action Button for CUSTOMER */}
      {isCustomer && (
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

