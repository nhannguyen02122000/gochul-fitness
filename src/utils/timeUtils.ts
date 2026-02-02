// src/utils/timeUtils.ts
import dayjs from 'dayjs'

/**
 * Convert minutes from midnight to HH:mm format
 * @param minutes - Number of minutes from midnight (0-1440)
 * @returns Time string in HH:mm format
 * @example minutesToTime(480) => "08:00"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Convert HH:mm format to minutes from midnight
 * @param time - Time string in HH:mm format
 * @returns Number of minutes from midnight
 * @example timeToMinutes("08:00") => 480
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Format timestamp to readable date
 * @param timestamp - Unix timestamp in milliseconds
 * @param format - dayjs format string (default: "DD/MM/YYYY")
 * @returns Formatted date string
 */
export function formatDate(timestamp: number, format: string = 'DD/MM/YYYY'): string {
  return dayjs(timestamp).format(format)
}

/**
 * Format timestamp to readable date and time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date and time string
 */
export function formatDateTime(timestamp: number): string {
  return dayjs(timestamp).format('DD/MM/YYYY HH:mm')
}

/**
 * Check if a session has expired
 * @param date - Session date timestamp
 * @param to - Session end time in minutes from midnight
 * @returns true if session has expired
 */
export function isExpired(date: number, to: number): boolean {
  const sessionEndTime = date + (to * 60 * 1000)
  return sessionEndTime < Date.now()
}

/**
 * Check if a contract has expired
 * @param endDate - Contract end date timestamp
 * @returns true if contract has expired
 */
export function isContractExpired(endDate?: number): boolean {
  if (!endDate) return false
  return endDate < Date.now()
}

/**
 * Get time slots for a day in 30-minute intervals
 * @returns Array of time slots in HH:mm format
 */
export function getTimeSlots(): string[] {
  const slots: string[] = []
  for (let minutes = 0; minutes < 1440; minutes += 30) {
    slots.push(minutesToTime(minutes))
  }
  return slots
}

/**
 * Format time range for display
 * @param from - Start time in minutes from midnight
 * @param to - End time in minutes from midnight
 * @returns Formatted time range string
 * @example formatTimeRange(480, 540) => "08:00 - 09:00"
 */
export function formatTimeRange(from: number, to: number): string {
  return `${minutesToTime(from)} - ${minutesToTime(to)}`
}

/**
 * Get relative time from now
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(timestamp: number): string {
  const now = dayjs()
  const target = dayjs(timestamp)
  const diffInHours = target.diff(now, 'hour')
  const diffInDays = target.diff(now, 'day')

  if (Math.abs(diffInHours) < 24) {
    if (diffInHours === 0) {
      const diffInMinutes = target.diff(now, 'minute')
      if (diffInMinutes === 0) return 'now'
      return diffInMinutes > 0 ? `in ${diffInMinutes} minutes` : `${Math.abs(diffInMinutes)} minutes ago`
    }
    return diffInHours > 0 ? `in ${diffInHours} hours` : `${Math.abs(diffInHours)} hours ago`
  }

  if (Math.abs(diffInDays) < 7) {
    return diffInDays > 0 ? `in ${diffInDays} days` : `${Math.abs(diffInDays)} days ago`
  }

  return formatDate(timestamp)
}

/**
 * Get time slots for a day in 90-minute intervals
 * @returns Array of time slot objects with from, to, and label
 * @example getTimeSlots90Min() => [{ from: 0, to: 90, label: "00:00 - 01:30" }, ...]
 */
export function getTimeSlots90Min(): Array<{ from: number; to: number; label: string }> {
  const slots: Array<{ from: number; to: number; label: string }> = []
  // Generate slots from 00:00 to 22:30 (last slot ends at 24:00/1440 minutes)
  for (let minutes = 0; minutes <= 1350; minutes += 90) {
    const from = minutes
    const to = minutes + 90
    const label = `${minutesToTime(from)} - ${minutesToTime(to)}`
    slots.push({ from, to, label })
  }
  return slots
}

/**
 * Check if a time slot overlaps with any occupied slots
 * @param slotFrom - Start time of the slot in minutes from midnight
 * @param slotTo - End time of the slot in minutes from midnight
 * @param occupiedSlots - Array of occupied time ranges
 * @returns true if the slot overlaps with any occupied slot
 */
export function checkSlotOverlap(
  slotFrom: number,
  slotTo: number,
  occupiedSlots: Array<{ from: number; to: number }>
): boolean {
  return occupiedSlots.some(occupied => {
    // Overlap if: slotFrom < occupiedTo AND slotTo > occupiedFrom
    return slotFrom < occupied.to && slotTo > occupied.from
  })
}

/**
 * Check if a time slot is in the past
 * @param date - Date timestamp (start of day)
 * @param slotFrom - Start time of the slot in minutes from midnight
 * @returns true if the slot is in the past
 */
export function isSlotInPast(date: number, slotFrom: number): boolean {
  const slotStartTime = date + (slotFrom * 60 * 1000)
  return slotStartTime < Date.now()
}

