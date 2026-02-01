'use client'

import { useInfiniteContracts } from '@/hooks/useContracts'
import { Button, Card, List, Space, Spin, Tag } from 'antd'
import type { Contract } from '@/app/type/api'

/**
 * Example component demonstrating infinite scrolling with contracts
 */
export default function InfiniteContractList() {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteContracts(10)

  // Flatten all contracts from all pages
  const allContracts = data?.pages.flatMap((page) => {
    if ('contracts' in page) {
      return page.contracts
    }
    return []
  }) ?? []

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <p style={{ color: 'red' }}>Error: {error.message}</p>
      </Card>
    )
  }

  return (
    <Card title={`Contracts (${allContracts.length} loaded)`}>
      <List
        dataSource={allContracts}
        renderItem={(contract: Contract) => (
          <List.Item key={contract.id}>
            <List.Item.Meta
              title={
                <Space>
                  <span>{contract.kind}</span>
                  <Tag color={contract.status === 'ACTIVE' ? 'green' : 'default'}>
                    {contract.status}
                  </Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size="small">
                  <span>ID: {contract.id}</span>
                  <span>Money: ${contract.money.toLocaleString()}</span>
                  {contract.credits && <span>Credits: {contract.credits}</span>}
                  {contract.start_date && (
                    <span>
                      Start: {new Date(contract.start_date).toLocaleDateString()}
                    </span>
                  )}
                  {contract.end_date && (
                    <span>
                      End: {new Date(contract.end_date).toLocaleDateString()}
                    </span>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      {/* Load More Button */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button
          type="primary"
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
          loading={isFetchingNextPage}
        >
          {isFetchingNextPage
            ? 'Loading more...'
            : hasNextPage
              ? 'Load More'
              : 'No more contracts'}
        </Button>
      </div>

      {/* Stats */}
      <div style={{ textAlign: 'center', marginTop: '10px', color: '#999' }}>
        <small>
          Loaded {data?.pages.length} page(s) • {allContracts.length} contract(s)
        </small>
      </div>
    </Card>
  )
}

