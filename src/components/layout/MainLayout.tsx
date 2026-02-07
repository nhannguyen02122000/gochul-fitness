// src/components/layout/MainLayout.tsx
'use client'

import { ReactNode, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import TopBar from './TopBar'
import BottomNavigation from './BottomNavigation'
import PWAInstaller from '@/components/PWAInstaller'
import PullToRefresh from '@/components/PullToRefresh'
import OnboardingModal from '@/components/modals/OnboardingModal'
import { useCheckUserSetting } from '@/hooks/useUserOnboarding'
import { useQueryClient } from '@tanstack/react-query'
import { userOnboardingKeys } from '@/hooks/useUserOnboarding'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const mainRef = useRef<HTMLElement>(null)
  const queryClient = useQueryClient()
  const { isSignedIn } = useAuth()

  // Check if user needs onboarding (only when signed in)
  console.log('isSignedIn', isSignedIn)
  const { data: checkData } = useCheckUserSetting(!!isSignedIn)
  const needsOnboarding = isSignedIn && checkData && !checkData.exists

  const handleOnboardingComplete = () => {
    // Invalidate the check query to refetch user setting status
    queryClient.invalidateQueries({ queryKey: userOnboardingKeys.check() })
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden w-full">
      {/* Onboarding Modal - shown when user needs to complete profile */}
      <OnboardingModal
        open={!!needsOnboarding}
        onComplete={handleOnboardingComplete}
      />

      <TopBar />
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f8f9fa] w-full"
        style={{ paddingBottom: '120px' }}
      >
        <PullToRefresh scrollContainerRef={mainRef}>
          <div className="max-w-screen-xl mx-auto w-full">
            {children}
          </div>
        </PullToRefresh>
      </main>
      <BottomNavigation />
      <PWAInstaller />
    </div>
  )
}

