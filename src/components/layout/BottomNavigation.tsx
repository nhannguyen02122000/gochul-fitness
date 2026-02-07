// src/components/layout/BottomNavigation.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { FileTextOutlined, HomeOutlined, HistoryOutlined, UserOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'

export default function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(1)

  const navItems = [
    {
      key: 'contracts',
      label: 'Contracts',
      icon: FileTextOutlined,
      iconSize: 'text-2xl',
      path: '/contracts'
    },
    {
      key: 'home',
      label: 'Home',
      icon: HomeOutlined,
      iconSize: 'text-2xl',
      path: '/',
      isCenter: true
    },
    {
      key: 'sessions',
      label: 'Sessions',
      icon: HistoryOutlined,
      iconSize: 'text-2xl',
      path: '/history'
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: UserOutlined,
      iconSize: 'text-2xl',
      path: '/profile'
    }
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  useEffect(() => {
    const index = navItems.findIndex(item => isActive(item.path))
    if (index !== -1) {
      setActiveIndex(index)
    }
  }, [pathname])

  const handleNavigation = (path: string, index: number) => {
    setActiveIndex(index)
    router.push(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-50 safe-area-bottom">
      {/* Animated indicator */}
      <div
        className="absolute top-0 h-1 bg-gradient-to-r from-[#FA6868] to-[#FAAC68] transition-all duration-300 ease-out"
        style={{
          width: `${100 / navItems.length}%`,
          left: `${(activeIndex * 100) / navItems.length}%`,
        }}
      />

      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map((item, index) => {
          const active = isActive(item.path)
          const IconComponent = item.icon

          return (
            <button
              key={item.key}
              onClick={() => handleNavigation(item.path, index)}
              className="relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 active:scale-90"
            >
              {/* Active background */}
              {active && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#FA6868]/10 to-[#FAAC68]/10 rounded-2xl animate-scale-in" />
                </div>
              )}

              {/* Icon container */}
              <div className={`relative z-10 flex items-center justify-center mb-1 transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'
                }`}>
                <IconComponent
                  className={item.iconSize}
                  style={{
                    color: active ? '#FA6868' : '#9CA3AF',
                    transition: 'color 0.2s',
                  }}
                />
              </div>

              {/* Label */}
              <span className={`relative z-10 text-xs font-semibold transition-all duration-200 ${active
                ? 'text-[#FA6868] scale-100'
                : 'text-gray-400 scale-95'
                }`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

