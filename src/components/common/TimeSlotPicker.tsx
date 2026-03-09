// src/components/common/TimeSlotPicker.tsx
'use client'

import { useMemo } from 'react'
import { getTimeSlots90Min, checkSlotOverlap, isSlotInPast } from '@/utils/timeUtils'
import type { OccupiedSlot } from '@/app/type/api'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface TimeSlotPickerProps {
  selectedFrom?: number
  selectedTo?: number
  occupiedSlots?: OccupiedSlot[]
  date?: number
  onSelect?: (from: number, to: number) => void
  disabled?: boolean
  loading?: boolean
}

export default function TimeSlotPicker({
  selectedFrom,
  selectedTo,
  occupiedSlots = [],
  date,
  onSelect,
  disabled = false,
  loading = false
}: TimeSlotPickerProps) {
  const slots = useMemo(() => getTimeSlots90Min(), [])

  const handleSlotClick = (from: number, to: number) => {
    if (disabled || loading) return
    onSelect?.(from, to)
  }

  const getSlotState = (slotFrom: number, slotTo: number) => {
    const isSelected = selectedFrom === slotFrom && selectedTo === slotTo
    const isPast = date ? isSlotInPast(date, slotFrom) : false
    const isOccupied = checkSlotOverlap(slotFrom, slotTo, occupiedSlots)
    return { isSelected, isPast, isOccupied }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const { isSelected, isOccupied, isPast } = getSlotState(slot.from, slot.to)
          const isDisabled = disabled || isOccupied || isPast

          return (
            <button
              key={`${slot.from}-${slot.to}`}
              type="button"
              onClick={() => !isDisabled && handleSlotClick(slot.from, slot.to)}
              disabled={isDisabled}
              className={cn(
                'relative flex items-center justify-center h-12 rounded-md border text-sm font-medium transition-colors',
                isSelected && 'bg-[var(--color-cta)] text-white border-[var(--color-cta)] shadow-sm',
                !isSelected && !isDisabled && 'bg-white text-foreground border-border hover:border-[var(--color-cta)] hover:bg-blue-50/50 cursor-pointer',
                isDisabled && !isSelected && 'bg-muted text-muted-foreground border-border cursor-not-allowed',
                isOccupied && !isSelected && 'bg-striped'
              )}
            >
              {slot.label}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-white border border-border rounded-sm" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[var(--color-cta)] rounded-sm" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-muted bg-striped border border-border rounded-sm" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-muted border border-border rounded-sm" />
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  )
}
