// src/components/cards/ContractCard.tsx
'use client'

import { Card, Space, Typography, Button, Tag, message } from 'antd'
import { CalendarOutlined, UserOutlined, DollarOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons'
import type { Contract, Role, ContractStatus } from '@/app/type/api'
import StatusBadge from '@/components/common/StatusBadge'
import { formatDate } from '@/utils/timeUtils'
import { formatVND } from '@/utils/currencyUtils'
import { getContractActionButtons, shouldShowContractActionButtons } from '@/utils/statusUtils'
import { useUpdateContractStatus } from '@/hooks/useContracts'
import { useState } from 'react'
import CreateSessionModal from '@/components/modals/CreateSessionModal'

const { Text } = Typography

interface ContractCardProps {
  contract: Contract
  onClick?: () => void
  showActions?: boolean
  userRole?: Role
  userInstantId?: string
  onStatusChange?: (contractId: string, newStatus: ContractStatus) => void
  onSessionCreated?: () => void
}

export default function ContractCard({
  contract,
  onClick,
  showActions = true,
  userRole,
  userInstantId,
  onStatusChange,
  onSessionCreated
}: ContractCardProps) {
  const [loadingStatus, setLoadingStatus] = useState<ContractStatus | null>(null)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const { mutate: updateStatus } = useUpdateContractStatus()

  // Get customer info from user_setting
  const purchasedByUser = contract.purchased_by_user?.[0]
  const customerUserSetting = purchasedByUser?.user_setting?.[0]

  const customerName = customerUserSetting
    ? [customerUserSetting.first_name, customerUserSetting.last_name]
      .filter(Boolean)
      .join(' ') || purchasedByUser?.email || 'Unknown Customer'
    : purchasedByUser?.email || 'Unknown Customer'
  const customerEmail = purchasedByUser?.email || 'N/A'

  // Get sales person info from user_setting
  const saleByUser = contract.sale_by_user?.[0]
  const salesUserSetting = saleByUser?.user_setting?.[0]

  const salesPerson = salesUserSetting
    ? [salesUserSetting.first_name, salesUserSetting.last_name]
      .filter(Boolean)
      .join(' ') || saleByUser?.email || 'Unknown'
    : saleByUser?.email || 'Unknown'
  const salesEmail = saleByUser?.email || 'N/A'

  const kindLabels: Record<string, string> = {
    'PT': 'Personal Training',
    'REHAB': 'Rehabilitation',
    'PT_MONTHLY': 'PT Monthly'
  }

  const hasCredits = contract.kind === 'PT' || contract.kind === 'REHAB'

  // Determine if action buttons should be shown
  const shouldShowButtons = showActions &&
    userRole &&
    userInstantId &&
    shouldShowContractActionButtons(contract, userRole, userInstantId)

  // Get available action buttons based on status and role
  const actionButtons = shouldShowButtons
    ? getContractActionButtons(contract.status, userRole!)
    : []

  const handleStatusChange = (newStatus: ContractStatus) => {
    setLoadingStatus(newStatus)
    updateStatus(
      { contract_id: contract.id, status: newStatus },
      {
        onSuccess: () => {
          message.success(`Contract status updated to ${newStatus}`)
          setLoadingStatus(null)
          onStatusChange?.(contract.id, newStatus)
        },
        onError: (error) => {
          message.error(error.message || 'Failed to update contract status')
          setLoadingStatus(null)
        }
      }
    )
  }

  const handleSessionModalClose = () => {
    setIsSessionModalOpen(false)
    onSessionCreated?.()
  }

  // Check if customer should see "Create Session" button
  const shouldShowCreateSession = userRole === 'CUSTOMER' &&
    contract.status === 'ACTIVE' &&
    contract.purchased_by === userInstantId

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className="w-full shadow-sm hover:shadow-md transition-shadow"
    >
      <Space orientation="vertical" size="small" className="w-full">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <Tag color="blue" className="mb-2">{kindLabels[contract.kind] || contract.kind}</Tag>
            <StatusBadge status={contract.status} type="contract" />
          </div>
          <Text strong className="text-lg text-primary">
            {formatVND(contract.money)}
          </Text>
        </div>

        {/* Details */}
        <Space orientation="vertical" size="small" className="w-full mt-2">
          <div className="flex items-center gap-2">
            <UserOutlined className="text-gray-400" />
            <Text type="secondary" className="text-sm">Customer: {customerName}</Text>
          </div>

          <div className="flex items-center gap-2">
            <MailOutlined className="text-gray-400" />
            <Text type="secondary" className="text-sm">{customerEmail}</Text>
          </div>

          <div className="flex items-center gap-2">
            <UserOutlined className="text-gray-400" />
            <Text type="secondary" className="text-sm">Sales: {salesPerson}</Text>
          </div>

          <div className="flex items-center gap-2">
            <MailOutlined className="text-gray-400" />
            <Text type="secondary" className="text-sm">{salesEmail}</Text>
          </div>

          {contract.start_date && (
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-gray-400" />
              <Text type="secondary" className="text-sm">
                {formatDate(contract.start_date)} - {contract.end_date ? formatDate(contract.end_date) : 'N/A'}
              </Text>
            </div>
          )}

          {hasCredits && contract.credits !== undefined && (
            <div className="flex items-center gap-2">
              <DollarOutlined className="text-gray-400" />
              <Text type="secondary" className="text-sm">
                Credits: {contract.credits}
              </Text>
            </div>
          )}
        </Space>

        {/* Actions */}
        {(actionButtons.length > 0 || shouldShowCreateSession) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Space size="small" className="w-full" wrap>
              {actionButtons.map((button) => (
                <Button
                  key={button.nextStatus}
                  type={button.type === 'danger' ? 'default' : button.type}
                  danger={button.type === 'danger'}
                  size="small"
                  loading={loadingStatus === button.nextStatus}
                  disabled={loadingStatus !== null && loadingStatus !== button.nextStatus}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStatusChange(button.nextStatus as ContractStatus)
                  }}
                >
                  {button.label}
                </Button>
              ))}
              {shouldShowCreateSession && (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsSessionModalOpen(true)
                  }}
                >
                  Create Session
                </Button>
              )}
            </Space>
          </div>
        )}
      </Space>

      {/* Create Session Modal */}
      <CreateSessionModal
        open={isSessionModalOpen}
        onClose={handleSessionModalClose}
        preselectedContractId={contract.id}
      />
    </Card>
  )
}

