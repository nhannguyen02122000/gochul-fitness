'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { isTextUIPart, type UIMessage } from 'ai'
import MessageBubble from './MessageBubble'
import LoadingIndicator from './LoadingIndicator'

const GREETING = 'Xin chào! Tôi là trợ lý AI của GoChul Fitness. Bạn có thể hỏi về hợp đồng và buổi tập của mình.'

interface MessageListProps {
  messages: UIMessage[]
  isLoading: boolean
  status: 'submitted' | 'streaming' | 'ready' | 'error'
  onConfirm?: () => void
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

export default function MessageList({
  messages,
  isLoading,
  status,
  onConfirm,
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
          onConfirm={undefined}
          isStreaming={false}
        />
      )}

      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1
        const content = getTextContent(msg)
        const msgType = (msg as unknown as { type?: string }).type as
          | 'normal'
          | 'error'
          | 'proposal'
          | 'warning'
          | 'nudge'
          | undefined

        return (
          <MessageBubble
            key={msg.id}
            message={{
              id: String(msg.id),
              role: msg.role as 'user' | 'assistant',
              content,
              timestamp: 0,
              type: msgType,
            }}
            onConfirm={
              msg.role === 'assistant' &&
              msgType === 'proposal' &&
              isLast &&
              onConfirm
                ? onConfirm
                : undefined
            }
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
