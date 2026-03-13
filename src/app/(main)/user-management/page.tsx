'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Filter, Inbox, Loader2, UserRound, X } from 'lucide-react'
import type {
  GetUserInformationResponse,
  UserManagementFilters,
  UserSetting,
} from '@/app/type/api'
import { useInfiniteUsers } from '@/hooks/useUsers'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
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

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  STAFF: 'bg-[var(--color-pt-bg)] text-[var(--color-pt)]',
  CUSTOMER: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
}

export default function UserManagementPage() {
  const router = useRouter()
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const debouncedFirstName = useDebouncedValue(firstName, 300)
  const debouncedLastName = useDebouncedValue(lastName, 300)

  const { data: userInfo, isLoading: userInfoLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
  })

  const userRole = userInfo && 'role' in userInfo ? userInfo.role : undefined

  useEffect(() => {
    if (userInfoLoading) return
    if (!userRole || userRole !== 'ADMIN') {
      router.push('/profile')
    }
  }, [router, userInfoLoading, userRole])

  const filters = useMemo<UserManagementFilters>(() => {
    const next: UserManagementFilters = {}
    if (debouncedFirstName.trim()) {
      next.first_name = debouncedFirstName.trim()
    }
    if (debouncedLastName.trim()) {
      next.last_name = debouncedLastName.trim()
    }
    return next
  }, [debouncedFirstName, debouncedLastName])

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUsers(10, filters)

  const allUsers = useMemo(
    () =>
      data?.pages.flatMap((page) =>
        'users' in page ? page.users : []
      ) || [],
    [data]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (firstName.trim()) count += 1
    if (lastName.trim()) count += 1
    return count
  }, [firstName, lastName])

  const resetFilters = () => {
    setFirstName('')
    setLastName('')
  }

  if (userInfoLoading) {
    return (
      <div className="px-4 pt-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!userRole || userRole !== 'ADMIN') {
    return null
  }

  return (
    <div className="pb-6">
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold text-foreground">User Management</h1>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5"
            onClick={() => setFilterDrawerOpen(true)}
          >
            <Filter className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse all registered users and their roles
        </p>
      </div>

      <Dialog open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/20 supports-backdrop-filter:backdrop-blur-0 data-open:fade-in-0 data-closed:fade-out-0 duration-300"
          className="top-auto left-0 right-0 bottom-0 translate-x-0 translate-y-0 max-w-none rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-w-none max-h-[85dvh] overflow-hidden flex flex-col transition-transform duration-300 ease-out data-open:animate-none data-closed:animate-none data-open:translate-y-0 data-closed:translate-y-full"
        >
          <DialogHeader className="px-0 pt-0 pb-2">
            <DialogTitle>Filter users</DialogTitle>
            <DialogDescription>
              Apply first name and last name filters
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Type first name"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Last name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Type last name"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="secondary" onClick={resetFilters}>
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button onClick={() => setFilterDrawerOpen(false)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="px-4 mt-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : allUsers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No users found
              </p>
              <p className="text-xs text-muted-foreground">
                Try changing filter criteria to see matching users
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {allUsers.map((user, index) => {
                const uid = user.users?.[0]?.id
                const displayName = getDisplayName(user)
                const roleClassName = ROLE_STYLES[user.role] || ROLE_STYLES.CUSTOMER
                const roleLabel = user.role || 'CUSTOMER'

                return (
                  <button
                    key={user.id}
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      if (uid) {
                        router.push(`/user-management/${uid}`)
                      }
                    }}
                  >
                    <Card
                      className="animate-slide-up hover:border-primary/50 transition-colors"
                      style={{ animationDelay: `${index * 0.04}s` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-11 border border-border">
                            <AvatarImage
                              src={user.imageUrl}
                              alt={displayName}
                            />
                            <AvatarFallback className="text-sm font-semibold">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {displayName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.users?.[0]?.email || 'No email'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${roleClassName}`}>
                              {roleLabel}
                            </span>
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="min-w-[180px] h-11"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

