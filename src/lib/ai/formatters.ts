/**
 * Server-side result formatters for chatbot API responses.
 *
 * Formats raw API JSON into readable markdown tables for the AI loop
 * and for rendering in bot message bubbles. All formatting uses the
 * Asia/Ho_Chi_Minh (UTC+7) timezone to match the system's Vietnamese locale.
 *
 * @file src/lib/ai/formatters.ts
 */

import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Exported types
// ─────────────────────────────────────────────────────────────────────────────

export type ToolResult =
  | { success: true; formatted: string }
  | { success: false; formatted: string }

export type UserLanguage = 'vi' | 'en'

// ─────────────────────────────────────────────────────────────────────────────
// Bilingual error translations
// ─────────────────────────────────────────────────────────────────────────────

const ERROR_TRANSLATIONS: Record<string, { vi: string; en: string }> = {
  '400': {
    vi: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.',
    en: 'Invalid request. Please check your input and try again.',
  },
  '403': {
    vi: 'Bạn không có quyền thực hiện thao tác này.',
    en: "You don't have permission to perform this action.",
  },
  '404': {
    vi: 'Không tìm thấy dữ liệu yêu cầu.',
    en: 'The requested data was not found.',
  },
  '429': {
    vi: 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.',
    en: 'Too many requests. Please try again in a few minutes.',
  },
  '500': {
    vi: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
    en: 'Server error. Please try again in a moment.',
  },
  'rate limit': {
    vi: 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.',
    en: 'Too many requests. Please try again in a few minutes.',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported formatters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a contract list as a markdown table.
 *
 * @param contracts  - Raw contract objects from the API
 * @param pagination - Pagination metadata from the API
 * @returns A markdown table string, or a localized empty-state message
 *
 * @example
 * const text = formatContractList(data.contracts, data.pagination)
 */
export function formatContractList(
  contracts: Record<string, unknown>[],
  pagination: Record<string, unknown>
): string {
  if (!contracts.length) return 'Không có hợp đồng nào.'

  const rows = contracts.map((c) => [
    String(c['kind'] ?? ''),
    c['credits'] ? `${c['credits']} buổi` : '—',
    formatVND(Number(c['money'] ?? 0)),
    String(c['status'] ?? ''),
    formatDate(c['start_date'] as number | undefined),
    formatDate(c['end_date'] as number | undefined),
  ])

  const table = [
    '| Loại | Buổi | Giá | Trạng thái | Bắt đầu | Kết thúc |',
    '|------|------|-----|------------|---------|---------|',
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n')

  const total = (pagination['total'] as number) ?? contracts.length
  return `${table}\n\n**Tổng cộng:** ${total} hợp đồng.`
}

/**
 * Formats a session (history) list as a markdown table.
 *
 * @param sessions   - Raw session objects from the API
 * @param pagination - Pagination metadata from the API
 * @returns A markdown table string, or a localized empty-state message
 *
 * @example
 * const text = formatSessionList(data.history, data.pagination)
 */
export function formatSessionList(
  sessions: Record<string, unknown>[],
  pagination: Record<string, unknown>
): string {
  if (!sessions.length) return 'Không có buổi tập nào.'

  const rows = sessions.map((s) => [
    formatDate(s['date'] as number | undefined),
    formatTimeRange(s['from'] as number, s['to'] as number),
    String(s['status'] ?? ''),
    s['staff_note'] ? `📝 ${s['staff_note']}` : '',
    s['customer_note'] ? `💬 ${s['customer_note']}` : '',
  ])

  const table = [
    '| Ngày | Giờ | Trạng thái | Ghi chú PT | Ghi chú KH |',
    '|------|------|------------|-----------|-----------|',
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n')

  const total = (pagination['total'] as number) ?? sessions.length
  return `${table}\n\n**Tổng cộng:** ${total} buổi tập.`
}

/**
 * Formats a single create/update/delete result as a structured markdown card.
 *
 * @param entity - 'contract' or 'session'
 * @param action - 'created' | 'updated' | 'canceled'
 * @param data   - Raw entity object from the API
 * @returns A markdown summary card
 *
 * @example
 * const text = formatActionResult('contract', 'created', data.contract)
 */
export function formatActionResult(
  entity: 'contract' | 'session',
  action: 'created' | 'updated' | 'canceled',
  data: Record<string, unknown>
): string {
  if (entity === 'contract') {
    const headerMap: Record<string, string> = {
      created: '✅ **Hợp đồng đã được tạo**',
      updated: '✅ **Hợp đồng đã được cập nhật**',
      canceled: '✅ **Hợp đồng đã được hủy**',
    }
    return [
      headerMap[action],
      '',
      '| Trường | Giá trị |',
      '|--------|---------|',
      `| Loại | ${data['kind'] ?? '—'} |`,
      `| Buổi | ${data['credits'] ?? '—'} |`,
      `| Giá | ${formatVND(Number(data['money'] ?? 0))} |`,
      `| Trạng thái | ${data['status'] ?? '—'} |`,
      `| Bắt đầu | ${formatDate(data['start_date'] as number | undefined)} |`,
      `| Kết thúc | ${formatDate(data['end_date'] as number | undefined)} |`,
    ].join('\n')
  }

  // session
  const headerMap: Record<string, string> = {
    created: '✅ **Buổi tập đã được đặt**',
    updated: '✅ **Buổi tập đã được cập nhật**',
    canceled: '✅ **Buổi tập đã được hủy**',
  }
  return [
    headerMap[action],
    '',
    '| Trường | Giá trị |',
    '|--------|---------|',
    `| Ngày | ${formatDate(data['date'] as number | undefined)} |`,
    `| Giờ | ${formatTimeRange(data['from'] as number, data['to'] as number)} |`,
    `| Trạng thái | ${data['status'] ?? '—'} |`,
  ].join('\n')
}

/**
 * Translates raw API / HTTP error messages into user-friendly text
 * in Vietnamese or English.
 *
 * @param rawError - The raw error string (may contain HTTP status codes)
 * @param lang     - Detected user language ('vi' | 'en')
 * @returns A translated, human-readable error message
 *
 * @example
 * const msg = translateError('HTTP 403', 'vi')
 * // → 'Bạn không có quyền thực hiện thao tác này.'
 */
export function translateError(rawError: string, lang: UserLanguage): string {
  if (!rawError) return lang === 'vi' ? 'Đã xảy ra lỗi không xác định.' : 'An unknown error occurred.'

  const lowercased = rawError.toLowerCase()

  // Check for rate-limit keywords first
  if (lowercased.includes('rate limit') || lowercased.includes('ratelimit')) {
    return ERROR_TRANSLATIONS['rate limit'][lang]
  }

  // Extract HTTP status code
  const statusMatch = rawError.match(/\b(400|403|404|429|500)\b/)
  if (statusMatch) {
    const key = statusMatch[1]
    if (ERROR_TRANSLATIONS[key]) {
      return ERROR_TRANSLATIONS[key][lang]
    }
  }

  // Generic fallback
  return lang === 'vi'
    ? `Đã xảy ra lỗi: ${rawError}`
    : `An error occurred: ${rawError}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(ts: number | undefined): string {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(ts))
}

function formatTimeRange(from: number, to: number): string {
  if (typeof from !== 'number' || typeof to !== 'number') return '—'
  const fmt = (m: number) => {
    const h = Math.floor(m / 60)
    const min = m % 60
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
  }
  return `${fmt(from)} – ${fmt(to)}`
}
