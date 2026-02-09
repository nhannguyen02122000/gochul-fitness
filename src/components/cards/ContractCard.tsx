// src/components/cards/ContractCard.tsx
'use client'

import { Card, Space, Typography, Button, Tag, message, Tooltip } from 'antd'
import { CalendarOutlined, UserOutlined, DollarOutlined, MailOutlined, PlusOutlined, CrownOutlined, ThunderboltOutlined, HeartOutlined, EyeOutlined } from '@ant-design/icons'
import type { Contract, Role, ContractStatus } from '@/app/type/api'
import StatusBadge from '@/components/common/StatusBadge'
import { formatDate } from '@/utils/timeUtils'
import { formatVND } from '@/utils/currencyUtils'
import { getContractActionButtons, shouldShowContractActionButtons } from '@/utils/statusUtils'
import { useUpdateContractStatus } from '@/hooks/useContracts'
import { useState } from 'react'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import SessionHistoryModal from '@/components/modals/SessionHistoryModal'

const { Text, Title } = Typography

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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
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

  const kindLabels: Record<string, { label: string; icon: typeof DollarOutlined; gradient: string }> = {
    'PT': {
      label: 'Personal Training',
      icon: CrownOutlined,
      gradient: 'from-purple-500 to-pink-500'
    },
    'REHAB': {
      label: 'Rehabilitation',
      icon: HeartOutlined,
      gradient: 'from-blue-500 to-cyan-500'
    },
    'PT_MONTHLY': {
      label: 'PT Monthly',
      icon: ThunderboltOutlined,
      gradient: 'from-orange-500 to-red-500'
    }
  }

  const kindInfo = kindLabels[contract.kind] || {
    label: contract.kind,
    icon: DollarOutlined,
    gradient: 'from-gray-500 to-gray-600'
  }
  const KindIcon = kindInfo.icon
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

  // Check if contract has available credits (for PT/REHAB)
  const hasAvailableCredits = !hasCredits ||
    (contract.credits && (contract.used_credits || 0) < contract.credits)

  // Check if user should see "Create Session" button
  // CUSTOMER: only for their own active contracts with available credits
  // ADMIN/STAFF: for any active contract with available credits
  const shouldShowCreateSession = contract.status === 'ACTIVE' &&
    hasAvailableCredits &&
    (
      (userRole === 'CUSTOMER' && contract.purchased_by === userInstantId) ||
      userRole === 'ADMIN' ||
      userRole === 'STAFF'
    )

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className="w-full overflow-hidden animate-fade-in modern-card"
      styles={{
        body: { padding: 0 }
      }}
    >
      {/* Gradient Header */}
      <div className={`bg-linear-to-r ${kindInfo.gradient} p-3 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10" />

        <div className="relative z-10 flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shrink-0">
              <KindIcon className="text-white text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <Text className="text-white font-semibold text-xs block mb-0.5 truncate">{kindInfo.label}</Text>
              <StatusBadge status={contract.status} type="contract" />
            </div>
          </div>
          {hasCredits && contract.credits !== undefined && (
            <Tooltip title="Click to view session history" placement="left">
              <div
                className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg shrink-0 cursor-pointer hover:bg-white/30 hover:scale-105 active:scale-95 transition-all duration-200 group"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsHistoryModalOpen(true)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsHistoryModalOpen(true)
                  }
                }}
              >
                <div className="flex items-center gap-1 justify-center">
                  <Text className="text-white text-xs font-bold leading-none">
                    {contract.used_credits || 0} / {contract.credits}
                  </Text>
                  <EyeOutlined className="text-white/60 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <Text className="text-white/80 text-[10px] block mt-0.5 text-center">Credits Used</Text>
              </div>
            </Tooltip>
          )}
        </div>

        {/* Amount */}
        <div className="relative z-10 mt-2">
          <Text className="text-white/80 text-[10px] block mb-1">Contract Value</Text>
          <Title level={4} className="text-white !mb-0 !text-base font-bold leading-none">
            {formatVND(contract.money)}
          </Title>
        </div>
      </div>

      {/* Details Section */}
      <div className="p-3">
        <Space orientation="vertical" size={8} className="w-full">
          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 bg-[#FA6868]/10 rounded-lg flex items-center justify-center shrink-0">
                <UserOutlined className="text-[#FA6868] text-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <Text className="text-[10px] text-gray-500 block mb-0.5">Customer</Text>
                <Text strong className="text-xs block truncate">{customerName}</Text>
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-9">
              <MailOutlined className="text-gray-400" style={{ fontSize: '10px' }} />
              <Text type="secondary" className="text-[10px] truncate">{customerEmail}</Text>
            </div>
          </div>

          {/* Sales Info */}
          <div className="bg-gray-50 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 bg-[#5A9CB5]/10 rounded-lg flex items-center justify-center shrink-0">
                <UserOutlined className="text-[#5A9CB5] text-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <Text className="text-[10px] text-gray-500 block mb-0.5">Sales Rep</Text>
                <Text strong className="text-xs block truncate">{salesPerson}</Text>
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-9">
              <MailOutlined className="text-gray-400" style={{ fontSize: '10px' }} />
              <Text type="secondary" className="text-[10px] truncate">{salesEmail}</Text>
            </div>
          </div>

          {/* Date Range */}
          {contract.start_date && (
            <div className="flex items-center gap-2 px-2 py-2 bg-linear-to-r from-gray-50 to-transparent rounded-lg">
              <CalendarOutlined className="text-[#FAAC68] text-sm shrink-0" />
              <div className="flex-1 min-w-0">
                <Text type="secondary" className="text-[10px] block mb-0.5">Duration</Text>
                <Text strong className="text-[11px] block truncate">
                  {formatDate(contract.start_date)} → {contract.end_date ? formatDate(contract.end_date) : 'N/A'}
                </Text>
              </div>
            </div>
          )}
        </Space>

        {/* Actions */}
        {(actionButtons.length > 0 || shouldShowCreateSession) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Space size={6} className="w-full" wrap>
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
                  className="flex-1 min-w-[90px] text-xs"
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
                  className="flex-1 min-w-[120px] text-xs"
                >
                  Create Session
                </Button>
              )}
            </Space>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        open={isSessionModalOpen}
        onClose={handleSessionModalClose}
        preselectedContractId={contract.id}
      />

      {/* Session History Modal */}
      <SessionHistoryModal
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        contractId={contract.id}
        contractKind={contract.kind}
        totalCredits={contract.credits}
        usedCredits={contract.used_credits}
      />
    </Card>
  )
}

