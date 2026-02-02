// src/components/cards/SessionCard.tsx
'use client'

import { Card, Space, Typography, Tag, Button, message } from 'antd'
import { ClockCircleOutlined, CalendarOutlined, UserOutlined, MailOutlined } from '@ant-design/icons'
import type { History, Role, HistoryStatus } from '@/app/type/api'
import StatusBadge from '@/components/common/StatusBadge'
import { formatDate, formatTimeRange } from '@/utils/timeUtils'
import { getHistoryActionButtons, shouldShowHistoryActionButtons } from '@/utils/statusUtils'
import { useUpdateHistoryStatus } from '@/hooks/useHistory'
import { useState } from 'react'

const { Text } = Typography

interface SessionCardProps {
  session: History
  onClick?: () => void
  userRole?: Role
  userInstantId?: string
  onStatusChange?: (sessionId: string, newStatus: HistoryStatus) => void
}

export default function SessionCard({
  session,
  onClick,
  userRole,
  userInstantId,
  onStatusChange
}: SessionCardProps) {
  const [loadingStatus, setLoadingStatus] = useState<HistoryStatus | null>(null)
  const { mutate: updateStatus } = useUpdateHistoryStatus()

  const contractKind = session.contract?.kind || 'Unknown'

  // Get customer info from user_setting
  const purchasedByUser = session.contract?.purchased_by_user?.[0]
  const customerUserSetting = purchasedByUser?.user_setting?.[0]
  const customerName = customerUserSetting
    ? [customerUserSetting.first_name, customerUserSetting.last_name]
      .filter(Boolean)
      .join(' ') || 'Unknown'
    : 'Unknown'
  const customerEmail = purchasedByUser?.email || 'N/A'

  const kindLabels: Record<string, string> = {
    'PT': 'PT',
    'REHAB': 'Rehab',
    'PT_MONTHLY': 'PT Monthly'
  }

  // Determine if action buttons should be shown
  const shouldShowButtons = userRole &&
    userInstantId &&
    shouldShowHistoryActionButtons(session, userRole, userInstantId)

  // Get available action buttons based on status and role
  const actionButtons = shouldShowButtons
    ? getHistoryActionButtons(session.status, userRole!)
    : []

  const handleStatusChange = (newStatus: HistoryStatus) => {
    setLoadingStatus(newStatus)
    updateStatus(
      { history_id: session.id, status: newStatus },
      {
        onSuccess: () => {
          message.success(`Session status updated to ${newStatus}`)
          setLoadingStatus(null)
          onStatusChange?.(session.id, newStatus)
        },
        onError: (error) => {
          message.error(error.message || 'Failed to update session status')
          setLoadingStatus(null)
        }
      }
    )
  }

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
            <Tag color="purple">{kindLabels[contractKind] || contractKind}</Tag>
            <StatusBadge status={session.status} type="history" />
          </div>
        </div>

        {/* Details */}
        <Space orientation="vertical" size="small" className="w-full mt-2">
          <div className="flex items-center gap-2">
            <CalendarOutlined className="text-gray-400" />
            <Text strong className="text-sm">{formatDate(session.date)}</Text>
          </div>

          <div className="flex items-center gap-2">
            <ClockCircleOutlined className="text-gray-400" />
            <Text type="secondary" className="text-sm">
              {formatTimeRange(session.from, session.to)}
            </Text>
          </div>

          <div className="flex items-center gap-2">
            <UserOutlined className="text-gray-400" />
            <Text type="secondary" className="text-sm">
              Customer: {customerName}
            </Text>
          </div>

          <div className="flex items-center gap-2">
            <MailOutlined className="text-gray-400" />
            <Text type="secondary" className="text-sm">{customerEmail}</Text>
          </div>
        </Space>

        {/* Actions */}
        {actionButtons.length > 0 && (
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
                    handleStatusChange(button.nextStatus as HistoryStatus)
                  }}
                >
                  {button.label}
                </Button>
              ))}
            </Space>
          </div>
        )}
      </Space>
    </Card>
  )
}

