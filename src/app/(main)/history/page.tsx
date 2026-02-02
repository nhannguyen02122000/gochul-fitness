// src/app/history/page.tsx
'use client'

import { Button, Empty, Spin, Typography, Select } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useInfiniteHistory } from '@/hooks/useHistory'
import SessionCard from '@/components/cards/SessionCard'
import { useState } from 'react'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse } from '@/app/type/api'

const { Title } = Typography

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function HistoryPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo
  })

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteHistory(10)

  const isCustomer = userInfo && 'role' in userInfo && userInfo.role === 'CUSTOMER'
  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId = userInfo && 'instantUser' in userInfo && userInfo.instantUser?.[0]?.id

  const allHistory = data?.pages.flatMap(page => 'history' in page ? page.history : []) || []
  
  const filteredHistory = statusFilter === 'all' 
    ? allHistory 
    : allHistory.filter(h => h.status === statusFilter)

  // Sort by date descending
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    const aTime = a.date + (a.from * 60 * 1000)
    const bTime = b.date + (b.from * 60 * 1000)
    return bTime - aTime
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Title level={3} className="m-0">Sessions</Title>
        {isCustomer && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            Create
          </Button>
        )}
      </div>

      {/* Filters */}
      <Select
        value={statusFilter}
        onChange={setStatusFilter}
        className="w-full md:w-64"
        options={[
          { value: 'all', label: 'All Statuses' },
          { value: 'NEWLY_CREATED', label: 'Newly Created' },
          { value: 'PT_CONFIRMED', label: 'PT Confirmed' },
          { value: 'USER_CHECKED_IN', label: 'User Checked In' },
          { value: 'PT_CHECKED_IN', label: 'PT Checked In' },
          { value: 'EXPIRED', label: 'Expired' },
          { value: 'CANCELED', label: 'Canceled' }
        ]}
      />

      {/* History List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : sortedHistory.length === 0 ? (
        <Empty
          description="No sessions found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedHistory.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                userRole={userRole}
                userInstantId={userInstantId}
                onClick={() => {
                  // TODO: Open session detail modal
                }}
              />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <CreateSessionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}

