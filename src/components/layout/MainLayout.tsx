// src/components/layout/MainLayout.tsx
'use client'

import { ReactNode, useRef } from 'react'
import TopBar from './TopBar'
import BottomNavigation from './BottomNavigation'
import PWAInstaller from '@/components/PWAInstaller'
import PullToRefresh from '@/components/PullToRefresh'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const mainRef = useRef<HTMLElement>(null)

  return (
    <div className="flex flex-col h-screen overflow-hidden w-full">
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

