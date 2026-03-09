// src/components/layout/BottomNavigation.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Home, FileText, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      key: 'contracts',
      label: 'Contracts',
      icon: FileText,
      path: '/contracts'
    },
    {
      key: 'home',
      label: 'Home',
      icon: Home,
      path: '/',
    },
    {
      key: 'sessions',
      label: 'Sessions',
      icon: Clock,
      path: '/history'
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile'
    }
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const IconComponent = item.icon

          return (
            <button
              key={item.key}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full transition-colors duration-150 cursor-pointer active:scale-95",
              )}
            >
              <IconComponent
                className={cn(
                  "h-5 w-5 mb-1 transition-colors duration-150",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span className={cn(
                "text-[10px] font-medium transition-colors duration-150",
                active ? "text-foreground" : "text-muted-foreground"
              )}>
                {item.label}
              </span>

              {/* Active indicator dot */}
              {active && (
                <div className="absolute top-1 w-1 h-1 rounded-full bg-foreground" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
