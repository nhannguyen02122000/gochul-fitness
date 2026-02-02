// src/components/layout/BottomNavigation.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { FileTextOutlined, HomeOutlined, HistoryOutlined } from '@ant-design/icons'

export default function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      key: 'contracts',
      label: 'Contracts',
      icon: FileTextOutlined,
      iconSize: 'text-xl',
      path: '/contracts'
    },
    {
      key: 'home',
      label: 'Home',
      icon: HomeOutlined,
      iconSize: 'text-2xl',
      path: '/'
    },
    {
      key: 'history',
      label: 'History',
      icon: HistoryOutlined,
      iconSize: 'text-xl',
      path: '/history'
    }
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const IconComponent = item.icon
          const iconColor = active ? '#FA6868' : '#6B7280'
          return (
            <button
              key={item.key}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
            >
              <div className={item.key === 'home' ? 'mb-0.5' : 'mb-1'}>
                <IconComponent 
                  className={item.iconSize}
                  style={{ color: iconColor, transition: 'color 0.2s' }}
                />
              </div>
              <span className={`text-xs font-medium transition-colors ${
                active
                  ? 'text-[#FA6868]'
                  : 'text-gray-500'
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

