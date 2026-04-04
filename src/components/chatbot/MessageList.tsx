'use client'

import { useEffect, useRef } from 'react'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import MessageBubble from './MessageBubble'
import LoadingIndicator from './LoadingIndicator'

const GREETING = "Hi! I'm your GoChul assistant. Ask me about your contracts or training sessions."

interface MessageListProps {
  onConfirm?: () => void
}

export default function MessageList({ onConfirm }: MessageListProps) {
  const { messages, isLoading } = useAIChatbotStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const hasMessages = messages.length > 0

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
            timestamp: 0
          }}
          onConfirm={undefined}
        />
      )}

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onConfirm={msg.type === 'proposal' ? onConfirm : undefined}
        />
      ))}

      {isLoading && <LoadingIndicator />}

      {/* Invisible anchor for scroll-into-view */}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  )
}