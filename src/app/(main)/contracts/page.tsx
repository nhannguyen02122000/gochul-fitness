// src/app/contracts/page.tsx
'use client'

import { Button, Empty, Spin, Typography, Select } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useInfiniteContracts } from '@/hooks/useContracts'
import ContractCard from '@/components/cards/ContractCard'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse } from '@/app/type/api'
import CreateContractModal from '@/components/modals/CreateContractModal'

const { Title } = Typography

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function ContractsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo
  })

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteContracts(10)

  const isStaffOrAdmin = userInfo && 'role' in userInfo && (userInfo.role === 'ADMIN' || userInfo.role === 'STAFF')
  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId = userInfo && 'instantUser' in userInfo && userInfo.instantUser?.[0]?.id

  const allContracts = data?.pages.flatMap(page => 'contracts' in page ? page.contracts : []) || []
  
  // Filter out NEWLY_CREATED contracts for CUSTOMER role
  const visibleContracts = userRole === 'CUSTOMER' 
    ? allContracts.filter(c => c.status !== 'NEWLY_CREATED')
    : allContracts
  
  const filteredContracts = statusFilter === 'all' 
    ? visibleContracts 
    : visibleContracts.filter(c => c.status === statusFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Title level={3} className="m-0">Contracts</Title>
        {isStaffOrAdmin && (
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
          { value: 'CUSTOMER_REVIEW', label: 'Customer Review' },
          { value: 'CUSTOMER_CONFIRMED', label: 'Customer Confirmed' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'EXPIRED', label: 'Expired' },
          { value: 'CANCELED', label: 'Canceled' }
        ]}
      />

      {/* Contracts List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : filteredContracts.length === 0 ? (
        <Empty
          description="No contracts found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContracts.map(contract => (
              <ContractCard
                key={contract.id}
                contract={contract}
                userRole={userRole}
                userInstantId={userInstantId}
                onClick={() => {
                  // TODO: Open contract detail modal
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
      <CreateContractModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}

