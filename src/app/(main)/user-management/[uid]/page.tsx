'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type {
  GetAllUsersResponse,
  GetUserInformationResponse,
  Role,
  UserSetting,
} from '@/app/type/api'
import {
  ESSENTIAL_INFORMATION_FORM,
  type EssentialAnswers,
} from '@/lib/essentialInformation'
import { useUpdateUserRole } from '@/hooks/useUsers'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

async function fetchUserByUid(uid: string): Promise<UserSetting> {
  const response = await fetch('/api/user/getAll?page=1&limit=1000')
  if (!response.ok) {
    throw new Error('Failed to fetch target user')
  }

  const data: GetAllUsersResponse = await response.json()

  if (!('users' in data)) {
    throw new Error('Failed to fetch target user')
  }

  const targetUser = data.users.find((item) => item.users?.[0]?.id === uid)

  if (!targetUser) {
    throw new Error('Target user not found')
  }

  return targetUser
}

function parseAnswers(raw?: string): EssentialAnswers {
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return parsed as EssentialAnswers
  } catch {
    return {}
  }
}

function getDisplayName(user: UserSetting): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName
  return user.users?.[0]?.email || 'Unknown User'
}

function getUserInitials(user: UserSetting): string {
  const fullName = getDisplayName(user)
  return fullName
    .split(' ')
    .map((item) => item[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const ROLES: Role[] = ['ADMIN', 'STAFF', 'CUSTOMER']

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  STAFF: 'bg-[var(--color-pt-bg)] text-[var(--color-pt)]',
  CUSTOMER: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
}

export default function UserManagementDetailPage() {
  const router = useRouter()
  const params = useParams<{ uid: string }>()
  const uid = params.uid
  const updateUserRole = useUpdateUserRole()

  const [selectedRole, setSelectedRole] = useState<Role | ''>('')
  const [isEssentialModalOpen, setIsEssentialModalOpen] = useState(false)

  const { data: userInfo, isLoading: userInfoLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
  })

  const {
    data: targetUser,
    isLoading: targetUserLoading,
    isError: targetUserError,
    refetch: refetchTargetUser,
  } = useQuery({
    queryKey: ['user-management-detail', uid],
    queryFn: () => fetchUserByUid(uid),
    enabled: !!uid,
  })

  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined
  const viewerClerkId =
    userInfo && 'id' in userInfo && typeof userInfo.id === 'string'
      ? userInfo.id
      : undefined

  useEffect(() => {
    if (userInfoLoading) return
    if (!userRole || userRole !== 'ADMIN') {
      router.push('/profile')
    }
  }, [router, userInfoLoading, userRole])


  const isSelfTarget = useMemo(() => {
    if (!targetUser || !viewerClerkId) return false
    return targetUser.clerk_id === viewerClerkId
  }, [targetUser, viewerClerkId])

  const effectiveSelectedRole: Role =
    selectedRole || targetUser?.role || 'CUSTOMER'

  const essentialAnswers = useMemo(
    () => parseAnswers(targetUser?.essential_information),
    [targetUser?.essential_information]
  )

  const essentialSections = useMemo(() => {
    const grouped: Array<{
      id: string
      title: string
      questions: typeof ESSENTIAL_INFORMATION_FORM.questions
    }> = []

    for (const question of ESSENTIAL_INFORMATION_FORM.questions) {
      if (question.type === 'PAGE_BREAK') {
        grouped.push({ id: question.id, title: question.title, questions: [] })
        continue
      }

      if (question.type === 'FILE_UPLOAD') {
        continue
      }

      if (grouped.length === 0) {
        grouped.push({ id: 'section_general', title: 'General', questions: [] })
      }

      grouped[grouped.length - 1].questions.push(question)
    }

    return grouped
  }, [])

  const handleUpdateRole = async () => {
    if (!targetUser) return

    if (isSelfTarget) {
      toast.error('You cannot change your own role')
      return
    }

    try {
      await updateUserRole.mutateAsync({
        uid,
        role: effectiveSelectedRole,
      })
      toast.success('User role updated successfully')
      await refetchTargetUser()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update user role'
      toast.error(message)
    }
  }

  if (userInfoLoading || !userRole || userRole !== 'ADMIN') {
    return null
  }

  if (targetUserLoading) {
    return (
      <div className="px-4 pt-6 pb-6 space-y-4">
        <Skeleton className="h-9 w-20" />
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!targetUser || targetUserError) {
    return (
      <div className="px-4 pt-6 pb-6 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/user-management')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">
              Target user not found or inaccessible.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const roleClassName = ROLE_STYLES[targetUser.role] || ROLE_STYLES.CUSTOMER
  const isRoleChanged = effectiveSelectedRole !== targetUser.role

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/user-management')}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 border border-border">
              <AvatarImage src={targetUser.imageUrl} alt={getDisplayName(targetUser)} />
              <AvatarFallback className="text-sm font-semibold">
                {getUserInitials(targetUser)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {getDisplayName(targetUser)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {targetUser.users?.[0]?.email || 'No email'}
              </p>
            </div>

            <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${roleClassName}`}>
              {targetUser.role}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Role Management
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground">Select a new role for this user.</p>

          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((role) => {
              const selected = effectiveSelectedRole === role
              return (
                <Button
                  key={role}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  onClick={() => setSelectedRole(role)}
                  disabled={updateUserRole.isPending || isSelfTarget}
                  className="h-10 text-xs"
                >
                  {role}
                </Button>
              )
            })}
          </div>

          {isSelfTarget && (
            <p className="text-xs text-[var(--color-warning)]">
              You are viewing your own account. Self role change is blocked.
            </p>
          )}

          <Button
            type="button"
            onClick={handleUpdateRole}
            disabled={!isRoleChanged || updateUserRole.isPending || isSelfTarget}
            className="w-full h-11"
          >
            {updateUserRole.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating Role...
              </>
            ) : (
              'Update Role'
            )}
          </Button>
        </CardContent>
      </Card>

      {targetUser.role !== 'ADMIN' && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  Essential Information
                </span>
                <span
                  className={`text-[11px] px-2 py-1 rounded-full font-medium ${
                    targetUser.essential_ready
                      ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                      : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                  }`}
                >
                  {targetUser.essential_ready ? 'Ready' : 'Pending'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-4">
                Read-only view for admin. Open modal to view details.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsEssentialModalOpen(true)}>
                View Essential Information
              </Button>
            </CardContent>
          </Card>

          <Dialog open={isEssentialModalOpen} onOpenChange={setIsEssentialModalOpen}>
            <DialogContent className="max-h-[85dvh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Essential Information</DialogTitle>
                <DialogDescription>
                  Read-only answers from this user profile data onboarding form.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-4">
                {essentialSections.map((section) => (
                  <div key={section.id} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-semibold text-foreground mb-3">{section.title}</p>

                    <div className="space-y-3">
                      {section.questions.map((question, index) => {
                        const rawValue = essentialAnswers[question.id]
                        const displayValue = Array.isArray(rawValue)
                          ? rawValue.join(', ')
                          : typeof rawValue === 'string' && rawValue.trim().length > 0
                            ? rawValue
                            : '—'

                        return (
                          <div
                            key={question.id}
                            className={index > 0 ? 'pt-3 border-t border-border/60' : undefined}
                          >
                            <p className="text-xs text-muted-foreground mb-1">{question.title}</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {displayValue || '—'}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
