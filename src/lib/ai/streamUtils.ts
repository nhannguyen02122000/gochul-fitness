/**
 * Server side streaming utilities for the AI chatbot.
 * Phase 5: Converts pre-computed text into AI SDK v6 UI message chunk format
 * so useChat (via DefaultChatTransport) can consume it as a streaming Response.
 *
 * AI SDK v6 createUIMessageStreamResponse expects ReadableStream<UIMessageChunk>.
 * It handles SSE framing internally — DO NOT pre-encode as SSE here.
 *
 * The complete chunk lifecycle for a text response:
 *   start-step → text-start → text-delta* → text-end → finish-step → finish
 *
 * @file src/lib/ai/streamUtils.ts
 */

import 'server-only'

import { createUIMessageStreamResponse, type UIMessageChunk } from 'ai'

function generateChunkId(): string {
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Converts pre-computed bot text into a streaming Response.
 *
 * Creates a ReadableStream<UIMessageChunk> — NOT pre-encoded as SSE.
 * createUIMessageStreamResponse() handles SSE framing internally.
 *
 * The full lifecycle is: start-step → text-start → text-delta* → text-end → finish-step → finish
 */
export function textToStream(text: string): Response {
  const id = generateChunkId()
  const CHUNK_SIZE = 10

  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      controller.enqueue({ type: 'start-step' })
      controller.enqueue({ type: 'text-start', id })
      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        controller.enqueue({ type: 'text-delta', delta: text.slice(i, i + CHUNK_SIZE), id })
      }
      controller.enqueue({ type: 'text-end', id })
      controller.enqueue({ type: 'finish-step' })
      controller.enqueue({ type: 'finish', finishReason: 'stop' })
      controller.close()
    },
  })

  return createUIMessageStreamResponse({ stream })
}
