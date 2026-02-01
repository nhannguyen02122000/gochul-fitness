'use client'

import {
  useContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract
} from '@/hooks/useContracts'
import { Button, Card, Space, Spin, Table, message } from 'antd'
import type { Contract } from '@/app/type/api'

/**
 * Example component demonstrating React Query usage with contract APIs
 * This is a reference implementation - adapt it to your needs
 */
export default function ContractExample() {
  // Fetch contracts with pagination
  const { data, isLoading, error } = useContracts(1, 10)

  // Mutations
  const createMutation = useCreateContract()
  const updateMutation = useUpdateContract()
  const deleteMutation = useDeleteContract()

  // Handlers
  const handleCreate = () => {
    createMutation.mutate(
      {
        kind: 'PT',
        status: 'ACTIVE',
        money: 5000
      },
      {
        onSuccess: () => {
          message.success('Contract created successfully')
        },
        onError: (error) => {
          message.error(`Failed to create: ${error.message}`)
        }
      }
    )
  }

  const handleUpdate = (contractId: string) => {
    updateMutation.mutate(
      {
        contract_id: contractId,
        status: 'COMPLETED'
      },
      {
        onSuccess: () => {
          message.success('Contract updated successfully')
        },
        onError: (error) => {
          message.error(`Failed to update: ${error.message}`)
        }
      }
    )
  }

  const handleDelete = (contractId: string) => {
    deleteMutation.mutate(
      {
        contract_id: contractId
      },
      {
        onSuccess: () => {
          message.success('Contract deleted successfully')
        },
        onError: (error) => {
          message.error(`Failed to delete: ${error.message}`)
        }
      }
    )
  }

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

  // Check if data has error
  if (data && 'error' in data) {
    return (
      <Card>
        <p style={{ color: 'red' }}>Error: {data.error}</p>
      </Card>
    )
  }

  // Success state
  const contracts = data && 'contracts' in data ? data.contracts : []

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true
    },
    {
      title: 'Kind',
      dataIndex: 'kind',
      key: 'kind'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status'
    },
    {
      title: 'Money',
      dataIndex: 'money',
      key: 'money',
      render: (money: number) => `$${money.toLocaleString()}`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Contract) => (
        <Space>
          <Button
            size="small"
            onClick={() => handleUpdate(record.id)}
            loading={updateMutation.isPending}
          >
            Update
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
            loading={deleteMutation.isPending}
          >
            Delete
          </Button>
        </Space>
      )
    }
  ]

  return (
    <Card
      title="Contracts"
      extra={
        <Button
          type="primary"
          onClick={handleCreate}
          loading={createMutation.isPending}
        >
          Create Contract
        </Button>
      }
    >
      <Table
        dataSource={contracts}
        columns={columns}
        rowKey="id"
        pagination={{
          current: data && 'pagination' in data ? data.pagination.page : 1,
          pageSize: data && 'pagination' in data ? data.pagination.limit : 10,
          total:
            data && 'pagination' in data ? data.pagination.total : contracts.length,
          showSizeChanger: true
        }}
      />
    </Card>
  )
}

