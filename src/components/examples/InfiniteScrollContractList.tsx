'use client'

import { useInfiniteContracts } from '@/hooks/useContracts'
import { Card, List, Space, Spin, Tag } from 'antd'
import type { Contract } from '@/app/type/api'
import { useEffect, useRef } from 'react'

/**
 * Example component demonstrating automatic infinite scrolling
 * Automatically loads more contracts when scrolling to the bottom
 */
export default function InfiniteScrollContractList() {
    const {
        data,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteContracts(10)

    const observerTarget = useRef<HTMLDivElement>(null)

    // Set up Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            { threshold: 0.1 }
        )

        const currentTarget = observerTarget.current
        if (currentTarget) {
            observer.observe(currentTarget)
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget)
            }
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    // Flatten all contracts from all pages
    const allContracts = data?.pages.flatMap((page) => {
        if ('contracts' in page) {
            return page.contracts
        }
        return []
    }) ?? []

    // Initial loading state
    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" tip="Loading contracts..." />
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
        <Card
            title="Contracts (Infinite Scroll)"
            extra={<span style={{ color: '#999' }}>{allContracts.length} loaded</span>}
        >
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
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
                                    <Space orientation="vertical" size="small">
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

                {/* Loading indicator when fetching next page */}
                {isFetchingNextPage && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin tip="Loading more contracts..." />
                    </div>
                )}

                {/* Intersection observer target */}
                <div ref={observerTarget} style={{ height: '20px' }} />

                {/* End message */}
                {!hasNextPage && allContracts.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                        <small>No more contracts to load</small>
                    </div>
                )}

                {/* Empty state */}
                {allContracts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                        <p>No contracts found</p>
                    </div>
                )}
            </div>

            {/* Stats footer */}
            <div style={{
                borderTop: '1px solid #f0f0f0',
                paddingTop: '10px',
                marginTop: '10px',
                textAlign: 'center',
                color: '#999'
            }}>
                <small>
                    {data?.pages.length} page(s) loaded • {allContracts.length} contract(s) total
                </small>
            </div>
        </Card>
    )
}

