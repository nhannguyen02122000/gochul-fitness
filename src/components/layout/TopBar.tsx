// src/components/layout/TopBar.tsx
'use client'

import { Avatar, Badge } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
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
  const { data, isLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    enabled: typeof window !== 'undefined' // Only run on client side
  })

  if (isLoading || typeof window === 'undefined') {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex flex-col gap-2">
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data || 'error' in data) {
    return null
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'User'
  const roleColor: 'error' | 'processing' | 'success' = data.role === 'ADMIN' ? 'error' : data.role === 'STAFF' ? 'processing' : 'success'

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 safe-area-top">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Avatar
            size="large"
            src={data.imageUrl}
            icon={<UserOutlined />}
            className="shrink-0"
          />
          <div className="flex flex-col items-start">
            <span className="font-semibold text-gray-900">{fullName}</span>
            <Badge
              status={roleColor}
              text={data.role}
              className="text-xs"
            />
          </div>
        </button>
      </div>
    </div>
  )
}

