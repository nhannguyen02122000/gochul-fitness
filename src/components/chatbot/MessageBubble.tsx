'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/store/useAIChatbotStore'

interface MessageBubbleProps {
  message: ChatMessage
  onConfirm?: () => void
}

const markdownStyles =
  'text-sm leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_thead]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1'

export default function MessageBubble({ message, onConfirm }: MessageBubbleProps) {
  const { role, content, type } = message
  const isError = type === 'error'

  if (role === 'user') {
    return (
      <div
        aria-label="User message"
        role="note"
        className={cn(
          'max-w-[75%] ml-auto flex flex-col items-end gap-1',
          'px-3 py-2 rounded-2xl rounded-br-md',
          'bg-[var(--color-cta)] text-white text-sm leading-relaxed',
          'animate-in slide-in-from-bottom-1 duration-200'
        )}
      >
        <span>{content}</span>
      </div>
    )
  }

  return (
    <div
      aria-label={type === 'proposal' ? 'Action requires confirmation' : 'AI Assistant response'}
      role="note"
      className="flex items-start gap-2 animate-in slide-in-from-bottom-1 duration-200"
    >
      {/* Bot avatar — coral for normal, red for error */}
      <div
        className={cn(
          'size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          isError ? 'bg-red-100' : 'bg-[var(--color-cta)]'
        )}
        aria-hidden="true"
      >
        {isError ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      <div
        className={cn(
          'max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed',
          isError
            ? 'bg-red-50 text-red-700'
            : 'bg-muted text-foreground',
          !isError && markdownStyles
        )}
      >
        {isError ? (
          <span>{content}</span>
        ) : (
          <>
            {!type && (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            )}
            {type === 'proposal' && (
              <div className="flex flex-col gap-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
                {onConfirm && (
                  <button
                    type="button"
                    aria-label="Confirm action"
                    onClick={onConfirm}
                    className={cn(
                      'self-start h-8 px-4 rounded-full',
                      'bg-[var(--color-cta)] text-white text-sm font-medium',
                      'transition-colors hover:bg-[var(--color-cta-hover)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                  >
                    Confirm
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
