// src/app/contracts/page.tsx
'use client'

import { Button, Empty, Spin, Typography, Select, Tabs, Badge, Card } from 'antd'
import { PlusOutlined, FilterOutlined, CheckCircleOutlined, ClockCircleOutlined, StopOutlined } from '@ant-design/icons'
import { useInfiniteContracts } from '@/hooks/useContracts'
import ContractCard from '@/components/cards/ContractCard'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse } from '@/app/type/api'
import CreateContractModal from '@/components/modals/CreateContractModal'

const { Title, Text } = Typography

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function ContractsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo
  })

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteContracts(10)

  const isStaffOrAdmin = userInfo && 'role' in userInfo && (userInfo.role === 'ADMIN' || userInfo.role === 'STAFF')
  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId = userInfo && 'instantUser' in userInfo ? userInfo.instantUser?.[0]?.id : undefined

  const allContracts = data?.pages.flatMap(page => 'contracts' in page ? page.contracts : []) || []

  // Filter out NEWLY_CREATED contracts for CUSTOMER role
  const visibleContracts = userRole === 'CUSTOMER'
    ? allContracts.filter(c => c.status !== 'NEWLY_CREATED')
    : allContracts

  // Group contracts by status
  const contractsByStatus = useMemo(() => {
    return {
      all: visibleContracts,
      active: visibleContracts.filter(c => c.status === 'ACTIVE'),
      pending: visibleContracts.filter(c =>
        c.status === 'NEWLY_CREATED' ||
        c.status === 'CUSTOMER_REVIEW' ||
        c.status === 'CUSTOMER_CONFIRMED'
      ),
      inactive: visibleContracts.filter(c =>
        c.status === 'EXPIRED' ||
        c.status === 'CANCELED'
      )
    }
  }, [visibleContracts])

  const filteredContracts = contractsByStatus[activeTab as keyof typeof contractsByStatus] || []

  const tabItems = [
    {
      key: 'all',
      label: (
        <span className="flex items-center gap-2">
          <FilterOutlined />
          All
          <Badge count={contractsByStatus.all.length} showZero style={{ backgroundColor: '#6b7280' }} />
        </span>
      )
    },
    {
      key: 'active',
      label: (
        <span className="flex items-center gap-2">
          <CheckCircleOutlined />
          Active
          <Badge count={contractsByStatus.active.length} showZero style={{ backgroundColor: '#10b981' }} />
        </span>
      )
    },
    {
      key: 'pending',
      label: (
        <span className="flex items-center gap-2">
          <ClockCircleOutlined />
          Pending
          <Badge count={contractsByStatus.pending.length} showZero style={{ backgroundColor: '#FAAC68' }} />
        </span>
      )
    },
    {
      key: 'inactive',
      label: (
        <span className="flex items-center gap-2">
          <StopOutlined />
          Inactive
          <Badge count={contractsByStatus.inactive.length} showZero style={{ backgroundColor: '#ef4444' }} />
        </span>
      )
    }
  ]

  return (
    <div className="pb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4 animate-fade-in px-4 mt-2.5">
        <Card className="!border-0 shadow-sm" styles={{ body: { padding: '12px' } }}>
          <Text className="text-[10px] text-gray-500 block mb-1">Total</Text>
          <Text strong className="text-xl block leading-none">{contractsByStatus.all.length}</Text>
        </Card>
        <Card className="!border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50" styles={{ body: { padding: '12px' } }}>
          <Text className="text-[10px] text-green-600 block mb-1 font-medium">Active</Text>
          <Text strong className="text-xl block text-green-600 leading-none">{contractsByStatus.active.length}</Text>
        </Card>
        <Card className="!border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50" styles={{ body: { padding: '12px' } }}>
          <Text className="text-[10px] text-orange-600 block mb-1 font-medium">Pending</Text>
          <Text strong className="text-xl block text-orange-600 leading-none">{contractsByStatus.pending.length}</Text>
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

      {/* Contracts List */}
      <div className="px-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card className="!border-2 !border-dashed">
            <Empty
              description={
                <div className="py-6">
                  <Text className="text-gray-500 block mb-3 text-base font-medium">No contracts in this category</Text>
                  <Text type="secondary" className="text-sm">
                    {activeTab === 'active' && 'No active contracts at the moment'}
                    {activeTab === 'pending' && 'No pending contracts to review'}
                    {activeTab === 'inactive' && 'No expired or canceled contracts'}
                    {activeTab === 'all' && 'No contracts found'}
                  </Text>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {filteredContracts.map((contract, index) => (
                <div
                  key={contract.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ContractCard
                    contract={contract}
                    userRole={userRole}
                    userInstantId={userInstantId}
                    onClick={() => {
                      // TODO: Open contract detail modal
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

      {/* Floating Action Button for ADMIN/STAFF */}
      {isStaffOrAdmin && (
        <button
          onClick={() => setCreateModalOpen(true)}
          className="fab"
          aria-label="Create Contract"
        >
          <PlusOutlined className="text-white text-2xl" />
        </button>
      )}

      {/* Create Modal */}
      <CreateContractModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}

