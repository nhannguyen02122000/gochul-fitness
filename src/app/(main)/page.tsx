// src/app/(main)/page.tsx
'use client'

import { Button, Empty, Spin, Typography, Card } from 'antd'
import { PlusOutlined, FileTextOutlined, HistoryOutlined, ThunderboltOutlined, TrophyOutlined, FireOutlined, RocketOutlined } from '@ant-design/icons'
import { useInfiniteHistory } from '@/hooks/useHistory'
import { useInfiniteContracts } from '@/hooks/useContracts'
import SessionCard from '@/components/cards/SessionCard'
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse } from '@/app/type/api'
import CreateContractModal from '@/components/modals/CreateContractModal'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const { Title, Text, Paragraph } = Typography

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
    const response = await fetch('/api/user/getUserInformation')
    if (!response.ok) {
        throw new Error('Failed to fetch user information')
    }
    return response.json()
}

const motivationalMessages = [
    { icon: FireOutlined, text: "Let's crush today's goals!", color: "#FA6868" },
    { icon: TrophyOutlined, text: "You're on fire!", color: "#FAAC68" },
    { icon: ThunderboltOutlined, text: "Keep pushing forward!", color: "#5A9CB5" },
    { icon: RocketOutlined, text: "Ready to train?", color: "#FA6868" }
]

export default function HomePage() {
    const [createContractOpen, setCreateContractOpen] = useState(false)
    // Initialize random message once on component mount
    const [randomMessage] = useState(() => motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)])
    const { isSignedIn, isLoaded } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/sign-in')
        }
    }, [isLoaded, isSignedIn, router])

    const { data: userInfo } = useQuery({
        queryKey: ['userInfo'],
        queryFn: fetchUserInfo,
        enabled: isSignedIn
    })

    const { data: historyData, isLoading: historyLoading } = useInfiniteHistory(10)
    const { data: contractsData } = useInfiniteContracts(10)

    // Extract user role and instant ID
    const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined
    const userInstantId = userInfo && 'instant_id' in userInfo ? userInfo.instant_id : undefined

    // Get upcoming sessions (not CANCELED or EXPIRED)
    const upcomingSessions = useMemo(() => {
        if (!historyData) return []

        const allSessions = historyData.pages.flatMap(page =>
            'history' in page ? page.history : []
        )

        const now = new Date().getTime()
        return allSessions
            .filter(session => {
                if (session.status === 'CANCELED' || session.status === 'EXPIRED') return false
                const sessionTime = session.date + (session.to * 60 * 1000)
                return sessionTime >= now
            })
            .sort((a, b) => {
                const aTime = a.date + (a.from * 60 * 1000)
                const bTime = b.date + (b.from * 60 * 1000)
                return aTime - bTime
            })
            .slice(0, 3)
    }, [historyData])

    // Get active contracts count
    const activeContractsCount = useMemo(() => {
        if (!contractsData) return 0

        const allContracts = contractsData.pages.flatMap(page =>
            'contracts' in page ? page.contracts : []
        )

        return allContracts.filter(c => c.status === 'ACTIVE').length
    }, [contractsData])

    const isStaffOrAdmin = userInfo && 'role' in userInfo && (userInfo.role === 'ADMIN' || userInfo.role === 'STAFF')

    const MessageIcon = randomMessage.icon

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Spin size="large" />
            </div>
        )
    }

    return (
        <div className="pb-6">
            {/* Hero Section */}
            <div className="relative mb-6 overflow-hidden">
                <div className="bg-gradient-to-br from-[#FA6868] via-[#FAAC68] to-[#FA6868] px-6 py-8 pb-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center gap-2 mb-5 animate-slide-up">
                            <MessageIcon className="text-white text-2xl" />
                            <Text className="text-white/90 text-base font-medium">{randomMessage.text}</Text>
                        </div>

                        <Title level={2} className="!text-white !mb-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            Your Fitness Journey
                        </Title>
                        <Paragraph className="text-white/80 !mb-0 text-base animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            Track your progress and stay motivated
                        </Paragraph>
                    </div>
                </div>

                {/* Decorative wave */}
                <svg className="w-full h-4 -mt-1" viewBox="0 0 1200 20" preserveAspectRatio="none">
                    <path d="M0,10 Q300,20 600,10 T1200,10 L1200,20 L0,20 Z" fill="#f8f9fa" />
                </svg>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-5 animate-fade-in px-4">
                <Card
                    className="!border-0 shadow-sm hover:shadow-md transition-shadow"
                    styles={{ body: { padding: '20px' } }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#FA6868] to-[#fc8585] rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                            <FileTextOutlined className="text-white text-2xl" />
                        </div>
                        <div>
                            <Text className="text-gray-500 text-xs block mb-1">Active</Text>
                            <Text strong className="text-3xl block leading-none mb-0.5">{activeContractsCount}</Text>
                            <Text className="text-gray-400 text-xs">Contracts</Text>
                        </div>
                    </div>
                </Card>

                <Card
                    className="!border-0 shadow-sm hover:shadow-md transition-shadow"
                    styles={{ body: { padding: '20px' } }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#5A9CB5] to-[#6BADC5] rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                            <HistoryOutlined className="text-white text-2xl" />
                        </div>
                        <div>
                            <Text className="text-gray-500 text-xs block mb-1">Upcoming</Text>
                            <Text strong className="text-3xl block leading-none mb-0.5">{upcomingSessions.length}</Text>
                            <Text className="text-gray-400 text-xs">Sessions</Text>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Create Contract Button for ADMIN/STAFF */}
            {isStaffOrAdmin && (
                <div className="mb-5 animate-slide-up px-4">
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateContractOpen(true)}
                        className="w-full h-14 text-base font-semibold shadow-lg"
                    >
                        Create New Contract
                    </Button>
                </div>
            )}

            {/* Upcoming Sessions Section */}
            <div className="mb-5 px-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <Title level={4} className="!mb-1">Upcoming Sessions</Title>
                        <Text type="secondary" className="text-sm">Next {upcomingSessions.length} sessions</Text>
                    </div>
                    {upcomingSessions.length > 0 && (
                        <Button
                            type="link"
                            onClick={() => router.push('/history')}
                            className="!px-0 !h-auto"
                        >
                            View All →
                        </Button>
                    )}
                </div>

                {historyLoading ? (
                    <div className="flex justify-center py-12">
                        <Spin size="large" />
                    </div>
                ) : upcomingSessions.length === 0 ? (
                    <Card className="!border-2 !border-dashed">
                        <Empty
                            description={
                                <div className="py-6">
                                    <Text className="text-gray-500 block mb-3 text-base font-medium">No upcoming sessions yet</Text>
                                    <Text type="secondary" className="text-sm">
                                        Book your next training session to get started
                                    </Text>
                                </div>
                            }
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {upcomingSessions.map((session, index) => (
                            <div
                                key={session.id}
                                className="animate-slide-up"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <SessionCard
                                    session={session}
                                    userRole={userRole}
                                    userInstantId={userInstantId as string}
                                    onClick={() => {
                                        // TODO: Open session detail modal
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions - Mobile Friendly */}
            <div className="px-4">
                <Title level={5} className="!mb-3">Quick Actions</Title>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push('/contracts')}
                        className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95 border border-gray-100"
                    >
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                            <FileTextOutlined className="text-purple-600 text-xl" />
                        </div>
                        <Text strong className="block text-base mb-1">View Contracts</Text>
                        <Text type="secondary" className="text-xs">Manage all contracts</Text>
                    </button>

                    <button
                        onClick={() => router.push('/history')}
                        className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95 border border-gray-100"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                            <HistoryOutlined className="text-blue-600 text-xl" />
                        </div>
                        <Text strong className="block text-base mb-1">All Sessions</Text>
                        <Text type="secondary" className="text-xs">View history</Text>
                    </button>
                </div>
            </div>

            {/* Create Contract Modal */}
            <CreateContractModal
                open={createContractOpen}
                onClose={() => setCreateContractOpen(false)}
            />
        </div>
    )
}

