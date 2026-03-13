// src/components/cards/SessionCard.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Clock,
  User,
  Crown,
  Heart,
  Zap,
  Loader2,
  FileText,
  Pencil,
} from 'lucide-react'
import type { History, Role, HistoryStatus } from '@/app/type/api'
import StatusBadge from '@/components/common/StatusBadge'
import { formatTimeRange } from '@/utils/timeUtils'
import { getHistoryActionButtons, shouldShowHistoryActionButtons } from '@/utils/statusUtils'
import { useUpdateHistoryNote, useUpdateHistoryStatus } from '@/hooks/useHistory'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SessionCardProps {
  session: History
  onClick?: () => void
  userRole?: Role
  userInstantId?: string
  onStatusChange?: (sessionId: string, newStatus: HistoryStatus) => void
}

function checkIfUpcoming(sessionDate: number, sessionFrom: number, status: string): boolean {
  const sessionDateTime = sessionDate + (sessionFrom * 60 * 1000)
  return sessionDateTime > Date.now() && status !== 'CANCELED' && status !== 'EXPIRED'
}

const kindConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  'PT': {
    label: 'PT Session',
    icon: Crown,
    color: 'text-[var(--color-pt)]',
    bg: 'bg-[var(--color-pt-bg)]',
  },
  'REHAB': {
    label: 'Rehab Session',
    icon: Heart,
    color: 'text-[var(--color-rehab)]',
    bg: 'bg-[var(--color-rehab-bg)]',
  },
  'PT_MONTHLY': {
    label: 'PT Monthly',
    icon: Zap,
    color: 'text-[var(--color-pt-monthly)]',
    bg: 'bg-[var(--color-pt-monthly-bg)]',
  }
}

export default function SessionCard({
  session,
  onClick,
  userRole,
  userInstantId,
  onStatusChange
}: SessionCardProps) {
  const [loadingStatus, setLoadingStatus] = useState<HistoryStatus | null>(null)
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false)
  const [isEditingStaffNote, setIsEditingStaffNote] = useState(false)
  const [isEditingCustomerNote, setIsEditingCustomerNote] = useState(false)
  const [staffNote, setStaffNote] = useState(session.staff_note ?? '')
  const [customerNote, setCustomerNote] = useState(session.customer_note ?? '')
  const [staffNoteDraft, setStaffNoteDraft] = useState(session.staff_note ?? '')
  const [customerNoteDraft, setCustomerNoteDraft] = useState(session.customer_note ?? '')
  const [savingNoteType, setSavingNoteType] = useState<'staff' | 'customer' | null>(null)
  const { mutate: updateStatus } = useUpdateHistoryStatus()
  const { mutate: updateNote } = useUpdateHistoryNote()

  // Get contract (it's an array, take first item)
  const contract = Array.isArray(session.contract) ? session.contract[0] : session.contract
  const contractKind = contract?.kind || 'Unknown'

  // Get customer info
  const purchasedByUser = contract?.purchased_by_user?.[0]
  const customerUserSetting = purchasedByUser?.user_setting?.[0]
  const customerName = customerUserSetting
    ? [customerUserSetting.first_name, customerUserSetting.last_name]
      .filter(Boolean)
      .join(' ') || purchasedByUser?.email || 'Unknown Customer'
    : purchasedByUser?.email || 'Unknown Customer'

  // Get trainer info
  const saleByUser = contract?.sale_by_user?.[0]
  const trainerUserSetting = saleByUser?.user_setting?.[0]
  const trainerName = trainerUserSetting
    ? [trainerUserSetting.first_name, trainerUserSetting.last_name]
      .filter(Boolean)
      .join(' ') || saleByUser?.email || 'Unknown Trainer'
    : saleByUser?.email || 'Unknown Trainer'

  const kind = kindConfig[contractKind] || {
    label: contractKind,
    icon: Clock,
    color: 'text-zinc-700',
    bg: 'bg-zinc-50',
  }
  const KindIcon = kind.icon

  const isUpcoming = checkIfUpcoming(session.date, session.from, session.status)

  // Action buttons
  const shouldShowButtons = Boolean(
    userRole &&
    userInstantId &&
    shouldShowHistoryActionButtons(session, userRole, userInstantId)
  )

  const actionButtons = shouldShowButtons
    ? getHistoryActionButtons(session.status, userRole!)
    : []

  const isCustomerOwner = userRole === 'CUSTOMER' && contract?.purchased_by === userInstantId
  const isNewlyCreated = session.status === 'NEWLY_CREATED'
  const canCustomerCheckIn = Boolean(isCustomerOwner && !session.user_check_in_time)
  const canStaffCheckIn = Boolean((userRole === 'STAFF' || userRole === 'ADMIN') && !session.staff_check_in_time)
  const canRequestCheckIn = canCustomerCheckIn || canStaffCheckIn
  const canEditStaffNote = userRole === 'STAFF' || userRole === 'ADMIN'
  const canEditCustomerNote = Boolean(userRole === 'CUSTOMER' && isCustomerOwner)
  const shouldRenderCheckInButton = Boolean(isNewlyCreated && shouldShowButtons)
  const shouldRenderActions = Boolean(isNewlyCreated && shouldShowButtons)
  const hasAnyNote = staffNote.trim().length > 0 || customerNote.trim().length > 0

  useEffect(() => {
    const nextStaffNote = session.staff_note ?? ''
    const nextCustomerNote = session.customer_note ?? ''
    setStaffNote(nextStaffNote)
    setCustomerNote(nextCustomerNote)
    setStaffNoteDraft(nextStaffNote)
    setCustomerNoteDraft(nextCustomerNote)
    setIsEditingStaffNote(false)
    setIsEditingCustomerNote(false)
  }, [session.id, session.staff_note, session.customer_note])

  const handleStatusChange = (newStatus: HistoryStatus) => {
    setLoadingStatus(newStatus)
    updateStatus(
      { history_id: session.id, status: newStatus },
      {
        onSuccess: (response) => {
          toast.success(`Session status updated`)
          setLoadingStatus(null)
          if ('history' in response) {
            onStatusChange?.(session.id, response.history.status)
          }
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update session status')
          setLoadingStatus(null)
        }
      }
    )
  }

  const handleSaveNote = (noteType: 'staff' | 'customer') => {
    const noteValue = noteType === 'staff' ? staffNoteDraft : customerNoteDraft

    setSavingNoteType(noteType)
    updateNote(
      { history_id: session.id, note: noteValue },
      {
        onSuccess: (response) => {
          if ('history' in response) {
            const updatedStaffNote = response.history.staff_note ?? ''
            const updatedCustomerNote = response.history.customer_note ?? ''

            setStaffNote(updatedStaffNote)
            setCustomerNote(updatedCustomerNote)
            setStaffNoteDraft(updatedStaffNote)
            setCustomerNoteDraft(updatedCustomerNote)
          }

          if (noteType === 'staff') {
            setIsEditingStaffNote(false)
          } else {
            setIsEditingCustomerNote(false)
          }

          setSavingNoteType(null)
          toast.success('Note updated')
        },
        onError: (error) => {
          setSavingNoteType(null)
          toast.error(error.message || 'Failed to update note')
        }
      }
    )
  }

  const dateObj = new Date(session.date)
  const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const dayStr = dateObj.getDate()
  const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <Card
      className={cn(
        'w-full overflow-hidden animate-fade-in transition-shadow hover:shadow-md cursor-default',
        isUpcoming && 'ring-1 ring-[var(--color-cta)]/20',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Date column */}
          <div className={cn(
            'flex flex-col items-center justify-center px-3 py-4 min-w-[60px] border-r border-border',
            isUpcoming ? 'bg-[var(--color-info-bg)]' : 'bg-muted/50'
          )}>
            <span className="text-[10px] font-medium text-muted-foreground">{monthStr}</span>
            <span className="text-xl font-bold text-foreground leading-none mt-0.5">{dayStr}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">{weekdayStr}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', kind.bg)}>
                    <KindIcon className={cn('h-3.5 w-3.5', kind.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-semibold leading-tight', kind.color)}>{kind.label}</p>
                    <StatusBadge status={session.status} type="history" className="mt-0.5" />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isUpcoming && (
                    <Badge variant="secondary" className="text-[10px] bg-[var(--color-info-bg)] text-[var(--color-warning)] px-1.5 py-0 border-0">
                      Upcoming
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 relative"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsNoteDrawerOpen(true)
                    }}
                    aria-label="Open session notes"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {hasAnyNote && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--color-cta)]" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{formatTimeRange(session.from, session.to)}</span>
              </div>

              {/* People */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[var(--color-pt-bg)] flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-[var(--color-pt)]" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{customerName}</span>
                  {session.user_check_in_time && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-[var(--color-info-bg)] text-[var(--color-warning)] border-0">
                      Customer checked in
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[var(--color-success-bg)] flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-[var(--color-success)]" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{trainerName}</span>
                  {session.staff_check_in_time && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-[var(--color-success-bg)] text-[var(--color-success)] border-0">
                      Staff checked in
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {shouldRenderActions && (
              <div className="px-3 pb-3 pt-2 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {shouldRenderCheckInButton && (
                    <Button
                      variant="default"
                      size="default"
                      disabled={!canRequestCheckIn || (loadingStatus !== null && loadingStatus !== 'CHECKED_IN')}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange('CHECKED_IN')
                      }}
                      className="flex-1 min-w-[100px] text-sm h-10 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
                    >
                      {loadingStatus === 'CHECKED_IN' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Check-in
                    </Button>
                  )}

                  {actionButtons.map((button) => (
                    <Button
                      key={button.nextStatus}
                      variant={button.type === 'danger' ? 'destructive' : button.type === 'primary' ? 'default' : 'outline'}
                      size="default"
                      disabled={loadingStatus !== null && loadingStatus !== button.nextStatus}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange(button.nextStatus as HistoryStatus)
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
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <Dialog open={isNoteDrawerOpen} onOpenChange={setIsNoteDrawerOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/20 supports-backdrop-filter:backdrop-blur-0 data-open:fade-in-0 data-closed:fade-out-0 duration-300"
          className="top-auto left-0 right-0 bottom-0 translate-x-0 translate-y-0 max-w-none rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-w-none max-h-[85dvh] overflow-hidden flex flex-col transition-transform duration-300 ease-out data-open:animate-none data-closed:animate-none data-open:translate-y-0 data-closed:translate-y-full"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="px-0 pt-0 pb-2">
            <DialogTitle>Session Notes</DialogTitle>
            <DialogDescription>
              Staff and customer notes for this session.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-3 space-y-3">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Staff note</p>
                {canEditStaffNote && !isEditingStaffNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setStaffNoteDraft(staffNote)
                      setIsEditingStaffNote(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditingStaffNote ? (
                <div className="space-y-2">
                  <Textarea
                    value={staffNoteDraft}
                    onChange={(e) => setStaffNoteDraft(e.target.value)}
                    placeholder="Add staff note"
                    className="min-h-[96px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 h-9"
                      onClick={() => {
                        setStaffNoteDraft(staffNote)
                        setIsEditingStaffNote(false)
                      }}
                      disabled={savingNoteType === 'staff'}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-9"
                      onClick={() => handleSaveNote('staff')}
                      disabled={savingNoteType === 'staff'}
                    >
                      {savingNoteType === 'staff' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={cn('text-sm whitespace-pre-wrap', staffNote.trim() ? 'text-foreground' : 'text-muted-foreground')}>
                  {staffNote.trim() ? staffNote : 'No note yet'}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Customer note</p>
                {canEditCustomerNote && !isEditingCustomerNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setCustomerNoteDraft(customerNote)
                      setIsEditingCustomerNote(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditingCustomerNote ? (
                <div className="space-y-2">
                  <Textarea
                    value={customerNoteDraft}
                    onChange={(e) => setCustomerNoteDraft(e.target.value)}
                    placeholder="Add customer note"
                    className="min-h-[96px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 h-9"
                      onClick={() => {
                        setCustomerNoteDraft(customerNote)
                        setIsEditingCustomerNote(false)
                      }}
                      disabled={savingNoteType === 'customer'}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-9"
                      onClick={() => handleSaveNote('customer')}
                      disabled={savingNoteType === 'customer'}
                    >
                      {savingNoteType === 'customer' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={cn('text-sm whitespace-pre-wrap', customerNote.trim() ? 'text-foreground' : 'text-muted-foreground')}>
                  {customerNote.trim() ? customerNote : 'No note yet'}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsNoteDrawerOpen(false)} className="w-full sm:w-auto">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
