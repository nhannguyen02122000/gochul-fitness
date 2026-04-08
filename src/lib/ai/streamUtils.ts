/**
 * Server side streaming utilities for the AI chatbot.
 * Phase 5: Converts pre-computed text into AI SDK v6 UI message chunk format
 * so useChat (via DefaultChatTransport) can consume it as a streaming Response.
 *
 * AI SDK v6 createUIMessageStreamResponse expects ReadableStream<UIMessageChunk>.
 * It handles SSE framing internally — DO NOT pre-encode as SSE here.
 *
 * The complete chunk lifecycle for a text response:
 *   message-metadata (optional) → start-step → text-start → text-delta* → text-end → finish-step → finish
 *
 * @file src/lib/ai/streamUtils.ts
 */

import 'server-only'

import { createUIMessageStreamResponse, type UIMessageChunk } from 'ai'
import type { SelectionOption } from '@/lib/ai/formatters'

function generateChunkId(): string {
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Shared stream builder used by both textToStream and selectionToStream.
 * Emits message-metadata BEFORE text content so the frontend can attach
 * proposal/selection type metadata before the message renders.
 */
function buildTextStream(
  text: string,
  extraMetadata?: Record<string, unknown>
): Response {
  const id = generateChunkId()
  const CHUNK_SIZE = 10

  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      // Emit message-metadata FIRST so the frontend captures it before text renders.
      // This enables the proposal type (with Confirm/Cancel buttons) to appear
      // immediately rather than after an extra re-render.
      if (extraMetadata) {
        controller.enqueue({ type: 'message-metadata', messageMetadata: extraMetadata })
      }
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

/**
 * Converts pre-computed bot text into a streaming Response.
 *
 * Creates a ReadableStream<UIMessageChunk> — NOT pre-encoded as SSE.
 * createUIMessageStreamResponse() handles SSE framing internally.
 *
 * The full lifecycle is: message-metadata (optional) → start-step → text-start → text-delta* → text-end → finish-step → finish
 */
export function textToStream(text: string, extraMetadata?: Record<string, unknown>): Response {
  return buildTextStream(text, extraMetadata)
}

/**
 * Streams a selection response: the text content (with __selection__ sentinel
 * embedded at the end) followed by the finish signal.
 *
 * The __selection__ sentinel is embedded as an HTML comment at the END of the
 * text so it does not render visibly. The frontend's getSelectionOptions()
 * parses it from the text content directly (not from tool-result parts),
 * which avoids UIMessageChunk typing constraints.
 */
export function selectionToStream(text: string, options: SelectionOption[]): Response {
  const id = generateChunkId()
  const CHUNK_SIZE = 10
  // Embed sentinel at the end of the text as an invisible HTML comment.
  // Markdown processors ignore HTML comments, so this won't show in the bubble.
  const sentinel = `\n<!-- __selection__ ${JSON.stringify(options)} -->`
  const fullText = text + sentinel

  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      // Emit selection type + options metadata first — MessageList reads it from onFinish
      controller.enqueue({ type: 'message-metadata', messageMetadata: { type: 'selection', selectionOptions: options } })
      controller.enqueue({ type: 'start-step' })
      controller.enqueue({ type: 'text-start', id })
      for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
        controller.enqueue({ type: 'text-delta', delta: fullText.slice(i, i + CHUNK_SIZE), id })
      }
      controller.enqueue({ type: 'text-end', id })
      controller.enqueue({ type: 'finish-step' })
      controller.enqueue({ type: 'finish', finishReason: 'stop' })
      controller.close()
    },
  })

  return createUIMessageStreamResponse({ stream })
}
