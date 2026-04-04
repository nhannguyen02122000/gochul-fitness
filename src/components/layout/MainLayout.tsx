// src/components/layout/MainLayout.tsx
'use client'

import { ReactNode, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import TopBar from './TopBar'
import BottomNavigation from './BottomNavigation'
import PWAInstaller from '@/components/PWAInstaller'
import PullToRefresh from '@/components/PullToRefresh'
import OnboardingModal from '@/components/modals/OnboardingModal'
import FloatingFAB from '@/components/chatbot/FloatingFAB'
import AIChatbotModal from '@/components/chatbot/AIChatbotModal'
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

  const { data: checkData } = useCheckUserSetting(!!isSignedIn)
  const needsOnboarding = isSignedIn && checkData && 'exists' in checkData && !checkData.exists

  const handleOnboardingComplete = () => {
    queryClient.invalidateQueries({ queryKey: userOnboardingKeys.check() })
  }

  return (
    <div className="flex flex-col h-dvh min-h-0 overflow-hidden w-full">
      <OnboardingModal
        open={!!needsOnboarding}
        onComplete={handleOnboardingComplete}
      />

      <TopBar />
      <main
        ref={mainRef}
        id="main-content"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background w-full [overscroll-behavior-y:contain]"
        style={{ paddingBottom: '120px' }}
      >
        <PullToRefresh scrollContainerRef={mainRef}>
          <div className="max-w-screen-xl mx-auto w-full">
            {children}
          </div>
        </PullToRefresh>
      </main>
      <BottomNavigation />
      <AIChatbotModal />
      <FloatingFAB />
      <PWAInstaller />
    </div>
  )
}
