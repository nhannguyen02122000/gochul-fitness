// src/utils/currencyUtils.ts

/**
 * Format number to VND currency with thousand separator
 * @param amount - Amount in VND
 * @returns Formatted currency string
 * @example formatVND(5000000) => "5,000,000 VND"
 */
export function formatVND(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} VND`
}

/**
 * Format number to VND currency without suffix
 * @param amount - Amount in VND
 * @returns Formatted number string with thousand separator
 * @example formatVNDNumber(5000000) => "5,000,000"
 */
export function formatVNDNumber(amount: number): string {
  return amount.toLocaleString('vi-VN')
}

/**
 * Parse formatted VND string to number
 * @param formattedAmount - Formatted VND string
 * @returns Parsed number
 * @example parseVND("5,000,000 VND") => 5000000
 */
export function parseVND(formattedAmount: string): number {
  const cleaned = formattedAmount.replace(/[^\d]/g, '')
  return parseInt(cleaned, 10) || 0
}

