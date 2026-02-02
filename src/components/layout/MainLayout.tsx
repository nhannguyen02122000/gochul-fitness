// src/components/layout/MainLayout.tsx
'use client'

import { ReactNode } from 'react'
import TopBar from './TopBar'
import BottomNavigation from './BottomNavigation'
import PWAInstaller from '@/components/PWAInstaller'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden w-full">
      <TopBar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f8f9fa] w-full" style={{ paddingBottom: '120px' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          {children}
        </div>
      </main>
      <BottomNavigation />
      <PWAInstaller />
    </div>
  )
}

