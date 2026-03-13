'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GetUserInformationResponse } from '@/app/type/api'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function UserManagementDetailPlaceholderPage() {
  const router = useRouter()
  const params = useParams<{ uid: string }>()

  const { data: userInfo, isLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
  })

  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined

  useEffect(() => {
    if (isLoading) return
    if (!userRole || userRole !== 'ADMIN') {
      router.push('/profile')
    }
  }, [router, isLoading, userRole])

  if (isLoading || !userRole || userRole !== 'ADMIN') {
    return null
  }

  return (
    <div className="px-4 pt-6 pb-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/user-management')}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>User Detail (Planned)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            User detail page for <span className="font-medium text-foreground">{params.uid}</span> will be implemented in the next plan.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

