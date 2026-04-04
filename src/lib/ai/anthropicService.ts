/**
 * Anthropic Claude SDK client wrapper for GoChul Fitness AI Chatbot.
 * Phase 1: Configured client + placeholder call (no tool-use loop yet).
 * Phase 4: Will add callClaudeWithTools() and executeTool() functions.
 * @file src/lib/ai/anthropicService.ts
 */

import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

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
