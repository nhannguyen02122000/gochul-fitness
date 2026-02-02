// src/components/cards/SessionCard.tsx
'use client'

import { Card, Space, Typography, Tag, Button, message } from 'antd'
import { ClockCircleOutlined, UserOutlined, MailOutlined, ThunderboltOutlined, HeartOutlined, CrownOutlined } from '@ant-design/icons'
import type { History, Role, HistoryStatus } from '@/app/type/api'
import StatusBadge from '@/components/common/StatusBadge'
import { formatTimeRange } from '@/utils/timeUtils'
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

// Helper function outside component to check if session is upcoming
function checkIfUpcoming(sessionDate: number, sessionFrom: number, status: string): boolean {
  const sessionDateTime = sessionDate + (sessionFrom * 60 * 1000)
  return sessionDateTime > Date.now() && status !== 'CANCELED' && status !== 'EXPIRED'
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

  const kindLabels: Record<string, { label: string; icon: typeof ClockCircleOutlined; color: string; bgColor: string }> = {
    'PT': {
      label: 'PT Session',
      icon: CrownOutlined,
      color: '#9333ea',
      bgColor: '#f3e8ff'
    },
    'REHAB': {
      label: 'Rehab Session',
      icon: HeartOutlined,
      color: '#0ea5e9',
      bgColor: '#e0f2fe'
    },
    'PT_MONTHLY': {
      label: 'PT Monthly',
      icon: ThunderboltOutlined,
      color: '#f97316',
      bgColor: '#ffedd5'
    }
  }

  const kindInfo = kindLabels[contractKind] || {
    label: contractKind,
    icon: ClockCircleOutlined,
    color: '#6b7280',
    bgColor: '#f3f4f6'
  }
  const KindIcon = kindInfo.icon

  // Check if session is upcoming
  const isUpcoming = checkIfUpcoming(session.date, session.from, session.status)

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
      className={`w-full overflow-hidden animate-fade-in modern-card ${isUpcoming ? 'ring-2 ring-[#FA6868]/20' : ''}`}
      styles={{
        body: { padding: 0 }
      }}
    >
      {/* Header Section */}
      <div className="relative" style={{ backgroundColor: kindInfo.bgColor }}>
        {isUpcoming && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-[#FA6868] to-[#FAAC68]" />
        )}

        <div className="p-5 relative">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: kindInfo.color + '20' }}
              >
                <KindIcon className="text-xl" style={{ color: kindInfo.color }} />
              </div>
              <div>
                <Text strong className="text-base block mb-1" style={{ color: kindInfo.color }}>
                  {kindInfo.label}
                </Text>
                <StatusBadge status={session.status} type="history" />
              </div>
            </div>
            {isUpcoming && (
              <Tag color="error" className="m-0 shrink-0">Upcoming</Tag>
            )}
          </div>

          {/* Date & Time - Large Display */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0">
                <Text className="text-xs text-gray-500 leading-none font-medium">
                  {new Date(session.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                </Text>
                <Text strong className="text-2xl leading-none mt-1">
                  {new Date(session.date).getDate()}
                </Text>
              </div>
              <div className="flex-1">
                <Text className="text-xs text-gray-500 block mb-1">Session Time</Text>
                <Text strong className="text-lg" style={{ color: kindInfo.color }}>
                  {formatTimeRange(session.from, session.to)}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="p-5 bg-white">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FA6868]/10 rounded-lg flex items-center justify-center shrink-0">
              <UserOutlined className="text-[#FA6868] text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <Text className="text-xs text-gray-500 block mb-1">Customer</Text>
              <Text strong className="text-base block truncate">{customerName}</Text>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-13 pl-1">
            <MailOutlined className="text-gray-400" />
            <Text type="secondary" className="text-sm truncate">{customerEmail}</Text>
          </div>
        </div>

        {/* Actions */}
        {actionButtons.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <Space size={12} className="w-full" wrap>
              {actionButtons.map((button) => (
                <Button
                  key={button.nextStatus}
                  type={button.type === 'danger' ? 'default' : button.type}
                  danger={button.type === 'danger'}
                  size="large"
                  loading={loadingStatus === button.nextStatus}
                  disabled={loadingStatus !== null && loadingStatus !== button.nextStatus}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStatusChange(button.nextStatus as HistoryStatus)
                  }}
                  className="flex-1 min-w-[120px]"
                >
                  {button.label}
                </Button>
              ))}
            </Space>
          </div>
        )}
      </div>
    </Card>
  )
}

