// src/components/modals/SessionHistoryModal.tsx
'use client'

import { Modal, List, Typography, Tag, Empty, Alert, Button, Skeleton, Card, Space } from 'antd'
import { CalendarOutlined, ClockCircleOutlined, CrownOutlined, HeartOutlined, ThunderboltOutlined, TrophyOutlined } from '@ant-design/icons'
import type { ContractKind, History } from '@/app/type/api'
import { useContractHistory } from '@/hooks/useHistory'
import StatusBadge from '@/components/common/StatusBadge'
import { formatTimeRange } from '@/utils/timeUtils'
import { useMemo, useState, useEffect } from 'react'

const { Text, Title } = Typography

interface SessionHistoryModalProps {
    open: boolean
    onClose: () => void
    contractId: string
    contractKind: ContractKind
    totalCredits?: number
    usedCredits?: number
}

export default function SessionHistoryModal({
    open,
    onClose,
    contractId,
    contractKind,
    totalCredits,
    usedCredits
}: SessionHistoryModalProps) {
    const { data, isLoading, error, refetch } = useContractHistory(open ? contractId : undefined)
    const [currentTime, setCurrentTime] = useState(() => Date.now())

    // Update current time every minute to keep upcoming status accurate
    useEffect(() => {
        if (!open) return

        const interval = setInterval(() => {
            setCurrentTime(Date.now())
        }, 60000) // Update every minute

        return () => clearInterval(interval)
    }, [open])

    const kindLabels: Record<string, { label: string; icon: typeof CrownOutlined; color: string; bgColor: string; gradient: string }> = {
        'PT': {
            label: 'Personal Training',
            icon: CrownOutlined,
            color: '#9333ea',
            bgColor: '#f3e8ff',
            gradient: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)'
        },
        'REHAB': {
            label: 'Rehabilitation',
            icon: HeartOutlined,
            color: '#0ea5e9',
            bgColor: '#e0f2fe',
            gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
        },
        'PT_MONTHLY': {
            label: 'PT Monthly',
            icon: ThunderboltOutlined,
            color: '#f97316',
            bgColor: '#ffedd5',
            gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)'
        }
    }

    const kindInfo = kindLabels[contractKind] || {
        label: contractKind,
        icon: TrophyOutlined,
        color: '#6b7280',
        bgColor: '#f3f4f6',
        gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)'
    }
    const KindIcon = kindInfo.icon

    const history: History[] = (data && 'history' in data) ? data.history : []
    const contract = (data && 'contract' in data) ? data.contract : null
    const hasCredits = contractKind === 'PT' || contractKind === 'REHAB'

    // Calculate summary statistics
    const stats = useMemo(() => {
        const completed = history.filter((h: History) => h.status === 'PT_CHECKED_IN' || h.status === 'USER_CHECKED_IN').length
        const upcoming = history.filter((h: History) => {
            const sessionDateTime = h.date + (h.from * 60 * 1000)
            return sessionDateTime > currentTime && h.status !== 'CANCELED' && h.status !== 'EXPIRED'
        }).length
        const remaining = hasCredits && totalCredits ? totalCredits - (usedCredits || 0) : 0

        return { completed, upcoming, remaining }
    }, [history, hasCredits, totalCredits, usedCredits, currentTime])

    // Helper function to check if session is upcoming
    const isUpcoming = (sessionDate: number, sessionFrom: number, status: string): boolean => {
        const sessionDateTime = sessionDate + (sessionFrom * 60 * 1000)
        return sessionDateTime > currentTime && status !== 'CANCELED' && status !== 'EXPIRED'
    }

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={600}
            centered
            destroyOnClose
            className="session-history-modal"
            styles={{
                body: { padding: 0, maxHeight: '70vh', overflow: 'hidden' }
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: kindInfo.gradient }}
                >
                    <KindIcon className="text-white text-lg" />
                </div>
                <div className="flex-1">
                    <Title level={4} className="!mb-0">Session History</Title>
                    <Text type="secondary" className="text-xs">{kindInfo.label}</Text>
                </div>
            </div>

            {/* Contract Info Card */}
            <div className="p-4 pb-0">
                <Card
                    className="mb-4"
                    style={{ background: kindInfo.bgColor, borderColor: kindInfo.color + '20' }}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <Text strong className="text-base block mb-1">{kindInfo.label}</Text>
                            <StatusBadge status={contract?.status || 'ACTIVE'} type="contract" />
                        </div>
                        {hasCredits && totalCredits !== undefined && (
                            <div className="text-right">
                                <Title level={3} className="!mb-0" style={{ color: kindInfo.color }}>
                                    {usedCredits || 0} / {totalCredits}
                                </Title>
                                <Text type="secondary" className="text-xs">sessions completed</Text>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Session List */}
            <div className="px-4 pb-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {/* Loading State */}
                {isLoading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="rounded-xl">
                                <Skeleton active avatar paragraph={{ rows: 2 }} />
                            </Card>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <Alert
                        type="error"
                        message="Failed to load session history"
                        description={error.message}
                        showIcon
                        action={
                            <Button size="small" danger onClick={() => refetch()}>
                                Retry
                            </Button>
                        }
                    />
                )}

                {/* Empty State */}
                {!isLoading && !error && history.length === 0 && (
                    <Empty
                        image={<CalendarOutlined style={{ fontSize: 64, color: '#d1d5db' }} />}
                        description={
                            <div>
                                <Text className="text-base block mb-2">No sessions yet</Text>
                                <Text type="secondary" className="text-sm">
                                    Sessions for this contract will appear here
                                </Text>
                            </div>
                        }
                    />
                )}

                {/* Session List */}
                {!isLoading && !error && history.length > 0 && (
                    <List
                        dataSource={history}
                        renderItem={(session: History, index: number) => {
                            const upcoming = isUpcoming(session.date, session.from, session.status)
                            const sessionDate = new Date(session.date)
                            const month = sessionDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                            const day = sessionDate.getDate()
                            const fullDate = sessionDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })

                            return (
                                <List.Item
                                    key={session.id}
                                    className="!border-0 !p-0 mb-3 animate-fade-in"
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        animationFillMode: 'backwards'
                                    }}
                                >
                                    <Card
                                        className="w-full rounded-xl hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                                        style={{
                                            borderColor: upcoming ? kindInfo.color + '40' : '#f0f0f0',
                                            background: upcoming ? kindInfo.bgColor : 'white'
                                        }}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Date Display */}
                                            <div
                                                className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                                                style={{
                                                    backgroundColor: upcoming ? kindInfo.color + '20' : '#f3f4f6',
                                                    border: upcoming ? `2px solid ${kindInfo.color}40` : 'none'
                                                }}
                                            >
                                                <Text
                                                    className="text-xs font-medium leading-none"
                                                    style={{ color: upcoming ? kindInfo.color : '#6b7280' }}
                                                >
                                                    {month}
                                                </Text>
                                                <Text
                                                    strong
                                                    className="text-2xl leading-none mt-1"
                                                    style={{ color: upcoming ? kindInfo.color : '#111827' }}
                                                >
                                                    {day}
                                                </Text>
                                            </div>

                                            {/* Session Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CalendarOutlined className="text-gray-400 text-sm" />
                                                    <Text strong className="text-sm">{fullDate}</Text>
                                                    {upcoming && (
                                                        <Tag color="orange" className="ml-auto">Upcoming</Tag>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mb-2">
                                                    <ClockCircleOutlined className="text-gray-400 text-sm" />
                                                    <Text className="text-sm">{formatTimeRange(session.from, session.to)}</Text>
                                                </div>

                                                <div>
                                                    <StatusBadge status={session.status} type="history" />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </List.Item>
                            )
                        }}
                    />
                )}
            </div>

            {/* Summary Footer */}
            {!isLoading && !error && history.length > 0 && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-lg">
                    <Title level={5} className="mb-3 text-sm">Summary</Title>
                    <Space direction="vertical" size={8} className="w-full">
                        <div className="flex justify-between items-center">
                            <Text type="secondary" className="text-sm">Completed</Text>
                            <Text strong className="text-sm">{stats.completed} sessions</Text>
                        </div>
                        <div className="flex justify-between items-center">
                            <Text type="secondary" className="text-sm">Upcoming</Text>
                            <Text strong className="text-sm">{stats.upcoming} sessions</Text>
                        </div>
                        {hasCredits && totalCredits !== undefined && (
                            <div className="flex justify-between items-center">
                                <Text type="secondary" className="text-sm">Remaining Credits</Text>
                                <Text strong className="text-sm text-green-600">
                                    {stats.remaining} credits
                                </Text>
                            </div>
                        )}
                    </Space>
                </div>
            )}
        </Modal>
    )
}
