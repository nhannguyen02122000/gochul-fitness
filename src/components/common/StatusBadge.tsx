// src/components/common/StatusBadge.tsx
'use client'

import { Badge } from 'antd'
import type { ContractStatus, HistoryStatus } from '@/app/type/api'
import { 
  getContractStatusText, 
  getContractStatusColor,
  getHistoryStatusText,
  getHistoryStatusColor
} from '@/utils/statusUtils'

interface StatusBadgeProps {
  status: ContractStatus | HistoryStatus
  type: 'contract' | 'history'
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  const text = type === 'contract' 
    ? getContractStatusText(status as ContractStatus)
    : getHistoryStatusText(status as HistoryStatus)
  
  const color = type === 'contract'
    ? getContractStatusColor(status as ContractStatus)
    : getHistoryStatusColor(status as HistoryStatus)

  return (
    <Badge 
      status={color as any} 
      text={text}
      className="text-sm"
    />
  )
}

