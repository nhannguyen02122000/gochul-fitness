// src/components/modals/SessionHistoryModal.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, Crown, Heart, Zap, Trophy, AlertCircle } from 'lucide-react'
import type { ContractKind, History } from '@/app/type/api'
import { useContractHistory } from '@/hooks/useHistory'
import StatusBadge from '@/components/common/StatusBadge'
import { formatTimeRange } from '@/utils/timeUtils'
import { isCompletedHistoryStatus } from '@/utils/statusUtils'
import { useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SessionHistoryModalProps {
  open: boolean
  onClose: () => void
  contractId: string
  contractKind: ContractKind
  totalCredits?: number
  usedCredits?: number
}

const kindConfig: Record<string, { label: string; icon: typeof Crown; color: string; bg: string }> = {
  'PT': { label: 'Personal Training', icon: Crown, color: 'text-violet-700', bg: 'bg-violet-50' },
  'REHAB': { label: 'Rehabilitation', icon: Heart, color: 'text-cyan-700', bg: 'bg-cyan-50' },
  'PT_MONTHLY': { label: 'PT Monthly', icon: Zap, color: 'text-orange-700', bg: 'bg-orange-50' },
}

export default function SessionHistoryModal({
  open,
  onClose,
  contractId,
  contractKind,
  totalCredits,
  usedCredits
}: SessionHistoryModalProps) {
  const { data, isLoading, error, refetch } = useContractHistory(open ? contractId : undefined)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [open])

  const kind = kindConfig[contractKind] || { label: contractKind, icon: Trophy, color: 'text-zinc-700', bg: 'bg-zinc-50' }
  const KindIcon = kind.icon

  const history: History[] = (data && 'history' in data) ? data.history : []
  const contract = (data && 'contract' in data) ? data.contract : null
  const hasCredits = contractKind === 'PT' || contractKind === 'REHAB'

  const stats = useMemo(() => {
    const completed = history.filter((h) => isCompletedHistoryStatus(h.status)).length
    const upcoming = history.filter((h) => {
      const sessionDateTime = h.date + (h.from * 60 * 1000)
      return sessionDateTime > currentTime && h.status !== 'CANCELED' && h.status !== 'EXPIRED'
    }).length
    const remaining = hasCredits && totalCredits ? totalCredits - (usedCredits || 0) : 0
    return { completed, upcoming, remaining }
  }, [history, hasCredits, totalCredits, usedCredits, currentTime])

  const isUpcoming = (sessionDate: number, sessionFrom: number, status: string): boolean => {
    const sessionDateTime = sessionDate + (sessionFrom * 60 * 1000)
    return sessionDateTime > currentTime && status !== 'CANCELED' && status !== 'EXPIRED'
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-md flex items-center justify-center', kind.bg)}>
              <KindIcon className={cn('h-4 w-4', kind.color)} />
            </div>
            <div>
              <DialogTitle>Session History</DialogTitle>
              <DialogDescription>{kind.label}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Credits overview */}
        {hasCredits && totalCredits !== undefined && (
          <div className={cn('mx-5 mb-3 rounded-md px-4 py-3 flex items-center justify-between', kind.bg)}>
            <div>
              <p className="text-sm font-medium text-foreground">{kind.label}</p>
              {contract && <StatusBadge status={contract.status} type="contract" />}
            </div>
            <div className="text-right">
              <p className={cn('text-xl font-bold', kind.color)}>
                {usedCredits || 0} / {totalCredits}
              </p>
              <p className="text-[11px] text-muted-foreground">sessions completed</p>
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-0">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 p-3 rounded-md border border-border">
                  <Skeleton className="w-12 h-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-8 space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-destructive">{error.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          )}

          {!isLoading && !error && history.length === 0 && (
            <div className="text-center py-10">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No sessions yet</p>
              <p className="text-xs text-muted-foreground">Sessions for this contract will appear here</p>
            </div>
          )}

          {!isLoading && !error && history.length > 0 && (
            <div className="space-y-2">
              {history.map((session, index) => {
                const upcoming = isUpcoming(session.date, session.from, session.status)
                const dateObj = new Date(session.date)
                const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                const dayStr = dateObj.getDate()
                const fullDate = dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })

                return (
                  <div
                    key={session.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-md border transition-colors',
                      upcoming ? 'border-[var(--color-cta)]/20 bg-blue-50/50' : 'border-border bg-white'
                    )}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {/* Date badge */}
                    <div className={cn(
                      'w-11 h-11 rounded-md flex flex-col items-center justify-center shrink-0',
                      upcoming ? kind.bg : 'bg-muted'
                    )}>
                      <span className={cn('text-[9px] font-medium', upcoming ? kind.color : 'text-muted-foreground')}>
                        {monthStr}
                      </span>
                      <span className={cn('text-base font-bold leading-none', upcoming ? kind.color : 'text-foreground')}>
                        {dayStr}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">{fullDate}</span>
                        {upcoming && (
                          <Badge variant="secondary" className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0 h-4 border-0">
                            Upcoming
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatTimeRange(session.from, session.to)}</span>
                      </div>
                      <StatusBadge status={session.status} type="history" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary footer */}
        {!isLoading && !error && history.length > 0 && (
          <div className="border-t border-border px-5 py-3 bg-muted/50">
            <p className="text-xs font-semibold text-foreground mb-2">Summary</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{stats.completed}</p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stats.upcoming}</p>
                <p className="text-[10px] text-muted-foreground">Upcoming</p>
              </div>
              {hasCredits && totalCredits !== undefined && (
                <div>
                  <p className="text-lg font-bold text-[var(--color-success)]">{stats.remaining}</p>
                  <p className="text-[10px] text-muted-foreground">Remaining</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
