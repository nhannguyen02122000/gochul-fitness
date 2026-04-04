/**
 * Server-side streaming utilities for the AI chatbot.
 * Phase 5: Converts pre-computed text into AI SDK data stream format
 * so useChat can consume it as a streaming Response.
 * @file src/lib/ai/streamUtils.ts
 */

import 'server-only'

/**
 * Chunks a string into small pieces for smooth streaming.
 */
function chunkText(text: string, chunkSize = 10): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Creates a ReadableStream in AI SDK data stream format.
 * Format: `0:${JSON.stringify({ type: 'text', textDelta: chunk })}\n`
 * This is consumed by useChat's fetch transport.
 *
 * @param text - The pre-computed bot reply from callClaudeWithTools()
 * @param metadata - Optional metadata to include alongside the text
 */
export function textToStream(
  text: string,
  metadata?: Record<string, unknown>
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      // Send metadata as first chunk if provided
      if (metadata) {
        controller.enqueue(
          encoder.encode(`0:${JSON.stringify(metadata)}\n`)
        )
      }
    },
    pull(controller) {
      const chunks = chunkText(text)
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`0:${JSON.stringify({ type: 'text', textDelta: chunk })}\n`)
        )
      }
      controller.close()
    },
  })
}
