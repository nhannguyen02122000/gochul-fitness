/**
 * Anthropic Claude SDK client wrapper for ChulFitCoach AI Chatbot.
 * Phase 1: Configured client + placeholder call (no tool-use loop yet).
 * Phase 4: Will add callClaudeWithTools() and executeTool() functions.
 * @file src/lib/ai/anthropicService.ts
 */

import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import type { ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'
import { TOOL_DEFINITIONS } from '@/lib/ai/toolDefinitions'
import {
  formatContractList,
  formatSessionList,
  formatActionResult,
  formatUserSearchResults,
  translateError,
  type UserLanguage,
  type SelectionOption,
} from '@/lib/ai/formatters'

const MODEL_NAME = process.env.MODEL_NAME ?? 'claude-opus-4-6'

/**
 * Singleton Anthropic client configured from environment variables.
 * Uses CLAUDE_BASE_URL when set (for AI router proxies), otherwise defaults to
 * the official Anthropic API endpoint.
 */
const anthropicClient = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL ?? 'https://api.anthropic.com',
})

/**
 * Creates (or returns) the configured Anthropic client.
 * Exporting this allows future injection points (e.g., mocking for tests).
 */
export function createAnthropicClient(): Anthropic {
  return anthropicClient
}

/**
 * Placeholder AI call for Phase 1 skeleton.
 *
 * Accepts a system prompt and a single user message, calls Claude, and returns
 * the text response. No tool-use loop, no multi-turn history yet — those land
 * in Phase 3 and Phase 4 respectively.
 *
 * @param systemPrompt  - Full system prompt including role context + tool descriptions
 * @param userMessage  - The user's message content
 * @returns The plain text response from Claude
 * @throws  Re-throws Anthropic API errors; callers must handle 4xx/5xx gracefully
 *
 * @example
 * const reply = await callClaudePlaceholder(
 *   buildSystemPrompt('ADMIN', 'John Doe', 'inst_123'),
 *   'List my contracts'
 * )
 */
export async function callClaudePlaceholder(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await anthropicClient.messages.create({
    model: MODEL_NAME,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textContent = response.content.find(
    (block) => block.type === 'text'
  )

  if (!textContent || textContent.type !== 'text') {
    return ''
  }

  return textContent.text
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Tool-Use Loop
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationMessage = { role: 'user' | 'assistant'; content: string }

export type CallClaudeParams = {
  messages: ConversationMessage[]
  systemPrompt: string
  role: string
  clerkToken?: string
}

export type CallResult =
  | { type: 'text'; text: string }
  | { type: 'proposal'; text: string; proposedAction: string }
  | { type: 'selection'; text: string; options: SelectionOption[] }

const MAX_TOOL_ITERATIONS = 10

/**
 * Constructs a human-readable description of a proposed tool call
 * for display in a proposal bubble when the model provides no text.
 *
 * @param toolName  - The name of the tool being proposed
 * @param input     - The tool input parameters
 * @param lang     - User's detected language for formatting
 * @param userName  - Optional resolved user name (from get_user) to include in description
 * @returns A readable proposal description string
 */
function buildProposalDescription(
  toolName: string,
  input: Record<string, unknown> | undefined,
  lang: UserLanguage,
  userName?: string
): string {
  if (!input) return `Proposing: ${toolName}`

  const vi = lang === 'vi'

  switch (toolName) {
    case 'create_contract': {
      const kind = String(input.kind ?? '')
      const money = Number(input.money ?? 0)
      const credits = Number(input.credits ?? 0)
      const endDate = input.end_date ? formatDate(Number(input.end_date), vi) : 'N/A'
      const duration = Number(input.duration_per_session ?? 0)
      const forUser = userName ? (vi ? `cho **${userName}**` : `for **${userName}**`) : 'cho bạn'
      return vi
        ? `Tôi sẽ tạo hợp đồng **${kind}** ${forUser} — giá **${money.toLocaleString('vi-VN')} VND**, ${credits > 0 ? `${credits} buổi, ` : ''}${duration > 0 ? `mỗi buổi ${duration} phút, ` : ''}hạn đến **${endDate}**.`
        : `I'll create a **${kind}** contract ${forUser} — **${money.toLocaleString('en-US')} VND**${credits > 0 ? `, ${credits} sessions` : ''}${duration > 0 ? `, ${duration} min each` : ''}, valid until **${endDate}**.`
    }

    case 'update_contract_status': {
      const contractId = String(input.contract_id ?? '').slice(0, 8)
      const newStatus = String(input.status ?? '')
      return vi
        ? `Tôi sẽ cập nhật hợp đồng **${contractId}…** sang trạng thái **${newStatus}**.`
        : `I'll update contract **${contractId}…** to status **${newStatus}**.`
    }

    case 'update_contract': {
      const contractId = String(input.contract_id ?? '').slice(0, 8)
      return vi
        ? `Tôi sẽ cập nhật hợp đồng **${contractId}…**.`
        : `I'll update contract **${contractId}…**.`
    }

    case 'delete_contract': {
      const contractId = String(input.contract_id ?? '').slice(0, 8)
      return vi
        ? `Tôi sẽ hủy hợp đồng **${contractId}…**.`
        : `I'll cancel contract **${contractId}…**.`
    }

    case 'create_session': {
      const date = input.date ? formatDate(Number(input.date), vi) : 'N/A'
      const from = minutesToTime(String(input.from ?? '0'), vi)
      const to = minutesToTime(String(input.to ?? '0'), vi)
      const withTrainer = userName ? (vi ? ` với PT **${userName}**` : ` with PT **${userName}**`) : ''
      return vi
        ? `Tôi sẽ đặt buổi tập vào **${date}**, từ **${from}** đến **${to}**${withTrainer}.`
        : `I'll book a session on **${date}**, from **${from}** to **${to}**${withTrainer}.`
    }

    case 'update_session': {
      const historyId = String(input.history_id ?? '').slice(0, 8)
      const date = input.date ? formatDate(Number(input.date), vi) : ''
      return vi
        ? `Tôi sẽ cập nhật buổi tập **${historyId}…**${date ? ` sang ngày **${date}**` : ''}.`
        : `I'll update session **${historyId}…**${date ? ` to **${date}**` : ''}.`
    }

    case 'update_session_status': {
      const historyId = String(input.history_id ?? '').slice(0, 8)
      const action = String(input.action ?? '')
      const actionText = action === 'check_in' ? (vi ? 'check-in' : 'check in') : (vi ? 'hủy' : 'cancel')
      return vi
        ? `Tôi sẽ ${actionText} buổi tập **${historyId}…**.`
        : `I'll ${actionText} session **${historyId}…**.`
    }

    default:
      return vi
        ? `Tôi sẽ thực hiện thao tác **${toolName}**.`
        : `I'll perform **${toolName}**.`
  }
}

/** Formats a Unix ms timestamp to a readable date string. */
function formatDate(ts: number, vi: boolean): string {
  return new Date(ts).toLocaleDateString(vi ? 'vi-VN' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

/**
 * Returns a list of missing required parameter labels for write tools.
 * Used to prevent the model from calling an API with incomplete params
 * (which would result in a silent failure rather than a helpful ask-for-more prompt).
 */
function getMissingRequiredParams(
  toolName: string,
  input: Record<string, unknown> | undefined
): string[] {
  if (!input) return ['purchased_by', 'kind', 'money', 'end_date']

  const required: Record<string, string> = {
    create_contract: 'Loại hợp đồng — PT (Personal Training), REHAB (Rehabilitation), hay PT_MONTHLY (Monthly PT)?',
    create_session: 'ID hợp đồng (contract_id)',
    update_contract: 'ID hợp đồng (contract_id)',
    update_session: 'ID buổi tập (history_id)',
    update_session_status: 'ID buổi tập (history_id) + action (check_in / cancel)',
    delete_contract: 'ID hợp đồng (contract_id)',
  }

  switch (toolName) {
    case 'create_contract': {
      const missing: string[] = []
      if (!input.purchased_by) missing.push('Người mua (purchased_by) — cần tên khách hàng')
      if (!input.kind) missing.push('Loại hợp đồng (kind) — PT / REHAB / PT_MONTHLY')
      if (input.money === undefined || input.money === null || input.money === '') missing.push('Giá tiền (money, VND)')
      if (!input.end_date) missing.push('Ngày kết thúc (end_date)')
      if (!input.credits && input.kind !== 'PT_MONTHLY') missing.push('Số buổi tập (credits, chỉ PT/REHAB)')
      if (!input.duration_per_session) missing.push('Thời lượng mỗi buổi (duration_per_session, phút, chia hết cho 15)')
      return missing
    }

    case 'create_session': {
      const missing: string[] = []
      if (!input.contract_id) missing.push('ID hợp đồng (contract_id)')
      if (!input.date) missing.push('Ngày tập (date)')
      if (input.from === undefined || input.from === null) missing.push('Giờ bắt đầu (from, phút từ 0:00)')
      if (input.to === undefined || input.to === null) missing.push('Giờ kết thúc (to, phút từ 0:00)')
      if (!input.teach_by) missing.push('PT / huấn luyện viên (teach_by) — cần tên PT')
      return missing
    }

    default:
      return []
  }
}

/** Converts minute-of-day (e.g. 480) to time string (e.g. "8:00 AM"). */
function minutesToTime(minutes: string | number, vi: boolean): string {
  const m = Number(minutes)
  const h = Math.floor(m / 60)
  const min = m % 60
  if (vi) return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${min.toString().padStart(2, '0')} ${period}`
}

/**
 * Parses __selection__ sentinel from formatted tool result text.
 * Returns the parsed options array or null if no sentinel present.
 */
function parseSelectionSentinel(formatted: string): SelectionOption[] | null {
  // Use [\s\S] instead of dotAll 's' flag for ES2017 compatibility
  const match = formatted.match(/<!-- __selection__ ([\s\S]+?) -->/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1]) as SelectionOption[]
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // malformed JSON
  }
  return null
}

/**
 * Strips the __selection__ sentinel comment from formatted tool result text.
 */
function stripSentinel(formatted: string): string {
  // Use [\s\S] instead of dotAll 's' flag for ES2017 compatibility
  return formatted.replace(/<!-- __selection__ [\s\S]+? -->\s*/, '')
}

/**
 * Counts the number of user rows in a formatted user search table.
 * Used to determine if disambiguation is needed (0, 1, or 2+ matches).
 */
function countTableRows(formatted: string): number {
  const matches = formatted.match(/\n\| \[[\d-]+\] \|/g)
  return matches ? matches.length : 0
}

/**
 * Extracts the resolved InstantDB user ID from a user search table.
 * Matches the ID in backticks from the table row, e.g.: "| [0] | Name | ROLE | `69be89a8-…` |"
 */
function extractResolvedId(formatted: string): string {
  // Match the full UUID in backticks: 8-4-4-4-12 hex format
  const match = formatted.match(/`([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`/i)
  return match?.[1] ?? ''
}

/**
 * Extracts the user's full name from a formatted user search result.
 * Handles two formats:
 *   1. List format (formatUserSearchResults output):
 *      "[0] Full Name (email@domain.com) — ROLE"
 *   2. Table format (backwards compatibility):
 *      "| [0] | Full Name | ROLE |"
 */
function extractResolvedName(formatted: string): string {
  // Try list format first: "[N] Full Name (email) — ROLE"
  // Use [\s\S] instead of 's' flag for ES2017 compatibility
  const listMatch = formatted.match(/\[\d+\]\s+([\s\S]+?)\s*\(/)
  if (listMatch?.[1]) {
    return listMatch[1].trim()
  }

  // Fallback to table format: "| [N] | Full Name | ROLE |"
  const tableMatch = formatted.match(/\n\| \[[\d-]+\] \| ([^\n|]+) \| [A-Z_]+\|?/)
  if (tableMatch?.[1]) {
    return tableMatch[1].trim()
  }

  return 'Unknown'
}

/**
 * Detects whether the user's most recent message is in Vietnamese or English.
 * Checks for Vietnamese diacritical marks as the primary signal.
 *
 * @param messages - Full conversation message array
 * @returns 'vi' if Vietnamese diacritics detected, 'en' otherwise
 */
export function detectLanguage(messages: ConversationMessage[]): UserLanguage {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUser) return 'vi'
  const content = lastUser.content
  if (!content) return 'vi'
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(content)) {
    return 'vi'
  }
  return 'en'
}

/**
 * Executes a named tool by dispatching to the appropriate ChulFitCoach API route.
 * Implements a single retry for transient errors (429 / 5xx / network).
 * All results are formatted server-side before being returned.
 *
 * @param toolName    - One of the 10 defined tool names
 * @param input       - Tool input parameters from the model
 * @param clerkToken  - Clerk JWT for forwarding auth to internal API routes
 * @param lang        - Detected user language for error translation
 * @returns A formatted ToolResult (success or error)
 */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  clerkToken?: string,
  lang: UserLanguage = 'vi'
): Promise<{ success: true; formatted: string } | { success: false; formatted: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await dispatchTool(toolName, input, baseUrl, headers, lang)
      return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const isRetryable =
        lastError.message.includes('429') ||
        lastError.message.includes('500') ||
        lastError.message.includes('503') ||
        lastError.message.includes('fetch failed')
      if (isRetryable) continue
      break
    }
  }

  return {
    success: false,
    formatted: translateError(lastError!.message, lang),
  }
}

// Internal dispatcher — kept separate so retry loop stays clean
async function dispatchTool(
  toolName: string,
  input: Record<string, unknown>,
  baseUrl: string,
  headers: Record<string, string>,
  lang: UserLanguage
): Promise<{ success: true; formatted: string }> {
  switch (toolName) {
    case 'get_contracts': {
      const params = new URLSearchParams(
        Object.entries(input).map(([k, v]) => [k, String(v)])
      ).toString()
      const res = await fetch(`${baseUrl}/api/contract/getAll?${params}`, {
        headers: { Authorization: headers.Authorization! },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatContractList(data.contracts ?? [], data.pagination ?? {}) }
    }

    case 'create_contract': {
      const res = await fetch(`${baseUrl}/api/contract/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('contract', 'created', data.contract ?? {}) }
    }

    case 'update_contract_status': {
      const res = await fetch(`${baseUrl}/api/contract/updateStatus`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('contract', 'updated', data.contract ?? {}) }
    }

    case 'update_contract': {
      const res = await fetch(`${baseUrl}/api/contract/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('contract', 'updated', data.contract ?? {}) }
    }

    case 'delete_contract': {
      const res = await fetch(`${baseUrl}/api/contract/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('contract', 'canceled', data.contract ?? {}) }
    }

    case 'get_user': {
      const params = new URLSearchParams({ q: String(input.query ?? '') })
      if (input.role) params.set('role', String(input.role))
      if (input.resolved_index !== undefined) {
        params.set('resolved_index', String(input.resolved_index))
      }
      const res = await fetch(`${baseUrl}/api/ai-chatbot/users/search?${params}`, {
        headers: { Authorization: headers.Authorization! },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      const { formatted, options } = formatUserSearchResults(
        data.users ?? [],
        data.pagination?.total ?? 0,
        lang
      )
      // Embed __selection__ sentinel in the formatted string so the frontend
      // can parse it out of tool-result content and render tappable cards.
      // Wrapped in HTML comment so it does not render in markdown.
      if (options.length >= 2) {
        const sentinel = `\n<!-- __selection__ ${JSON.stringify(options)} -->`
        return { success: true, formatted: formatted + sentinel }
      }
      return { success: true, formatted }
    }

    case 'get_sessions': {
      const params = new URLSearchParams(
        Object.entries(input).map(([k, v]) => [k, String(v)])
      ).toString()
      const res = await fetch(`${baseUrl}/api/history/getAll?${params}`, {
        headers: { Authorization: headers.Authorization! },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatSessionList(data.history ?? [], data.pagination ?? {}) }
    }

    case 'create_session': {
      const res = await fetch(`${baseUrl}/api/history/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('session', 'created', data.history ?? {}) }
    }

    case 'update_session': {
      const res = await fetch(`${baseUrl}/api/history/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('session', 'updated', data.history ?? {}) }
    }

    case 'update_session_status': {
      const res = await fetch(`${baseUrl}/api/history/updateStatus`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('session', 'updated', data.history ?? {}) }
    }

    case 'update_session_note': {
      const res = await fetch(`${baseUrl}/api/history/updateNote`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      return { success: true, formatted: formatActionResult('session', 'updated', data.history ?? {}) }
    }

    case 'get_occupied_time_slots': {
      // Fetch non-canceled sessions for this trainer on this date
      const dayStart = new Date(Number(input.date)).setHours(0, 0, 0, 0)
      const dayEnd = new Date(Number(input.date)).setHours(23, 59, 59, 999)
      const params = new URLSearchParams({
        teach_by: String(input.trainer_id),
        start_date: String(dayStart),
        end_date: String(dayEnd),
      })
      const res = await fetch(`${baseUrl}/api/history/getAll?${params}`, {
        headers: { Authorization: headers.Authorization! },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      const occupied = (data.history ?? [])
        .filter((h: any) => h.status !== 'CANCELED')
        .map((h: any) => `[${h.from}, ${h.to}]`)
        .join(', ')
      return {
        success: true,
        formatted: occupied
          ? `Occupied slots: ${occupied}`
          : 'No existing bookings for this trainer on this date.',
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

/**
 * Multi-turn tool-use loop powered by Claude.
 *
 * Sends the full conversation history + system prompt + tool definitions to Claude.
 * Collects any tool_use blocks from the response, executes each tool, feeds the
 * formatted results back to Claude, and repeats until the model returns no tool
 * calls (plain text response).
 *
 * Write operations (create / update / delete) are NOT executed immediately —
 * they are surfaced as a 'proposal' return type so the client can display a
 * confirmation button. The loop only proceeds to execution when the incoming
 * message carries a 'CONFIRMED:' prefix (handled via system prompt instruction).
 *
 * The loop is hard-capped at MAX_TOOL_ITERATIONS (10) to prevent runaway loops.
 *
 * @param params.messages      - Conversation history (role + content pairs)
 * @param params.systemPrompt  - Full system prompt assembled by buildSystemPrompt()
 * @param params.role          - Calling user's role (ADMIN | STAFF | CUSTOMER)
 * @param params.clerkToken   - Clerk JWT forwarded to internal API routes
 * @returns CallResult — either plain text or a proposal requiring confirmation
 *
 * @example
 * const result = await callClaudeWithTools({
 *   messages: [{ role: 'user', content: 'tạo hợp đồng cho Minh' }],
 *   systemPrompt: buildSystemPrompt({ role: 'ADMIN', userName: 'Minh', userInstantId: '...' }),
 *   role: 'ADMIN',
 *   clerkToken: '...',
 * })
 */
export async function callClaudeWithTools({
  messages,
  systemPrompt,
  role,
  clerkToken,
}: CallClaudeParams): Promise<CallResult> {
  const lang = detectLanguage(messages)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationMessages: any[] = messages.map(
    (m) => ({
      role: m.role,
      content: m.content,
    })
  )

  let iterations = 0

  console.log('[callClaudeWithTools] Start. messages:', messages.length, 'sysPrompt len:', systemPrompt.length)

  while (iterations < MAX_TOOL_ITERATIONS) {
    console.log('[callClaudeWithTools] iteration', iterations, '| msgs:', conversationMessages.length)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await anthropicClient.messages.create({
      model: MODEL_NAME,
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationMessages,
      tools: TOOL_DEFINITIONS,
    })
    console.log('[callClaudeWithTools] response blocks:', response.content?.length, 'stop:', response.stop_reason)

    const textParts: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls: any[] = []
    for (const block of response.content ?? []) {
      if (block.type === 'text') textParts.push(block.text)
      if (block.type === 'tool_use') toolCalls.push(block)
    }

    const assistantText = textParts.join('\n')

    // Check for confirmation in BOTH assistant text AND the last user message.
    // The system prompt says "CONFIRMED:" prefix triggers execution, but users may
    // say "có", "yes", "đồng ý", "ok" instead.
    // Also treat numeric picks ("số 1", "người thứ 2", "item 1") as implicit confirmations
    // of a pending user resolution when they follow a disambiguation list.
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    const userText = lastUser?.content ?? ''
    const CONFIRM_KEYWORDS = /^(có|yep|yeah|đồng ý|ok|confirm|yes|vâng|được rồi)$/i
    const CANCEL_KEYWORDS = /^(không|k hông|no|k no|cancel|hủy|huỷ|undo)$/i
    const PICK_KEYWORDS = /^(số|so|item|#|người thứ|nguoi thu|thứ|the|theo)$/i
    const hasConfirmed =
      userText.trim() === 'Xác nhận' ||
      CONFIRM_KEYWORDS.test(userText.trim()) ||
      PICK_KEYWORDS.test(userText.trim())
    const hasCanceled =
      userText.trim() === 'Huỷ bỏ' ||
      CANCEL_KEYWORDS.test(userText.trim().replace(/^Xác nhận\s*/, ''))

    // Explicit cancel → acknowledge, no write executed
    if (hasCanceled) {
      return {
        type: 'text',
        text: lang === 'vi'
          ? 'Đã huỷ thao tác. Nếu bạn cần thay đổi gì, cứ nhắn tôi nhé!'
          : 'Action cancelled. Let me know if you need anything else!',
      }
    }

    // No tool calls → plain text
    if (toolCalls.length === 0) {
      return { type: 'text', text: assistantText }
    }

    // Write tools require CONFIRMED: prefix
    const writeToolNames = [
      'create_contract', 'create_session', 'update_contract',
      'delete_contract', 'update_session', 'update_session_status',
    ]
    const primaryToolName = toolCalls[0]?.name ?? ''
    const isWriteTool = writeToolNames.includes(primaryToolName)

    if (isWriteTool && !hasConfirmed) {
      // Build a human-readable proposal description when model provides no text block
      const proposalText =
        assistantText.trim() ||
        buildProposalDescription(primaryToolName, toolCalls[0]?.input as Record<string, unknown> | undefined, lang)
      return { type: 'proposal', text: proposalText, proposedAction: primaryToolName }
    }

    // ── Special combo handling: get_user + write tool ──────────────────────────
    // When get_user appears alongside a write tool, resolve the user FIRST.
    // resolved_index provided → user already picked from disambiguation list → execute write immediately.
    // resolved_index NOT provided → user named a person without picking → return proposal.
    const getUserCall = toolCalls.find((tc: any) => tc.name === 'get_user')
    const writeCall = toolCalls.find((tc: any) => writeToolNames.includes(tc.name))

    // get_user ALONE (no other tools, no resolved_index) — just return the search results.
    // Do NOT loop back to the model, as the user needs to see and pick from the list.
    if (getUserCall && !writeCall && toolCalls.length === 1) {
      const userResult = await executeTool(
        getUserCall.name,
        getUserCall.input as Record<string, unknown>,
        clerkToken,
        lang
      )

      // If resolved_index is provided, we got a specific pick — return it as text
      if (getUserCall.input?.resolved_index !== undefined && getUserCall.input?.resolved_index !== null) {
        return { type: 'text', text: userResult.formatted }
      }

      // Parse __selection__ sentinel to distinguish 0 / 1 / 2+ matches
      const parsed = parseSelectionSentinel(userResult.formatted)

      // 2+ user matches → return 'selection' type so the frontend renders tappable option cards
      if (parsed) {
        return { type: 'selection', text: stripSentinel(userResult.formatted), options: parsed }
      }

      // 1 match (no sentinel, no resolved_index) → push result back to the model and loop.
      // Claude will then call create_contract (or whatever action the user requested)
      // with the resolved user_id merged into the tool input.
      // We use the plain formatted text (no ID shown to user) so the loop feels seamless.
      const resolvedMention = lang === 'vi'
        ? `Đã xác định người dùng.\n\n${userResult.formatted}`
        : `User identified.\n\n${userResult.formatted}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conversationMessages.push({ role: 'user', content: resolvedMention } as any)
      iterations++
      continue
    }

    if (getUserCall && writeCall) {
      // 1. Execute get_user to resolve the name
      const userResult = await executeTool(
        getUserCall.name,
        getUserCall.input as Record<string, unknown>,
        clerkToken,
        lang
      )

      // 2. Parse match count via sentinel
      const parsed = parseSelectionSentinel(userResult.formatted)
      const matchCount = parsed ? parsed.length : 0

      if (matchCount === 0) {
        return { type: 'text', text: userResult.formatted }
      }

      if (matchCount > 1) {
        // Multiple matches — return 'selection' type so frontend renders tappable cards
        // matchCount > 1 implies parsed is non-null (matchCount = parsed?.length ?? 0)
        return {
          type: 'selection',
          text: stripSentinel(userResult.formatted),
          options: parsed!,
        }
      }

      // 3. Single match — extract resolved ID and merge into write tool input
      const resolvedId = extractResolvedId(userResult.formatted)
      if (!resolvedId) {
        return { type: 'text', text: userResult.formatted }
      }

      const idParam = writeCall.name === 'create_session' ? 'teach_by' : 'purchased_by'
      const mergedInput = { ...writeCall.input, [idParam]: resolvedId }
      const userName = extractResolvedName(userResult.formatted)

      // 4. If resolved_index was provided → user already picked → execute write immediately
      const resolvedIndex = getUserCall.input?.resolved_index
      if (resolvedIndex !== undefined && resolvedIndex !== null) {
        const writeResult = await executeTool(
          writeCall.name,
          mergedInput,
          clerkToken,
          lang
        )
        const resolvedMention = lang === 'vi'
          ? `✅ Đã xác định: **${userName}**\n\n`
          : `✅ Identified: **${userName}**\n\n`
        if (!writeResult.success) {
          return { type: 'text', text: `❌ ${writeResult.formatted}` }
        }
        return { type: 'text', text: resolvedMention + writeResult.formatted }
      }

      // 5. No resolved_index → user just mentioned a name → return proposal
      const resolvedMention = lang === 'vi'
        ? `✅ Đã xác định: **${userName}**\n\n`
        : `✅ Identified: **${userName}**\n\n`
      const proposalText =
        assistantText.trim() ||
        buildProposalDescription(writeCall.name, mergedInput, lang, userName)
      return { type: 'proposal', text: resolvedMention + proposalText, proposedAction: writeCall.name }
    }

    // ── Standard execution: all other tools ─────────────────────────────────

    // Guard: validate required params for write tools BEFORE executing.
    // Even when hasConfirmed=true (e.g. user clicked Confirm), missing required
    // params must surface as a proposal so the bot can ask for them instead of
    // calling the API and failing silently.
    if (isWriteTool) {
      const missingParams = getMissingRequiredParams(primaryToolName, toolCalls[0]?.input as Record<string, unknown>)
      if (missingParams.length > 0) {
        const vi = lang === 'vi'
        return {
          type: 'proposal',
          text: vi
            ? `Để tạo hợp đồng, cần các thông tin sau:\n${missingParams.map((p, i) => `${i + 1}. ${p}`).join('\n')}\nBạn cung cấp giúp tôi nhé!`
            : `To proceed, I need the following information:\n${missingParams.map((p, i) => `${i + 1}. ${p}`).join('\n')}\nCould you provide these details?`,
          proposedAction: primaryToolName,
        }
      }
    }

    const toolResults: ToolResultBlockParam[] = []
    for (const toolCall of toolCalls) {
      try {
        const result = await executeTool(
          toolCall.name,
          toolCall.input as Record<string, unknown>,
          clerkToken,
          lang
        )
        toolResults.push({
          tool_use_id: toolCall.id,
          type: 'tool_result',
          content: result.formatted,
          is_error: !result.success,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        toolResults.push({
          tool_use_id: toolCall.id,
          type: 'tool_result',
          content: translateError(msg, lang),
          is_error: true,
        })
      }
    }

    // If ANY tool failed, return the error directly — do not loop back to the model.
    const anyFailed = toolResults.some((r) => r.is_error)
    if (anyFailed) {
      const errorResult = toolResults.find((r) => r.is_error)
      const errContent = errorResult?.content
      return {
        type: 'text',
        text: `❌ ${typeof errContent === 'string' ? errContent : 'Tool execution failed.'}`,
      }
    }

    // All tools succeeded. For write operations, return the formatted result directly —
    // no need for another model call (avoids tool ID mismatch on loop).
    if (isWriteTool) {
      const successResult = toolResults[0]
      const successContent = successResult?.content
      return {
        type: 'text',
        text: typeof successContent === 'string' ? successContent : 'Action completed.',
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conversationMessages.push({ role: 'user', content: toolResults } as any)
    iterations++
  }

  return { type: 'text', text: 'I reached the maximum steps (10). Please try a simpler request.' }
}

