'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'
import MessageList from './MessageList'

type MessageType = 'normal' | 'error' | 'proposal' | 'warning' | 'nudge' | 'selection'

export default function MessageInput() {
  // Local input state — AI SDK v6 useChat does not include input/setInput
  const [input, setInput] = useState('')

  // Stores the effective message type per message ID.
  // AI SDK v6 emits message-metadata chunks that set message.metadata.type,
  // but useChat only exposes the last message's metadata via onFinish.
  // We capture onFinish metadata here and keep it in state so MessageList
  // can always read the correct type for any message.
  const [messageTypes, setMessageTypes] = useState<Record<string, MessageType>>({})
  const prevMessageCountRef = useRef(0)

  // Keep Zustand for modal open/close tracking only
  useAIChatbotStore()

  const { messages, status, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai-chatbot',
    }),
    // onFinish fires when the assistant response is fully streamed.
    // The message.metadata.type is set by the server's message-metadata chunk.
    onFinish({ message }) {
      const msgType = (message.metadata as Record<string, unknown> | undefined)?.type as
        | MessageType
        | undefined
      if (msgType) {
        setMessageTypes(prev => ({ ...prev, [message.id]: msgType }))
      }
    },
  })

  // Also track when new messages arrive so we can read their metadata
  // even if onFinish hasn't fired yet for this specific message.
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.role === 'assistant') {
        const msgType = (lastMsg.metadata as Record<string, unknown> | undefined)?.type as
          | MessageType
          | undefined
        if (msgType && !messageTypes[lastMsg.id]) {
          setMessageTypes(prev => ({ ...prev, [lastMsg.id]: msgType }))
        }
      }
      prevMessageCountRef.current = messages.length
    }
  }, [messages, messageTypes])

  // Derive isLoading from status — v6 doesn't expose isLoading directly
  const isLoading = status === 'submitted' || status === 'streaming'

  // Confirm flow: called when user clicks "Xác nhận" on a proposal bubble.
  // Sends 'Xác nhận' so the backend executes the pending write action.
  // Bypasses isLoading check so the button works even while the proposal is streaming.
  const handleConfirm = () => {
    sendMessage({ text: 'Xác nhận' })
  }

  // Cancel flow: called when user clicks "Huỷ bỏ" on a proposal bubble.
  // Sends 'Huỷ bỏ' so the backend acknowledges and aborts the pending write.
  // Bypasses isLoading check so the button works even while the proposal is streaming.
  const handleCancel = () => {
    sendMessage({ text: 'Huỷ bỏ' })
  }

  // Selection flow: called when user taps a tappable option card in a selection bubble.
  // Sends the selected label back to the AI so it continues the conversation.
  const handleSelect = (value: string) => {
    if (isLoading) return
    sendMessage({ text: value })
  }

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setInput('')
    sendMessage({ text: trimmed })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      <MessageList
        messages={messages}
        isLoading={isLoading}
        status={status}
        messageTypes={messageTypes}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onSelect={handleSelect}
      />
      <div className="flex items-center gap-2 px-4 py-3 border-t bg-background">
        <Input
          aria-label="Chat message"
          placeholder="Hỏi về hợp đồng hoặc buổi tập của bạn..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className={cn(
            'h-9 rounded-full bg-muted/50 border-input flex-1 text-sm',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={handleSubmit}
          disabled={isLoading}
          className={cn(
            'size-8 rounded-full flex items-center justify-center shrink-0',
            'bg-[var(--color-cta)] text-white',
            'transition-colors hover:bg-[var(--color-cta-hover)]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-cta)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
