/**
 * Anthropic Claude SDK client wrapper for GoChul Fitness AI Chatbot.
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
  translateError,
  type UserLanguage,
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

const MAX_TOOL_ITERATIONS = 10

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
 * Executes a named tool by dispatching to the appropriate GoChul API route.
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
      const result = await dispatchTool(toolName, input, baseUrl, headers)
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
  headers: Record<string, string>
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

  // Build conversation messages array for the API
  const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = messages.map(
    (m) => ({
      role: m.role,
      content: m.content,
    })
  )

  let iterations = 0

  while (iterations < MAX_TOOL_ITERATIONS) {
    const response = await anthropicClient.messages.create({
      model: MODEL_NAME,
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationMessages,
      tools: TOOL_DEFINITIONS,
    })

    const textParts: string[] = []
    const toolCalls: ToolUseBlock[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
      } else if (block.type === 'tool_use') {
        toolCalls.push(block)
      }
    }

    const assistantText = textParts.join('\n')
    const hasConfirmed = assistantText.includes('CONFIRMED:')

    // No tool calls → done, return plain text
    if (toolCalls.length === 0) {
      return { type: 'text', text: assistantText }
    }

    // Write tools require a CONFIRMED: prefix before execution
    const isWriteTool = (name: string) =>
      [
        'create_contract',
        'create_session',
        'update_contract',
        'delete_contract',
        'update_session',
        'update_session_status',
      ].includes(name)

    const primaryToolName = toolCalls[0].name

    if (isWriteTool(primaryToolName) && !hasConfirmed) {
      return {
        type: 'proposal',
        text: assistantText,
        proposedAction: primaryToolName,
      }
    }

    // Execute tools and collect formatted results
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

    // Append tool results to the conversation (must be user role per Anthropic spec)
    conversationMessages.push({
      role: 'user',
      content: toolResults as unknown as string,
    })

    iterations++
  }

  // Cap hit — return a graceful message
  return {
    type: 'text',
    text: 'I reached the maximum number of steps (10). Please try a simpler or more specific request.',
  }
}
