// src/app/(main)/page.tsx
'use client'

import { Button, Empty, Spin, Typography, Card, Statistic, Row, Col } from 'antd'
import { PlusOutlined, FileTextOutlined, HistoryOutlined } from '@ant-design/icons'
import { useInfiniteHistory } from '@/hooks/useHistory'
import { useInfiniteContracts } from '@/hooks/useContracts'
import SessionCard from '@/components/cards/SessionCard'
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse } from '@/app/type/api'
import CreateContractModal from '@/components/modals/CreateContractModal'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const { Title } = Typography

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
    const response = await fetch('/api/user/getUserInformation')
    if (!response.ok) {
        throw new Error('Failed to fetch user information')
    }
    return response.json()
}

export default function HomePage() {
    const [createContractOpen, setCreateContractOpen] = useState(false)
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

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Spin size="large" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
                {/* Stats Cards */}
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={12}>
                        <Card>
                            <Statistic
                                title="Active Contracts"
                                value={activeContractsCount}
                                prefix={<FileTextOutlined />}
                                styles={{ content: { color: '#FA6868' } }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={12}>
                        <Card>
                            <Statistic
                                title="Upcoming Sessions"
                                value={upcomingSessions.length}
                                prefix={<HistoryOutlined />}
                                styles={{ content: { color: '#5A9CB5' } }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Create Contract Button for ADMIN/STAFF */}
                {isStaffOrAdmin && (
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateContractOpen(true)}
                        className="w-full"
                    >
                        Create New Contract
                    </Button>
                )}

                {/* Upcoming Sessions */}
                <div>
                    <Title level={4} className="mb-4">Upcoming Sessions</Title>

                    {historyLoading ? (
                        <div className="flex justify-center py-8">
                            <Spin size="large" />
                        </div>
                    ) : upcomingSessions.length === 0 ? (
                        <Empty
                            description="No upcoming sessions"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingSessions.map(session => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    onClick={() => {
                                        // TODO: Open session detail modal
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Contract Modal */}
                <CreateContractModal
                    open={createContractOpen}
                    onClose={() => setCreateContractOpen(false)}
                />
            </div>
    )
}

