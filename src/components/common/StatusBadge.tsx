// src/components/common/StatusBadge.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import type { ContractStatus, HistoryStatus } from '@/app/type/api'
import {
  getContractStatusText,
  getContractStatusVariant,
  getHistoryStatusText,
  getHistoryStatusVariant,
  CONTRACT_STATUS_ICON,
  HISTORY_STATUS_ICON,
} from '@/utils/statusUtils'
import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'

type IconName = keyof typeof LucideIcons

function StatusIcon({ name, className }: { name: string; className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[name] as React.ComponentType<{ className?: string }>
  if (!Icon) return null
  return <Icon className={cn('shrink-0', className)} />
}

interface StatusBadgeProps {
  status: ContractStatus | HistoryStatus
  type: 'contract' | 'history'
  className?: string
}

export default function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const text = type === 'contract'
    ? getContractStatusText(status as ContractStatus)
    : getHistoryStatusText(status as HistoryStatus)

  const { variant, className: variantClassName } = type === 'contract'
    ? getContractStatusVariant(status as ContractStatus)
    : getHistoryStatusVariant(status as HistoryStatus)

  const iconName = type === 'contract'
    ? CONTRACT_STATUS_ICON[status as ContractStatus]
    : HISTORY_STATUS_ICON[status as HistoryStatus]

  return (
    <Badge
      variant={variant}
      role="status"
      aria-label={text}
      className={cn(
        'text-[11px] font-medium px-2 py-0.5 border-0 gap-1',
        variantClassName,
        className
      )}
    >
      {iconName && (
        <StatusIcon
          name={iconName}
          className="h-3 w-3"
        />
      )}
      {text}
    </Badge>
  )
}
