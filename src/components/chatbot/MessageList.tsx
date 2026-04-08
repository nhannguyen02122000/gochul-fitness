'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { isTextUIPart, type UIMessage } from 'ai'
import MessageBubble from './MessageBubble'
import LoadingIndicator from './LoadingIndicator'
import type { SelectionOption } from '@/store/useAIChatbotStore'

const GREETING = 'Xin chào! Tôi là trợ lý AI của ChulFitCoach. Bạn có thể hỏi về hợp đồng và buổi tập của mình.'

type MessageType = 'normal' | 'error' | 'proposal' | 'warning' | 'nudge' | 'selection'

interface MessageListProps {
  messages: UIMessage[]
  isLoading: boolean
  status: 'submitted' | 'streaming' | 'ready' | 'error'
  /** Map of messageId → effective type, populated by MessageInput via onFinish */
  messageTypes: Record<string, MessageType>
  onConfirm?: () => void
  onCancel?: () => void
  onSelect?: (value: string) => void
}

/**
 * Extract readable text content from a UIMessage's parts array.
 * AI SDK v6 uses a parts-based message model (not .content string).
 */
function getTextContent(msg: UIMessage): string {
  return msg.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join('')
}

/**
 * Parses __selection__ sentinel from text content.
 * Returns the parsed options array or null if no sentinel present.
 *
 * The sentinel is embedded as an HTML comment at the end of the text content:
 *   <!-- __selection__ [{"id":"...","label":"...","sublabel":"..."}, ...] -->
 *
 * HTML comments are ignored by markdown renderers so this renders invisibly.
 */
function parseSelectionSentinel(text: string): SelectionOption[] | null {
  const match = text.match(/<!-- __selection__ ([\s\S]+?) -->/)
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
 * Extracts selection options from a UIMessage's metadata.
 *
 * The server sends selectionOptions via message-metadata chunk BEFORE text content.
 * This is read in MessageInput's onFinish and stored in messageTypes map.
 * This approach avoids the chunk-splitting issue that breaks sentinel parsing.
 *
 * Returns undefined if not a selection message (degrades to plain text).
 */
function getSelectionOptions(msg: UIMessage, messageTypes: Record<string, MessageType>): SelectionOption[] | undefined {
  const trackedType = messageTypes[msg.id]
  if (trackedType === 'selection') {
    const meta = (msg.metadata as Record<string, unknown> | undefined)
    if (meta?.selectionOptions && Array.isArray(meta.selectionOptions)) {
      return meta.selectionOptions as SelectionOption[]
    }
  }
  return undefined
}

/**
 * Derives the effective message type for a given message.
 * Priority:
 * 1. messageTypes map (set by MessageInput via onFinish — highest priority)
 * 2. selection sentinel in text (for selection type)
 * 3. raw metadata.type (fallback — e.g. from server)
 * 4. defaults to 'normal'
 */
function deriveMsgType(
  msg: UIMessage,
  messageTypes: Record<string, MessageType>
): MessageType {
  // 1. Check the messageTypes map (set by onFinish/onEffect)
  const trackedType = messageTypes[msg.id]
  if (trackedType) return trackedType

  // 2. Check for selection sentinel in text (fallback — less reliable)
  const selectionOptions = getSelectionOptions(msg, messageTypes)
  if (selectionOptions?.length) return 'selection'

  // 3. Fallback to raw metadata
  const rawType = (msg.metadata as Record<string, unknown> | undefined)?.type
  if (typeof rawType === 'string') return rawType as MessageType

  return 'normal'
}

export default function MessageList({
  messages,
  isLoading,
  status,
  messageTypes,
  onConfirm,
  onCancel,
  onSelect,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const hasMessages = messages.length > 0
  const isStreaming = status === 'streaming'
  const lastMsg = messages[messages.length - 1]
  const showCursor = isStreaming && lastMsg?.role === 'assistant'

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {!hasMessages && (
        <MessageBubble
          message={{
            id: 'greeting',
            role: 'assistant',
            content: GREETING,
            timestamp: 0,
          }}
          isStreaming={false}
        />
      )}

      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1
        const content = getTextContent(msg)
        const msgType = deriveMsgType(msg, messageTypes)

        return (
          <MessageBubble
            key={msg.id}
            message={{
              id: String(msg.id),
              role: msg.role as 'user' | 'assistant',
              content,
              timestamp: 0,
              type: msgType,
              ...(msgType === 'selection' && getSelectionOptions(msg, messageTypes)
                ? { selectionOptions: getSelectionOptions(msg, messageTypes) }
                : {}),
            }}
            onConfirm={
              msg.role === 'assistant' &&
              msgType === 'proposal' &&
              isLast &&
              onConfirm
                ? onConfirm
                : undefined
            }
            onCancel={
              msg.role === 'assistant' &&
              msgType === 'proposal' &&
              isLast &&
              onCancel
                ? onCancel
                : undefined
            }
            onSelect={msg.role === 'assistant' && msgType === 'selection' && onSelect ? onSelect : undefined}
            isStreaming={isLast && isStreaming}
          />
        )
      })}

      {isLoading && (
        <LoadingIndicator
          phase={isStreaming ? 'responding' : 'thinking'}
          hasContent={showCursor}
        />
      )}

      {/* Invisible anchor for scroll-into-view */}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  )
}
