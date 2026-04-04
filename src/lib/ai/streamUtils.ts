/**
 * Server side streaming utilities for the AI chatbot.
 * Phase 5: Converts pre-computed text into AI SDK v6 UI message chunk format
 * so useChat (via DefaultChatTransport) can consume it as a streaming Response.
 *
 * AI SDK v6 uses ReadableStream<UIMessageChunk> wrapped in SSE:
 *   data: {"type":"text-start","id":"..."}\n\n
 *   data: {"type":"text-delta","delta":"Hello"}\n\n
 *   ...
 *   data: [DONE]\n\n
 *
 * @file src/lib/ai/streamUtils.ts
 */

import 'server-only'

import { createUIMessageStreamResponse, type UIMessageChunk } from 'ai'

/**
 * Generates a unique ID for streaming chunks.
 */
function generateChunkId(): string {
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Converts pre-computed bot text into an SSE Response of UIMessageChunks.
 * The stream emits:
 * 1. text-start chunk (marks beginning of text content)
 * 2. text-delta chunks (individual pieces of text)
 * 3. text_end chunk (marks end of text)
 *
 * This format is consumed by useChat's DefaultChatTransport.
 */
export function textToStream(text: string): Response {
  const chunks: UIMessageChunk[] = []
  const id = generateChunkId()
  const CHUNK_SIZE = 10

  // 1. text-start
  chunks.push({ type: 'text-start', id })

  // 2. text-delta chunks (chunk into small pieces for smooth streaming)
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push({ type: 'text-delta', delta: text.slice(i, i + CHUNK_SIZE), id })
  }

  // 3. text_end
  chunks.push({ type: 'text-end', id })

  // Encode each chunk as SSE: "data: <json>\n\n"
  const encodedChunks = chunks.map((chunk) => {
    return new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`)
  })

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of encodedChunks) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })

  return createUIMessageStreamResponse({ stream })
}
