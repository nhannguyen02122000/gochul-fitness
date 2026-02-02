// src/components/layout/TopBar.tsx
'use client'

import { Avatar, Badge } from 'antd'
import { UserOutlined, BellOutlined } from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse } from '@/app/type/api'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { data, isLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    enabled: typeof window !== 'undefined'
  })

  // Get page title based on route
  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard'
    if (pathname === '/contracts') return 'Contracts'
    if (pathname === '/history') return 'Sessions'
    if (pathname === '/profile') return 'Profile'
    return 'GoChul Fitness'
  }

  if (isLoading || typeof window === 'undefined') {
    return (
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#FA6868] to-[#FAAC68] safe-area-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full animate-pulse" />
              <div className="flex flex-col gap-2">
                <div className="w-24 h-5 bg-white/20 rounded animate-pulse" />
                <div className="w-16 h-3 bg-white/20 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!data || 'error' in data) {
    return null
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'User'
  const firstName = data.first_name || data.username || 'User'
  
  // Role badge styling
  const getRoleBadge = () => {
    const roleStyles = {
      ADMIN: { bg: 'bg-red-500/20', text: 'text-white', label: 'Admin' },
      STAFF: { bg: 'bg-blue-500/20', text: 'text-white', label: 'Staff' },
      CUSTOMER: { bg: 'bg-green-500/20', text: 'text-white', label: 'Member' }
    }
    const style = roleStyles[data.role as keyof typeof roleStyles] || roleStyles.CUSTOMER
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    )
  }

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-[#FA6868] to-[#FAAC68] safe-area-top shadow-lg">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* User Info */}
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-3 hover:scale-105 transition-transform active:scale-95"
          >
            <div className="relative">
              <Avatar
                size={48}
                src={data.imageUrl}
                icon={<UserOutlined />}
                className="shrink-0 border-2 border-white shadow-md"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-white text-lg leading-tight">
                Hi, {firstName}! 👋
              </span>
              {getRoleBadge()}
            </div>
          </button>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors active:scale-95">
              <BellOutlined className="text-white text-lg" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Page Title Bar - Only show on non-home pages */}
      {pathname !== '/' && (
        <div className="bg-white/10 backdrop-blur-sm px-4 py-3 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-white text-xl font-bold">{getPageTitle()}</h1>
          </div>
        </div>
      )}
    </div>
  )
}

