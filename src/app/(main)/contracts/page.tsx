// src/app/contracts/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useInfiniteContracts } from '@/hooks/useContracts'
import ContractCard from '@/components/cards/ContractCard'
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  GetUserInformationResponse,
  Contract,
  ContractFilters,
  ContractKind,
  ContractStatus,
} from '@/app/type/api'
import CreateContractModal from '@/components/modals/CreateContractModal'
import { cn } from '@/lib/utils'

const CONTRACT_KINDS: { value: ContractKind; label: string }[] = [
  { value: 'PT', label: 'Personal Training' },
  { value: 'REHAB', label: 'Rehabilitation' },
  { value: 'PT_MONTHLY', label: 'PT Monthly' },
]

const CONTRACT_STATUSES: { value: ContractStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'NEWLY_CREATED', label: 'Newly Created' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELED', label: 'Canceled' },
]

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

export default function ContractsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Filters
  const [saleByName, setSaleByName] = useState('')
  const [purchasedByName, setPurchasedByName] = useState('')
  const [kind, setKind] = useState<ContractKind | 'ALL'>('ALL')
  const [statuses, setStatuses] = useState<ContractStatus[]>([])
  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()

  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const debouncedSaleByName = useDebouncedValue(saleByName, 300)
  const debouncedPurchasedByName = useDebouncedValue(purchasedByName, 300)

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
  const isStaffOrAdmin = userRole === 'ADMIN' || userRole === 'STAFF'

  const availableStatuses = CONTRACT_STATUSES

  const effectiveStatuses = statuses

  const filters = useMemo<ContractFilters>(() => {
    const next: ContractFilters = {
      statuses: effectiveStatuses,
      start_date: startOfDayTimestamp(fromDate),
      end_date: endOfDayTimestamp(toDate),
    }

    if (kind !== 'ALL') {
      next.kind = kind
    }

    if (userRole === 'ADMIN' || userRole === 'CUSTOMER') {
      if (debouncedSaleByName.trim()) {
        next.sale_by_name = debouncedSaleByName.trim()
      }
    }

    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      if (debouncedPurchasedByName.trim()) {
        next.purchased_by_name = debouncedPurchasedByName.trim()
      }
    }

    return next
  }, [
    statuses,
    fromDate,
    toDate,
    kind,
    userRole,
    debouncedSaleByName,
    debouncedPurchasedByName,
  ])


  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteContracts(10, filters)

  const allContracts = useMemo(
    () =>
      data?.pages.flatMap((page) =>
        'contracts' in page ? page.contracts : []
      ) || [],
    [data]
  )

  const contractsByStatus = useMemo(() => {
    const hasAvailableCredits = (contract: Contract) => {
      const hasCreditsField =
        contract.kind === 'PT' || contract.kind === 'REHAB'
      if (!hasCreditsField) return true
      if (!contract.credits) return false
      const usedCredits = contract.used_credits || 0
      return usedCredits < contract.credits
    }

    return {
      total: allContracts.length,
      active: allContracts.filter(
        (c) => c.status === 'ACTIVE' && hasAvailableCredits(c)
      ).length,
      pending: allContracts.filter(
        (c) => c.status === 'NEWLY_CREATED'
      ).length,
      inactive: allContracts.filter(
        (c) =>
          c.status === 'EXPIRED' ||
          c.status === 'CANCELED' ||
          (c.status === 'ACTIVE' && !hasAvailableCredits(c))
      ).length,
    }
  }, [allContracts])

  const toggleStatus = (status: ContractStatus) => {
    setStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    )
  }

  const resetFilters = () => {
    setSaleByName('')
    setPurchasedByName('')
    setKind('ALL')
    setStatuses([])
    setFromDate(undefined)
    setToDate(undefined)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0

    if ((userRole === 'ADMIN' || userRole === 'CUSTOMER') && saleByName.trim()) {
      count += 1
    }

    if ((userRole === 'ADMIN' || userRole === 'STAFF') && purchasedByName.trim()) {
      count += 1
    }

    if (kind !== 'ALL') {
      count += 1
    }

    if (fromDate) {
      count += 1
    }

    if (toDate) {
      count += 1
    }

    if (effectiveStatuses.length > 0) {
      count += 1
    }

    return count
  }, [userRole, saleByName, purchasedByName, kind, fromDate, toDate, effectiveStatuses])


  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold text-foreground">Contracts</h1>
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
          Manage and track all your contracts
        </p>
      </div>

      {/* Create Contract Button - ADMIN/STAFF only */}
      {isStaffOrAdmin && (
        <div className="px-4 mt-3 mb-4 animate-slide-up">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="w-full h-12 text-sm font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Contract
          </Button>
        </div>
      )}

      <Dialog open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/20 supports-backdrop-filter:backdrop-blur-0 data-open:fade-in-0 data-closed:fade-out-0 duration-300"
          className="top-auto left-0 right-0 bottom-0 translate-x-0 translate-y-0 max-w-none rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-w-none max-h-[85dvh] overflow-hidden flex flex-col transition-transform duration-300 ease-out data-open:animate-none data-closed:animate-none data-open:translate-y-0 data-closed:translate-y-full"
        >
          <DialogHeader className="px-0 pt-0 pb-2">
            <DialogTitle>Filter contracts</DialogTitle>
            <DialogDescription>
              Apply filters to refine contract list
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-3">
            <div className="grid grid-cols-1 gap-3">
              {(userRole === 'ADMIN' || userRole === 'CUSTOMER') && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Sale by</Label>
                  <Input
                    value={saleByName}
                    onChange={(e) => setSaleByName(e.target.value)}
                    placeholder="Type staff name"
                  />
                </div>
              )}

              {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Purchased by</Label>
                  <Input
                    value={purchasedByName}
                    onChange={(e) => setPurchasedByName(e.target.value)}
                    placeholder="Type customer name"
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

              <div className="space-y-1.5">
                <Label className="text-xs">Kind</Label>
                <Select value={kind} onValueChange={(val) => setKind(val as ContractKind | 'ALL')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select kind" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All kinds</SelectItem>
                    {CONTRACT_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger
                    render={<Button variant="outline" />}
                    className="w-full justify-between text-sm font-normal"
                  >
                    {effectiveStatuses.length === 0 ? 'No status selected' : `${effectiveStatuses.length} selected`}
                    <span className="text-xs text-muted-foreground">Multi-select</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandEmpty>No statuses</CommandEmpty>
                        <CommandGroup>
                          {availableStatuses.map((option) => {
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
              {contractsByStatus.total}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-success-bg)]/60 border-[var(--color-success)]/25">
          <CardContent className="p-3">
            <p className="text-[10px] text-[var(--color-success)] font-medium mb-0.5">
              Active
            </p>
            <p className="text-xl font-bold text-[var(--color-success)] leading-none tabular-nums">
              {contractsByStatus.active}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-warning-bg)]/70 border-[var(--color-warning)]/25">
          <CardContent className="p-3">
            <p className="text-[10px] text-[var(--color-warning)] font-medium mb-0.5">
              Pending
            </p>
            <p className="text-xl font-bold text-[var(--color-warning)] leading-none tabular-nums">
              {contractsByStatus.pending}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : allContracts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No contracts found
              </p>
              <p className="text-xs text-muted-foreground">
                Try changing filter criteria to see matching contracts
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {allContracts.map((contract, index) => (
                <div
                  key={contract.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ContractCard
                    contract={contract}
                    userRole={userRole}
                    userInstantId={userInstantId}
                    onClick={() => {
                      // TODO: Open contract detail modal
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

      {/* Create Contract Modal */}
      <CreateContractModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
