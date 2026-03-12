// src/utils/timeUtils.ts
import { format, differenceInHours, differenceInMinutes, differenceInDays } from 'date-fns'

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
 * @param formatStr - date-fns format string (default: "dd/MM/yyyy")
 * @returns Formatted date string
 */
export function formatDate(timestamp: number, formatStr: string = 'dd/MM/yyyy'): string {
  return format(new Date(timestamp), formatStr)
}

/**
 * Format timestamp to readable date and time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date and time string
 */
export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), 'dd/MM/yyyy HH:mm')
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
  const now = new Date()
  const target = new Date(timestamp)
  const diffHours = differenceInHours(target, now)
  const diffDays = differenceInDays(target, now)

  if (Math.abs(diffHours) < 24) {
    if (diffHours === 0) {
      const diffMins = differenceInMinutes(target, now)
      if (diffMins === 0) return 'now'
      return diffMins > 0 ? `in ${diffMins} minutes` : `${Math.abs(diffMins)} minutes ago`
    }
    return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`
  }

  if (Math.abs(diffDays) < 7) {
    return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`
  }

  return formatDate(timestamp)
}

/**
 * Get time slots for a day by dynamic session duration
 * @param durationPerSession - Session duration in minutes
 * @returns Array of time slot objects with from, to, and label
 * @example getTimeSlotsByDuration(90) => [{ from: 0, to: 90, label: "00:00 - 01:30" }, ...]
 */
export function getTimeSlotsByDuration(durationPerSession: number): Array<{ from: number; to: number; label: string }> {
  const safeDuration = Number.isInteger(durationPerSession) && durationPerSession > 0
    ? durationPerSession
    : 90

  const slots: Array<{ from: number; to: number; label: string }> = []
  const lastStart = 1440 - safeDuration

  for (let minutes = 0; minutes <= lastStart; minutes += safeDuration) {
    const from = minutes
    const to = minutes + safeDuration
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
