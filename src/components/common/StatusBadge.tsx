// src/components/common/StatusBadge.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import type { ContractStatus, HistoryStatus } from '@/app/type/api'
import {
  getContractStatusText,
  getContractStatusVariant,
  getHistoryStatusText,
  getHistoryStatusVariant
} from '@/utils/statusUtils'
import { cn } from '@/lib/utils'

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

  return (
    <Badge
      variant={variant}
      className={cn(
        'text-[11px] font-medium px-2 py-0.5 border-0',
        variantClassName,
        className
      )}
    >
      {text}
    </Badge>
  )
}
