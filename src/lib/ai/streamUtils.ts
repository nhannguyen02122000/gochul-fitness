/**
 * Server side streaming utilities for the AI chatbot.
 * Phase 5: Converts pre-computed text into AI SDK v6 UI message chunk format
 * so useChat (via DefaultChatTransport) can consume it as a streaming Response.
 *
 * AI SDK v6 createUIMessageStreamResponse expects ReadableStream<UIMessageChunk>.
 * It handles SSE framing internally — DO NOT pre-encode as SSE here.
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
 * createUIMessageStreamResponse() handles SSE framing internally:
 *   data: {"type":"text-start","id":"..."}\n\n
 *   data: {"type":"text-delta","delta":"Hello"}\n\n
 *   ...
 *   data: [DONE]\n\n
 */
export function textToStream(text: string): Response {
  const id = generateChunkId()
  const CHUNK_SIZE = 10

  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      // 1. text-start
      controller.enqueue({ type: 'text-start', id })
      // 2. text-delta chunks
      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        controller.enqueue({
          type: 'text-delta',
          delta: text.slice(i, i + CHUNK_SIZE),
          id,
        })
      }
      // 3. text-end
      controller.enqueue({ type: 'text-end', id })
      controller.close()
    },
  })

  return createUIMessageStreamResponse({ stream })
}
