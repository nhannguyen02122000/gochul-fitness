'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'

export default function MessageInput() {
  const [input, setInput] = useState('')
  const { isLoading, addMessage, setLoading } = useAIChatbotStore()

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    addMessage({ role: 'user', content: trimmed })
    setLoading(true)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t bg-background">
      <Input
        aria-label="Chat message"
        placeholder="Ask about your contracts or training sessions..."
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
  )
}
