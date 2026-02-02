// src/components/common/TimeSlotPicker.tsx
'use client'

import { useMemo } from 'react'
import { getTimeSlots90Min, checkSlotOverlap, isSlotInPast } from '@/utils/timeUtils'
import type { OccupiedSlot } from '@/app/type/api'

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

  // Debug logging
  console.log('TimeSlotPicker render:', {
    occupiedSlotsCount: occupiedSlots.length,
    occupiedSlots,
    date: date ? new Date(date).toISOString() : 'none',
    selectedFrom,
    selectedTo
  })

  const handleSlotClick = (from: number, to: number) => {
    if (disabled || loading) return
    onSelect?.(from, to)
  }

  const getSlotState = (slotFrom: number, slotTo: number) => {
    // Check if selected
    const isSelected = selectedFrom === slotFrom && selectedTo === slotTo

    // Check if in the past
    const isPast = date ? isSlotInPast(date, slotFrom) : false

    // Check if occupied
    const isOccupied = checkSlotOverlap(slotFrom, slotTo, occupiedSlots)

    return { isSelected, isPast, isOccupied }
  }

  const getSlotClassName = (slotFrom: number, slotTo: number) => {
    const { isSelected, isPast, isOccupied } = getSlotState(slotFrom, slotTo)

    const baseClasses = 'relative flex items-center justify-center h-14 rounded-lg border-2 transition-all duration-200 text-sm font-medium'

    if (isSelected) {
      return `${baseClasses} bg-blue-500 text-white border-blue-600 shadow-md`
    }

    if (isPast || isOccupied || disabled) {
      const bgPattern = isOccupied 
        ? 'bg-gray-200 bg-striped' 
        : 'bg-gray-100'
      return `${baseClasses} ${bgPattern} text-gray-400 border-gray-300 cursor-not-allowed`
    }

    return `${baseClasses} bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {slots.map((slot) => {
          const { isOccupied, isPast } = getSlotState(slot.from, slot.to)
          const isDisabled = disabled || isOccupied || isPast

          return (
            <button
              key={`${slot.from}-${slot.to}`}
              type="button"
              onClick={() => !isDisabled && handleSlotClick(slot.from, slot.to)}
              disabled={isDisabled}
              className={getSlotClassName(slot.from, slot.to)}
            >
              {slot.label}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 border-2 border-blue-600 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 bg-striped border-2 border-gray-300 rounded"></div>
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
          <span>Unavailable</span>
        </div>
      </div>

      <style jsx>{`
        .bg-striped {
          background-image: repeating-linear-gradient(
            45deg,
            #e5e7eb,
            #e5e7eb 10px,
            #f3f4f6 10px,
            #f3f4f6 20px
          );
        }
      `}</style>
    </div>
  )
}

