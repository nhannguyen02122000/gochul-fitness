// src/components/common/TimeRangePicker.tsx
'use client'

import { Select, Space } from 'antd'
import { getTimeSlots, minutesToTime, timeToMinutes } from '@/utils/timeUtils'
import { useMemo } from 'react'

interface TimeRangePickerProps {
  from?: number
  to?: number
  onFromChange?: (value: number) => void
  onToChange?: (value: number) => void
  disabled?: boolean
}

export default function TimeRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  disabled = false
}: TimeRangePickerProps) {
  const timeSlots = useMemo(() => getTimeSlots(), [])

  const fromOptions = useMemo(() => {
    return timeSlots.map(time => ({
      value: timeToMinutes(time),
      label: time
    }))
  }, [timeSlots])

  const toOptions = useMemo(() => {
    // Filter to options must be after from
    const minTo = from !== undefined ? from + 30 : 0
    return timeSlots
      .filter(time => timeToMinutes(time) > minTo)
      .map(time => ({
        value: timeToMinutes(time),
        label: time
      }))
  }, [timeSlots, from])

  return (
    <Space.Compact className="w-full">
      <Select
        value={from}
        onChange={onFromChange}
        placeholder="From"
        disabled={disabled}
        options={fromOptions}
        className="w-1/2"
        showSearch
      />
      <Select
        value={to}
        onChange={onToChange}
        placeholder="To"
        disabled={disabled || from === undefined}
        options={toOptions}
        className="w-1/2"
        showSearch
      />
    </Space.Compact>
  )
}

