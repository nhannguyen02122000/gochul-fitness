// src/components/cards/ContractCard.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Calendar,
  User,
  Mail,
  Plus,
  Crown,
  Zap,
  Heart,
  Eye,
  Loader2,
  DollarSign
} from 'lucide-react'
import type { Contract, Role, ContractStatus } from '@/app/type/api'
import StatusBadge from '@/components/common/StatusBadge'
import { formatDate } from '@/utils/timeUtils'
import { formatVND } from '@/utils/currencyUtils'
import { getContractActionButtons, shouldShowContractActionButtons } from '@/utils/statusUtils'
import { useUpdateContractStatus } from '@/hooks/useContracts'
import { useState } from 'react'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import SessionHistoryModal from '@/components/modals/SessionHistoryModal'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function getCurrentTimestamp() {
  return Date.now()
}

interface ContractCardProps {
  contract: Contract
  onClick?: () => void
  showActions?: boolean
  userRole?: Role
  userInstantId?: string
  onStatusChange?: (contractId: string, newStatus: ContractStatus) => void
  onSessionCreated?: () => void
}

const kindConfig: Record<string, { label: string; icon: typeof DollarSign; color: string; bg: string; border: string }> = {
  'PT': {
    label: 'Personal Training',
    icon: Crown,
    color: 'text-[var(--color-pt)]',
    bg: 'bg-[var(--color-pt-bg)]',
    border: 'border-l-[var(--color-pt)]',
  },
  'REHAB': {
    label: 'Rehabilitation',
    icon: Heart,
    color: 'text-[var(--color-rehab)]',
    bg: 'bg-[var(--color-rehab-bg)]',
    border: 'border-l-[var(--color-rehab)]',
  },
  'PT_MONTHLY': {
    label: 'PT Monthly',
    icon: Zap,
    color: 'text-[var(--color-pt-monthly)]',
    bg: 'bg-[var(--color-pt-monthly-bg)]',
    border: 'border-l-[var(--color-pt-monthly)]',
  }
}

export default function ContractCard({
  contract,
  onClick,
  showActions = true,
  userRole,
  userInstantId,
  onStatusChange,
  onSessionCreated
}: ContractCardProps) {
  const [loadingStatus, setLoadingStatus] = useState<ContractStatus | null>(null)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingActivation, setPendingActivation] = useState<{
    newStartDate: number
    newEndDate: number
    durationDays: number
  } | null>(null)
  const { mutate: updateStatus } = useUpdateContractStatus()

  // Get customer info
  const purchasedByUser = contract.purchased_by_user?.[0]
  const customerUserSetting = purchasedByUser?.user_setting?.[0]
  const customerName = customerUserSetting
    ? [customerUserSetting.first_name, customerUserSetting.last_name]
      .filter(Boolean)
      .join(' ') || purchasedByUser?.email || 'Unknown Customer'
    : purchasedByUser?.email || 'Unknown Customer'
  const customerEmail = purchasedByUser?.email || 'N/A'

  // Get sales person info
  const saleByUser = contract.sale_by_user?.[0]
  const salesUserSetting = saleByUser?.user_setting?.[0]
  const salesPerson = salesUserSetting
    ? [salesUserSetting.first_name, salesUserSetting.last_name]
      .filter(Boolean)
      .join(' ') || saleByUser?.email || 'Unknown'
    : saleByUser?.email || 'Unknown'

  const kind = kindConfig[contract.kind] || {
    label: contract.kind,
    icon: DollarSign,
    color: 'text-zinc-700',
    bg: 'bg-zinc-50',
    border: 'border-l-zinc-400',
  }
  const KindIcon = kind.icon
  const hasCreditLimit = contract.kind === 'PT' || contract.kind === 'REHAB'
  const shouldShowUsedCredits = hasCreditLimit || contract.kind === 'PT_MONTHLY'

  // Action buttons logic
  const shouldShowButtons = showActions &&
    userRole &&
    userInstantId &&
    shouldShowContractActionButtons(contract, userRole, userInstantId)

  const actionButtons = shouldShowButtons
    ? getContractActionButtons(contract.status, userRole!)
    : []

  const handleStatusChange = (newStatus: ContractStatus) => {
    if (newStatus === 'ACTIVE' && contract.start_date && contract.end_date) {
      const now = getCurrentTimestamp()
      if (now < contract.start_date) {
        const contractDuration = contract.end_date - contract.start_date
        const newStartDate = now
        const newEndDate = now + contractDuration
        const durationDays = Math.ceil(contractDuration / (1000 * 60 * 60 * 24))
        setPendingActivation({ newStartDate, newEndDate, durationDays })
        setConfirmDialogOpen(true)
        return
      }
    }
    executeStatusChange(newStatus)
  }

  const executeStatusChange = (newStatus: ContractStatus) => {
    setLoadingStatus(newStatus)
    updateStatus(
      { contract_id: contract.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Contract status updated to ${newStatus}`)
          setLoadingStatus(null)
          onStatusChange?.(contract.id, newStatus)
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update contract status')
          setLoadingStatus(null)
        }
      }
    )
  }

  const handleSessionModalClose = () => {
    setIsSessionModalOpen(false)
    onSessionCreated?.()
  }

  const hasAvailableCredits = !hasCreditLimit ||
    (contract.credits && (contract.used_credits || 0) < contract.credits)

  const shouldShowCreateSession = contract.status === 'ACTIVE' &&
    hasAvailableCredits &&
    (
      (userRole === 'CUSTOMER' && contract.purchased_by === userInstantId) ||
      userRole === 'ADMIN' ||
      userRole === 'STAFF'
    )

  return (
    <>
      <Card
        className={cn(
          'w-full overflow-hidden border-l-4 animate-fade-in transition-shadow hover:shadow-md cursor-default',
          kind.border,
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn('w-8 h-8 rounded-md flex items-center justify-center shrink-0', kind.bg)}>
                  <KindIcon className={cn('h-4 w-4', kind.color)} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-xs font-semibold', kind.color)}>{kind.label}</p>
                  <StatusBadge status={contract.status} type="contract" className="mt-0.5" />
                </div>
              </div>

              {/* Credits badge */}
              {shouldShowUsedCredits && (
                <Tooltip>
                  <TooltipTrigger
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsHistoryModalOpen(true)
                    }}
                    className={cn(
                      'flex flex-col items-center px-2.5 py-1.5 rounded-md text-xs shrink-0 cursor-pointer transition-colors',
                      kind.bg,
                      'hover:opacity-80'
                    )}
                  >
                    <span className={cn('font-bold tabular-nums', kind.color)}>
                      {hasCreditLimit
                        ? `${contract.used_credits || 0}/${contract.credits || 0}`
                        : `${contract.used_credits || 0}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">used credits</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View session history</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Amount */}
            <p className="text-lg font-bold text-foreground tabular-nums">{formatVND(contract.money)}</p>
          </div>

          {/* Details */}
          <div className="px-4 pb-3 space-y-2">
            {/* Customer */}
            <div className="flex items-center gap-2.5 py-1.5">
              <div className="w-7 h-7 rounded-md bg-[var(--color-pt-bg)] flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-[var(--color-pt)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Customer</p>
                <p className="text-xs font-medium text-foreground truncate">{customerName}</p>
              </div>
            </div>

            {/* Sales */}
            <div className="flex items-center gap-2.5 py-1.5">
              <div className="w-7 h-7 rounded-md bg-[var(--color-success-bg)] flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-[var(--color-success)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Sales Rep</p>
                <p className="text-xs font-medium text-foreground truncate">{salesPerson}</p>
              </div>
            </div>

            {/* Date Range */}
            {contract.start_date && (
              <div className="flex items-center gap-2.5 py-1.5">
                <div className="w-7 h-7 rounded-md bg-[var(--color-warning-bg)] flex items-center justify-center shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-[var(--color-warning)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Duration</p>
                  <p className="text-xs font-medium text-foreground truncate">
                    {formatDate(contract.start_date)} → {contract.end_date ? formatDate(contract.end_date) : 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {(actionButtons.length > 0 || shouldShowCreateSession) && (
            <div className="px-4 pb-4 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {actionButtons.map((button) => (
                  <Button
                    key={button.nextStatus}
                    variant={button.type === 'danger' ? 'destructive' : button.type === 'primary' ? 'default' : 'outline'}
                    size="default"
                    disabled={loadingStatus !== null && loadingStatus !== button.nextStatus}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange(button.nextStatus as ContractStatus)
                    }}
                    className={cn(
                      'flex-1 min-w-[100px] text-sm h-10',
                      button.type === 'primary' && 'bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]'
                    )}
                  >
                    {loadingStatus === button.nextStatus && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {button.label}
                  </Button>
                ))}
                {shouldShowCreateSession && (
                  <Button
                    size="default"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsSessionModalOpen(true)
                    }}
                    className="flex-1 min-w-[100px] text-sm h-10 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Session
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Activation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contract Date Adjustment</AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-3 text-sm">
              <p>You are activating this contract before its scheduled start date.</p>
              <div>
                <p className="font-medium text-foreground">Current dates:</p>
                <p>Start: {contract.start_date && formatDate(contract.start_date)}</p>
                <p>End: {contract.end_date && formatDate(contract.end_date)}</p>
              </div>
              {pendingActivation && (
                <>
                  <div>
                    <p className="font-medium text-foreground">New dates:</p>
                    <p>Start: {formatDate(pendingActivation.newStartDate)} (Today)</p>
                    <p>End: {formatDate(pendingActivation.newEndDate)}</p>
                  </div>
                  <p className="text-[var(--color-success)] font-medium">
                    Duration unchanged: {pendingActivation.durationDays} days
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDialogOpen(false)
                executeStatusChange('ACTIVE')
              }}
              className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
            >
              Confirm & Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Session Modal */}
      <CreateSessionModal
        open={isSessionModalOpen}
        onClose={handleSessionModalClose}
        preselectedContractId={contract.id}
      />

      {/* Session History Modal */}
      <SessionHistoryModal
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        contractId={contract.id}
        contractKind={contract.kind}
        totalCredits={contract.credits}
        usedCredits={contract.used_credits}
      />
    </>
  )
}
