// src/components/layout/MainLayout.tsx
'use client'

import { ReactNode } from 'react'
import TopBar from './TopBar'
import BottomNavigation from './BottomNavigation'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <main className="flex-1 overflow-y-auto bg-[#f8f9fa]" style={{ paddingBottom: '120px' }}>
        <div className="max-w-screen-xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNavigation />
    </div>
  )
}

