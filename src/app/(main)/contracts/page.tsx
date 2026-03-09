// src/app/contracts/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  Ban,
  Loader2,
  Inbox,
} from 'lucide-react'
import { useInfiniteContracts } from '@/hooks/useContracts'
import ContractCard from '@/components/cards/ContractCard'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GetUserInformationResponse, Contract } from '@/app/type/api'
import CreateContractModal from '@/components/modals/CreateContractModal'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function ContractsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
  })

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteContracts(10)

  const userRole =
    userInfo && 'role' in userInfo ? userInfo.role : undefined
  const userInstantId =
    userInfo && 'instantUser' in userInfo
      ? userInfo.instantUser?.[0]?.id
      : undefined
  const isStaffOrAdmin = userRole === 'ADMIN' || userRole === 'STAFF'

  const allContracts =
    data?.pages.flatMap((page) =>
      'contracts' in page ? page.contracts : []
    ) || []

  // Filter out NEWLY_CREATED contracts for CUSTOMER role
  const visibleContracts =
    userRole === 'CUSTOMER'
      ? allContracts.filter((c) => c.status !== 'NEWLY_CREATED')
      : allContracts

  // Group contracts by status
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
      all: visibleContracts,
      active: visibleContracts.filter(
        (c) => c.status === 'ACTIVE' && hasAvailableCredits(c)
      ),
      pending: visibleContracts.filter(
        (c) =>
          c.status === 'NEWLY_CREATED' ||
          c.status === 'CUSTOMER_REVIEW' ||
          c.status === 'CUSTOMER_CONFIRMED'
      ),
      inactive: visibleContracts.filter(
        (c) =>
          c.status === 'EXPIRED' ||
          c.status === 'CANCELED' ||
          (c.status === 'ACTIVE' && !hasAvailableCredits(c))
      ),
    }
  }, [visibleContracts])

  const filteredContracts =
    contractsByStatus[activeTab as keyof typeof contractsByStatus] || []

  const emptyMessages: Record<string, { title: string; subtitle: string }> = {
    all: {
      title: 'No contracts found',
      subtitle: 'Create your first contract to get started',
    },
    active: {
      title: 'No active contracts',
      subtitle: 'Active contracts will appear here',
    },
    pending: {
      title: 'No pending contracts',
      subtitle: 'Contracts awaiting review will appear here',
    },
    inactive: {
      title: 'No inactive contracts',
      subtitle: 'Expired or canceled contracts will appear here',
    },
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-xl font-bold text-foreground mb-1">Contracts</h1>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-3 mb-5 animate-fade-in">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total</p>
            <p className="text-xl font-bold text-foreground leading-none tabular-nums">
              {contractsByStatus.all.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="p-3">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">
              Active
            </p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none tabular-nums">
              {contractsByStatus.active.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="p-3">
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-0.5">
              Pending
            </p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 leading-none tabular-nums">
              {contractsByStatus.pending.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as string)}
        >
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">
              All
              <span className="ml-1 text-[10px] opacity-60">
                {contractsByStatus.all.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              Active
              <span className="ml-1 text-[10px] opacity-60">
                {contractsByStatus.active.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pending
              <span className="ml-1 text-[10px] opacity-60">
                {contractsByStatus.pending.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">
              Inactive
              <span className="ml-1 text-[10px] opacity-60">
                {contractsByStatus.inactive.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
        ) : filteredContracts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {emptyMessages[activeTab]?.title || 'No contracts'}
              </p>
              <p className="text-xs text-muted-foreground">
                {emptyMessages[activeTab]?.subtitle || ''}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {filteredContracts.map((contract, index) => (
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
