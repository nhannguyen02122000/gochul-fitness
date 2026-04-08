// src/app/profile/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LogOut,
  FileText,
  Clock,
  CheckCircle2,
  Trophy,
  Pencil,
  Loader2,
  ChevronRight,
  ClipboardList,
  Users,
  Crown,
  Zap,
  Dumbbell,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { GetUserInformationResponse } from '@/app/type/api'
import { isCompletedHistoryStatus } from '@/utils/statusUtils'
import { useUpdateUserBasicInfo } from '@/hooks/useUser'
import { useInfiniteContracts } from '@/hooks/useContracts'
import { useInfiniteHistory } from '@/hooks/useHistory'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import packageJson from '../../../../package.json'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const { signOut } = useClerk()
  const router = useRouter()
  const updateUserInfo = useUpdateUserBasicInfo()
  const [now] = useState(() => Date.now())

  const { data: userInfo, refetch } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
  })

  const { data: contractsData } = useInfiniteContracts(100)
  const { data: historyData } = useInfiniteHistory(100)

  // Calculate stats
  const stats = useMemo(() => {
    const allContracts =
      contractsData?.pages.flatMap((page) =>
        'contracts' in page ? page.contracts : []
      ) || []

    const allHistory =
      historyData?.pages.flatMap((page) =>
        'history' in page ? page.history : []
      ) || []

    return {
      totalContracts: allContracts.length,
      activeContracts: allContracts.filter((c) => c.status === 'ACTIVE').length,
      completedSessions: allHistory.filter(
        (h) => isCompletedHistoryStatus(h.status)
      ).length,
      totalSessions: allHistory.length,
      upcomingSessions: allHistory.filter((h) => {
        const sessionTime = h.date + h.from * 60 * 1000
        return (
          sessionTime >= now &&
          h.status !== 'CANCELED' &&
          h.status !== 'EXPIRED'
        )
      }).length,
    }
  }, [contractsData, historyData, now])

  const handleStartEditing = () => {
    if (userInfo && !('error' in userInfo)) {
      setFirstName(userInfo.first_name || '')
      setLastName(userInfo.last_name || '')
    }
    setIsEditing(true)
  }

  const handleSubmit = async () => {
    try {
      await updateUserInfo.mutateAsync({
        first_name: firstName,
        last_name: lastName,
      })
      toast.success('Profile updated successfully')
      setIsEditing(false)
      refetch()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update profile'
      toast.error(message)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (userInfo && !('error' in userInfo)) {
      setFirstName(userInfo.first_name || '')
      setLastName(userInfo.last_name || '')
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/sign-in')
  }

  if (!userInfo || 'error' in userInfo) {
    return (
      <div className="px-4 pt-8 space-y-4">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const fullName =
    [userInfo.first_name, userInfo.last_name].filter(Boolean).join(' ') ||
    userInfo.username ||
    'User'
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Role badge styling — uses Lucide SVG icons, NOT emoji
  const roleConfig: Record<
    string,
    { bg: string; text: string; label: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    ADMIN: {
      bg: 'bg-[var(--color-warning-bg)]',
      text: 'text-[var(--color-warning)]',
      label: 'Admin',
      icon: Crown,
    },
    STAFF: {
      bg: 'bg-[var(--color-pt-bg)]',
      text: 'text-[var(--color-pt)]',
      label: 'Staff',
      icon: Zap,
    },
    CUSTOMER: {
      bg: 'bg-[var(--color-success-bg)]',
      text: 'text-[var(--color-success)]',
      label: 'Member',
      icon: Dumbbell,
    },
  }
  const roleBadge = (userInfo.role ? roleConfig[userInfo.role] : undefined) || roleConfig.CUSTOMER

  const statCards = [
    {
      label: 'Active Contracts',
      value: stats.activeContracts,
      icon: FileText,
      color: 'text-[var(--color-pt)]',
      bg: 'bg-[var(--color-pt-bg)]',
    },
    {
      label: 'Completed',
      value: stats.completedSessions,
      icon: CheckCircle2,
      color: 'text-[var(--color-success)]',
      bg: 'bg-[var(--color-success-bg)]',
    },
    {
      label: 'Upcoming',
      value: stats.upcomingSessions,
      icon: Clock,
      color: 'text-[var(--color-warning)]',
      bg: 'bg-[var(--color-warning-bg)]',
    },
    {
      label: 'Total Sessions',
      value: stats.totalSessions,
      icon: Trophy,
      color: 'text-[var(--color-pt-monthly)]',
      bg: 'bg-[var(--color-pt-monthly-bg)]',
    },
  ]

  return (
    <div className="pb-6">
      {/* Profile Hero */}
      <div className="px-4 pt-6 pb-5 animate-fade-in">
        <Card>
          <CardContent className="pt-6 pb-5">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-4">
                <Avatar className="size-24 border-4 border-background shadow-lg">
                  <AvatarImage src={userInfo.imageUrl} alt={fullName} />
                  <AvatarFallback className="text-xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-[var(--color-success)] border-[3px] border-background rounded-full" />
              </div>

              {/* Name & Email */}
              <h2 className="text-xl font-bold text-foreground mb-1">
                {fullName}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                {userInfo.emailAddresses?.[0]?.emailAddress}
              </p>

              {/* Role Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${roleBadge.bg} ${roleBadge.text}`}
              >
                <roleBadge.icon className="h-4 w-4" />
                {roleBadge.label}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="px-4 mb-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Your Progress
        </h3>
        <div className="grid grid-cols-2 gap-3 animate-slide-up">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center mb-2.5`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none tabular-nums mb-1">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Personal Information */}
      <div className="px-4 mb-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <Card>
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Personal Information
              </CardTitle>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEditing}
                  className="h-8 px-2.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-xs font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-xs font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="h-11"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={updateUserInfo.isPending}
                    className="flex-1 h-11"
                  >
                    {updateUserInfo.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 h-11"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    First Name
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {userInfo.first_name || (
                      <span className="text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </p>
                </div>
                <Separator className="my-3" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Last Name
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {userInfo.last_name || (
                      <span className="text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {userInfo.role === 'ADMIN' ? (
        <div className="px-4 mb-5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <Card>
            <CardHeader className="">
              <CardTitle className="text-sm font-semibold">
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <button
                type="button"
                onClick={() => router.push('/user-management')}
                className="w-full min-h-14 rounded-xl border border-border px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="size-9 rounded-lg bg-[var(--color-pt-bg)] text-[var(--color-pt)] flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Manage System Users
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Browse users and roles
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-4 mb-5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <Card>
            <CardHeader className="">
              <CardTitle className="text-sm font-semibold">
                Essential Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <button
                type="button"
                onClick={() => router.push('/profile/essential-information')}
                className="w-full min-h-14 rounded-xl border border-border px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="size-9 rounded-lg bg-[var(--color-pt-bg)] text-[var(--color-pt)] flex items-center justify-center">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      ChulFitCoach Onboarding Form
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userInfo.essential_ready ? 'Completed' : 'Incomplete'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2 py-1 rounded-full font-medium ${userInfo.essential_ready
                      ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                      : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                      }`}
                  >
                    {userInfo.essential_ready ? 'Ready' : 'Pending'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logout Button */}
      <div className="px-4 mb-4">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Version Information */}
      <div className="px-4 pt-4 pb-4 text-center">
        <p className="text-[11px] text-muted-foreground/60">
          ChulFitCoach · v{packageJson.version}
        </p>
      </div>
    </div>
  )
}
