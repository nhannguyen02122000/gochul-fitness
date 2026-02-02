// src/components/PullToRefresh.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { historyKeys } from '@/hooks/useHistory'
import { contractKeys } from '@/hooks/useContracts'
import { userKeys } from '@/hooks/useUser'
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons'

interface PullToRefreshProps {
    children: React.ReactNode
    scrollContainerRef?: React.RefObject<HTMLElement | null>
}

export default function PullToRefresh({ children, scrollContainerRef }: PullToRefreshProps) {
    const queryClient = useQueryClient()
    const [isPulling, setIsPulling] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const touchStartY = useRef(0)
    const pullStartY = useRef(0)
    const isPullingRef = useRef(false)

    const PULL_THRESHOLD = 80 // Distance to trigger refresh
    const MAX_PULL_DISTANCE = 120 // Maximum pull distance

    useEffect(() => {
        const scrollContainer = scrollContainerRef?.current
        if (!scrollContainer) return

        const handleRefresh = async () => {
            if (isRefreshing) return

            setIsRefreshing(true)

            try {
                // Invalidate all query tags
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: historyKeys.all }),
                    queryClient.invalidateQueries({ queryKey: contractKeys.all }),
                    queryClient.invalidateQueries({ queryKey: userKeys.all }),
                ])

                // Force refetch all active queries
                await queryClient.refetchQueries({
                    type: 'active',
                    stale: true
                })
            } catch (error) {
                console.error('Error refreshing data:', error)
            } finally {
                // Add a small delay for better UX
                setTimeout(() => {
                    setIsRefreshing(false)
                    setIsPulling(false)
                    setPullDistance(0)
                }, 500)
            }
        }

        const handleTouchStart = (e: TouchEvent) => {
            // Only start pull if scrolled to top
            if (scrollContainer.scrollTop === 0) {
                touchStartY.current = e.touches[0].clientY
                pullStartY.current = e.touches[0].clientY
                isPullingRef.current = true
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPullingRef.current || isRefreshing) return

            const currentY = e.touches[0].clientY
            const diff = currentY - touchStartY.current

            // Only pull down when scrolled to top
            if (diff > 0 && scrollContainer.scrollTop === 0) {
                // Prevent default scroll behavior
                e.preventDefault()

                // Calculate pull distance with resistance
                const resistance = 0.5
                const distance = Math.min(diff * resistance, MAX_PULL_DISTANCE)

                setPullDistance(distance)
                setIsPulling(distance > 10) // Start showing indicator after 10px
            }
        }

        const handleTouchEnd = () => {
            if (!isPullingRef.current) return

            isPullingRef.current = false

            if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
                handleRefresh()
            } else {
                setIsPulling(false)
                setPullDistance(0)
            }
        }

        // Add event listeners
        scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true })
        scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false })
        scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            scrollContainer.removeEventListener('touchstart', handleTouchStart)
            scrollContainer.removeEventListener('touchmove', handleTouchMove)
            scrollContainer.removeEventListener('touchend', handleTouchEnd)
        }
    }, [scrollContainerRef, pullDistance, isRefreshing, queryClient])

    const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1)
    const showRefreshIcon = isPulling || isRefreshing
    const iconRotation = pullProgress * 360

    return (
        <>
            {/* Pull to Refresh Indicator */}
            {showRefreshIcon && (
                <div
                    className="fixed left-0 right-0 flex items-center justify-center transition-all duration-200 z-50"
                    style={{
                        top: `${Math.min(pullDistance, 60)}px`,
                        opacity: pullProgress,
                        transform: `translateY(${isRefreshing ? 0 : -20}px)`,
                    }}
                >
                    <div className="bg-white rounded-full shadow-lg p-3 flex items-center justify-center">
                        {isRefreshing ? (
                            <LoadingOutlined className="text-xl text-blue-500" spin />
                        ) : (
                            <ReloadOutlined
                                className="text-xl text-blue-500"
                                style={{
                                    transform: `rotate(${iconRotation}deg)`,
                                    transition: 'transform 0.1s ease',
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Content with pull effect */}
            <div
                style={{
                    transform: `translateY(${isPulling || isRefreshing ? pullDistance * 0.5 : 0}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s ease',
                }}
            >
                {children}
            </div>
        </>
    )
}

