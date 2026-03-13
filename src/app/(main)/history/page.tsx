// src/app/history/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Plus,
  Loader2,
  Inbox,
  CalendarIcon,
  Filter,
  Check,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  GetUserInformationResponse,
  HistoryStatus,
  HistoryFilters,
} from '@/app/type/api'
import SessionCard from '@/components/cards/SessionCard'
import { useInfiniteHistory } from '@/hooks/useHistory'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { isCompletedHistoryStatus } from '@/utils/statusUtils'
import { cn } from '@/lib/utils'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

const HISTORY_STATUSES: { value: HistoryStatus; label: string }[] = [
  { value: 'NEWLY_CREATED', label: 'Pending check in' },
  { value: 'CHECKED_IN', label: 'Completed' },
  { value: 'CANCELED', label: 'Canceled' },
  { value: 'EXPIRED', label: 'Expired' },
]

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}

function formatDateDisplay(date?: Date) {
  if (!date) return ''
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function startOfDayTimestamp(date?: Date): number | undefined {
  if (!date) return undefined
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next.getTime()
}

function endOfDayTimestamp(date?: Date): number | undefined {
  if (!date) return undefined
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next.getTime()
}

function parseTimeToMinute(timeValue: string): number | undefined {
  if (!timeValue) return undefined
  const [hourRaw, minuteRaw] = timeValue.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return undefined
  }
  return hour * 60 + minute
}

export default function HistoryPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [teachByName, setTeachByName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [statuses, setStatuses] = useState<HistoryStatus[]>([])
  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')

  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const debouncedTeachByName = useDebouncedValue(teachByName, 300)
  const debouncedCustomerName = useDebouncedValue(customerName, 300)

  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
  })

  const userRole =
    userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId =
    userInfo && 'instantUser' in userInfo
      ? userInfo.instantUser?.[0]?.id
      : undefined

  const fromMinute = useMemo(() => parseTimeToMinute(fromTime), [fromTime])
  const toMinute = useMemo(() => parseTimeToMinute(toTime), [toTime])
  const hasActiveStatusFilter = statuses.length > 0

  const filters = useMemo<HistoryFilters>(() => {
    const next: HistoryFilters = {
      statuses,
      start_date: startOfDayTimestamp(fromDate),
      end_date: endOfDayTimestamp(toDate),
    }

    if (userRole === 'ADMIN' || userRole === 'CUSTOMER') {
      if (debouncedTeachByName.trim()) {
        next.teach_by_name = debouncedTeachByName.trim()
      }
    }

    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      if (debouncedCustomerName.trim()) {
        next.customer_name = debouncedCustomerName.trim()
      }
    }

    if (fromMinute !== undefined) {
      next.from_minute = fromMinute
    }

    if (toMinute !== undefined) {
      next.to_minute = toMinute
    }

    return next
  }, [
    statuses,
    fromDate,
    toDate,
    userRole,
    debouncedTeachByName,
    debouncedCustomerName,
    fromMinute,
    toMinute,
  ])

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteHistory(10, filters)

  const toggleStatus = (status: HistoryStatus) => {
    setStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    )
  }

  const resetFilters = () => {
    setTeachByName('')
    setCustomerName('')
    setStatuses([])
    setFromDate(undefined)
    setToDate(undefined)
    setFromTime('')
    setToTime('')
  }

  const allHistory = useMemo(
    () =>
      data?.pages.flatMap((page) =>
        'history' in page ? page.history : []
      ) || [],
    [data]
  )

  // Use current time from state to avoid impure function in useMemo
  const [now] = useState(() => Date.now())

  // Categorize sessions
  const categorizedSessions = useMemo(() => {
    // Upcoming: NEWLY_CREATED or CHECKED_IN where session end time hasn't passed
    const upcoming = allHistory
      .filter((session) => {
        const sessionEndTime = session.date + session.to * 60 * 1000
        return (
          sessionEndTime >= now &&
          (session.status === 'NEWLY_CREATED' ||
            isCompletedHistoryStatus(session.status))
        )
      })
      .sort((a, b) => {
        const aTime = a.date + a.from * 60 * 1000
        const bTime = b.date + b.from * 60 * 1000
        return aTime - bTime
      })

    // Past: Only CHECKED_IN status where session end time has passed
    const past = allHistory
      .filter((session) => {
        const sessionEndTime = session.date + session.to * 60 * 1000
        return isCompletedHistoryStatus(session.status) && sessionEndTime < now
      })
      .sort((a, b) => {
        const aTime = a.date + a.from * 60 * 1000
        const bTime = b.date + b.from * 60 * 1000
        return bTime - aTime
      })

    // Overdue: NEWLY_CREATED where session end time has passed
    const overdue = allHistory
      .filter((session) => {
        const sessionEndTime = session.date + session.to * 60 * 1000
        return (
          sessionEndTime < now &&
          session.status === 'NEWLY_CREATED'
        )
      })
      .sort((a, b) => {
        const aTime = a.date + a.from * 60 * 1000
        const bTime = b.date + b.from * 60 * 1000
        return bTime - aTime
      })

    // Inactive: EXPIRED or CANCELED status
    const inactive = allHistory
      .filter(
        (session) =>
          session.status === 'EXPIRED' || session.status === 'CANCELED'
      )
      .sort((a, b) => {
        const aTime = a.date + a.from * 60 * 1000
        const bTime = b.date + b.from * 60 * 1000
        return bTime - aTime
      })

    const completed = past.length

    return { upcoming, past, overdue, inactive, completed, all: allHistory }
  }, [allHistory, now])

  const displayedSessions = allHistory

  // All roles can create sessions
  const canCreateSession = !!userRole

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold text-foreground">Sessions</h1>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5"
            onClick={() => setFilterDrawerOpen(true)}
          >
            <Filter className="h-3.5 w-3.5" />
            {hasActiveStatusFilter && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {statuses.length}
              </span>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          View and manage your training sessions
        </p>
      </div>

      {/* Create Session Button */}
      {canCreateSession && (
        <div className="px-4 mt-3 mb-4 animate-slide-up">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="w-full h-12 text-sm font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Session
          </Button>
        </div>
      )}

      {/* Filters Drawer */}
      <Dialog open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/20 supports-backdrop-filter:backdrop-blur-0 data-open:fade-in-0 data-closed:fade-out-0 duration-300"
          className="top-auto left-0 right-0 bottom-0 translate-x-0 translate-y-0 max-w-none rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-w-none max-h-[85dvh] overflow-hidden flex flex-col transition-transform duration-300 ease-out data-open:animate-none data-closed:animate-none data-open:translate-y-0 data-closed:translate-y-full"
        >
          <DialogHeader className="px-0 pt-0 pb-2">
            <DialogTitle>Filter Sessions</DialogTitle>
            <DialogDescription>
              Apply filters to refine session list
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-3">
            <div className="grid grid-cols-1 gap-3">
              {(userRole === 'ADMIN' || userRole === 'CUSTOMER') && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Trainer</Label>
                  <Input
                    placeholder="Search by trainer name"
                    value={teachByName}
                    onChange={(e) => setTeachByName(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              )}

              {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer</Label>
                  <Input
                    placeholder="Search by customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date from</Label>
                  <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                    <PopoverTrigger
                      render={<Button variant="outline" />}
                      className={cn(
                        'w-full justify-start text-left font-normal h-10 text-sm',
                        !fromDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? formatDateDisplay(fromDate) : 'Pick date'}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={(date) => {
                          setFromDate(date)
                          setFromDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Date to</Label>
                  <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                    <PopoverTrigger
                      render={<Button variant="outline" />}
                      className={cn(
                        'w-full justify-start text-left font-normal h-10 text-sm',
                        !toDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? formatDateDisplay(toDate) : 'Pick date'}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={(date) => {
                          setToDate(date)
                          setToDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Time from</Label>
                  <Input
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Time to</Label>
                  <Input
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger
                    render={<Button variant="outline" />}
                    className="w-full justify-between text-sm font-normal"
                  >
                    {statuses.length === 0 ? 'No status selected' : `${statuses.length} selected`}
                    <span className="text-xs text-muted-foreground">Multi-select</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandEmpty>No statuses</CommandEmpty>
                        <CommandGroup>
                          {HISTORY_STATUSES.map((option) => {
                            const checked = statuses.includes(option.value)
                            return (
                              <CommandItem
                                key={option.value}
                                value={option.value}
                                onSelect={() => toggleStatus(option.value)}
                              >
                                <Check className={cn('h-4 w-4', checked ? 'opacity-100' : 'opacity-0')} />
                                <span>{option.label}</span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-3 mb-5 animate-fade-in">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total</p>
            <p className="text-xl font-bold text-foreground leading-none tabular-nums">
              {categorizedSessions.all.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-info-bg)]/60 border-[var(--color-warning)]/25">
          <CardContent className="p-3">
            <p className="text-[10px] text-[var(--color-warning)] font-medium mb-0.5">
              Upcoming
            </p>
            <p className="text-xl font-bold text-[var(--color-warning)] leading-none tabular-nums">
              {categorizedSessions.upcoming.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-success-bg)]/60 border-[var(--color-success)]/25">
          <CardContent className="p-3">
            <p className="text-[10px] text-[var(--color-success)] font-medium mb-0.5">
              Completed
            </p>
            <p className="text-xl font-bold text-[var(--color-success)] leading-none tabular-nums">
              {categorizedSessions.completed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayedSessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No sessions
              </p>
              <p className="text-xs text-muted-foreground">
                Try changing filter criteria to see matching sessions
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {displayedSessions.map((session, index) => (
                <div
                  key={session.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <SessionCard
                    session={session}
                    userRole={userRole}
                    userInstantId={userInstantId}
                    onClick={() => {
                      // TODO: Open session detail modal
                    }}
                  />
                </div>
              ))}
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

      {/* Create Session Modal */}
      <CreateSessionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
