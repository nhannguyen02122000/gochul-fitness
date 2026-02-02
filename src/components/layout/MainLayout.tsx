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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar />
      <main className="flex-1 pb-20 pt-4 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto px-4">
          {children}
        </div>
      </main>
      <BottomNavigation />
    </div>
  )
}

