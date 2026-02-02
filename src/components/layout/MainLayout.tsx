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
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <TopBar />
      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNavigation />
    </div>
  )
}

