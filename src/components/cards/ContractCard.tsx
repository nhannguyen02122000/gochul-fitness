// src/components/cards/ContractCard.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Calendar,
  User,
  Plus,
  Crown,
  Zap,
  Heart,
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
  const [activationDialogOpen, setActivationDialogOpen] = useState(false)
  const { mutate: updateStatus } = useUpdateContractStatus()

  // Computed activation dates for the Case 2 dialog (derived from contract, not Date.now in render)
  const [activationDates, setActivationDates] = useState<{
    originalStart: number
    originalEnd: number
    newStart: number
    newEnd: number
  } | null>(null)

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
  const showCustomerField = !userRole || userRole === 'ADMIN' || userRole === 'STAFF'
  const showStaffField = !userRole || userRole === 'ADMIN' || userRole === 'CUSTOMER'

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

  const actionButtons = shouldShowButtons && userRole
    ? getContractActionButtons(contract.status, userRole, contract.end_date)
    : []


  // Normalize a timestamp to midnight (00:00:00) in local time for date-only comparison
  const normalizeToMidnight = (ts: number): number => {
    const d = new Date(ts)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  const handleStatusChange = (newStatus: ContractStatus) => {
    // CUSTOMER activating their own contract: check if dates need to shift
    if (
      userRole === 'CUSTOMER' &&
      newStatus === 'ACTIVE' &&
      contract.status === 'NEWLY_CREATED'
    ) {
      // eslint-disable-next-line react-hooks/purity -- event handler, not called during render
      const now = Date.now()
      const todayMidnight = normalizeToMidnight(now)
      const contractStartMidnight = normalizeToMidnight(contract.start_date ?? now)

      if (todayMidnight === contractStartMidnight) {
        // Case 1: today equals contract start_date — activate silently, original dates unchanged
        executeStatusChange(newStatus)
      } else {
        // Case 2: today ≠ start_date — compute new dates and show confirmation dialog
        const originalStart = contract.start_date ?? now
        const originalEnd = contract.end_date ?? now
        const originalDuration = originalEnd - originalStart

        setActivationDates({
          originalStart,
          originalEnd,
          newStart: now,
          newEnd: now + originalDuration,
        })
        setActivationDialogOpen(true)
      }
    } else {
      executeStatusChange(newStatus)
    }
  }

  const executeStatusChange = (
    newStatus: ContractStatus,
    startDateOverride?: number,
    endDateOverride?: number
  ) => {
    setLoadingStatus(newStatus)
    updateStatus(
      {
        contract_id: contract.id,
        status: newStatus,
        ...(startDateOverride !== undefined && { start_date: startDateOverride }),
        ...(endDateOverride !== undefined && { end_date: endDateOverride }),
      },
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
            {showCustomerField && (
              <div className="flex items-center gap-2.5 py-1.5">
                <div className="w-7 h-7 rounded-md bg-[var(--color-pt-bg)] flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-[var(--color-pt)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Customer</p>
                  <p className="text-xs font-medium text-foreground truncate">{customerName}</p>
                </div>
              </div>
            )}

            {/* Staff */}
            {showStaffField && (
              <div className="flex items-center gap-2.5 py-1.5">
                <div className="w-7 h-7 rounded-md bg-[var(--color-success-bg)] flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-[var(--color-success)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Staff</p>
                  <p className="text-xs font-medium text-foreground truncate">{salesPerson}</p>
                </div>
              </div>
            )}

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
                      if (button.type === 'danger') {
                        // ADMIN/STAFF/CUSTOMER Cancel: open confirmation dialog, do NOT call API yet
                        setConfirmDialogOpen(true)
                      } else {
                        // CUSTOMER Activate: handleStatusChange checks dates and may show dialog
                        handleStatusChange(button.nextStatus as ContractStatus)
                      }
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

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy hợp đồng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy hợp đồng này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDialogOpen(false)
                executeStatusChange('CANCELED')
              }}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Xác nhận hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activation Date Confirmation Dialog — Case 2 only (CUSTOMER, today ≠ start_date) */}
      {activationDialogOpen && activationDates && (
        <Dialog open={activationDialogOpen} onOpenChange={setActivationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận kích hoạt hợp đồng</DialogTitle>
              <DialogDescription>
                Ngày bắt đầu của hợp đồng sẽ được thay đổi để phù hợp với ngày hiện tại.
                Vui lòng xác nhận các ngày mới bên dưới.
              </DialogDescription>
            </DialogHeader>

            {/* Date comparison */}
            <div className="space-y-3 py-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Ngày bắt đầu</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-0.5 p-2.5 rounded-lg border border-muted bg-muted/30">
                    <span className="text-muted-foreground text-[10px]">Hiện tại</span>
                    <span className="font-medium">{formatDate(activationDates.originalStart)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2.5 rounded-lg border border-[var(--color-cta)] bg-[var(--color-cta)]/5">
                    <span className="text-[var(--color-cta)] text-[10px] font-medium">Sẽ thay đổi thành</span>
                    <span className="font-medium text-[var(--color-cta)]">{formatDate(activationDates.newStart)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Ngày kết thúc</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-0.5 p-2.5 rounded-lg border border-muted bg-muted/30">
                    <span className="text-muted-foreground text-[10px]">Hiện tại</span>
                    <span className="font-medium">{formatDate(activationDates.originalEnd)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2.5 rounded-lg border border-[var(--color-cta)] bg-[var(--color-cta)]/5">
                    <span className="text-[var(--color-cta)] text-[10px] font-medium">Sẽ thay đổi thành</span>
                    <span className="font-medium text-[var(--color-cta)]">{formatDate(activationDates.newEnd)}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setActivationDialogOpen(false)
                  setActivationDates(null)
                }}
                disabled={loadingStatus !== null}
              >
                Hủy
              </Button>
              <Button
                className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
                disabled={loadingStatus !== null}
                onClick={() => {
                  setActivationDialogOpen(false)
                  executeStatusChange('ACTIVE', activationDates.newStart, activationDates.newEnd)
                  setActivationDates(null)
                }}
              >
                {loadingStatus === 'ACTIVE' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Đang kích hoạt…
                  </>
                ) : (
                  'Xác nhận kích hoạt'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
