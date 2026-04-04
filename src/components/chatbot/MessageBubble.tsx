'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, AlertCircle, AlertTriangle, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/store/useAIChatbotStore'

interface MessageBubbleProps {
  message: ChatMessage
  onConfirm?: () => void
  /** Phase 5: true when this is the last assistant message and stream is active */
  isStreaming?: boolean
}

const markdownStyles =
  'text-sm leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_thead]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1'

export default function MessageBubble({ message, onConfirm, isStreaming = false }: MessageBubbleProps) {
  const { role, content, type } = message
  const isError = type === 'error'
  const isWarning = type === 'warning'
  const isNudge = type === 'nudge'

  // ── User bubble ──────────────────────────────────────────────────────────────
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

  // ── Bot bubble variants ───────────────────────────────────────────────────────
  const avatarBg = isWarning
    ? 'bg-[var(--color-warning)]'
    : isNudge
    ? 'bg-blue-100'
    : isError
    ? 'bg-red-100'
    : 'bg-[var(--color-cta)]'

  const AvatarIcon = isWarning
    ? AlertTriangle
    : isNudge
    ? Languages
    : isError
    ? AlertCircle
    : Bot

  return (
    <div
      aria-label={isWarning ? 'Availability warning' : isNudge ? 'Language notice' : 'AI Assistant response'}
      role="note"
      className="flex items-start gap-2 animate-in slide-in-from-bottom-1 duration-200"
    >
      {/* Bot avatar */}
      <div
        className={cn(
          'size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          avatarBg
        )}
        aria-hidden="true"
      >
        {isWarning && <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />}
        {isNudge && <Languages className="h-4 w-4 text-blue-700" />}
        {isError && !isWarning && !isNudge && <AlertCircle className="h-4 w-4 text-red-500" />}
        {!isWarning && !isNudge && !isError && <Bot className="h-4 w-4 text-white" />}
      </div>

      <div className={cn('max-w-[75%] text-sm leading-relaxed', isWarning
        ? 'bg-[var(--color-warning-bg)] text-[#7A3E00] border-l-2 border-[var(--color-warning)] px-3 py-2 rounded-2xl rounded-bl-md'
        : isNudge
        ? 'bg-blue-50 text-blue-700 px-3 py-2 rounded-2xl rounded-bl-md text-[13px]'
        : isError
        ? 'bg-red-50 text-red-700 px-3 py-2 rounded-2xl rounded-bl-md'
        : 'bg-muted text-foreground px-3 py-2 rounded-2xl rounded-bl-md'
      )}>
        {isNudge ? (
          // Nudge: plain text, no markdown, no confirm button
          <span>{content}</span>
        ) : isError ? (
          // Error: plain text, no markdown
          <span>{content}</span>
        ) : (
          // Normal / proposal / warning: markdown + optional streaming cursor + optional confirm button
          <div className={!isError && markdownStyles}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {/* Streaming cursor */}
            {isStreaming && (
              <span
                className="inline-block w-2 h-4 bg-[var(--color-cta)] rounded-sm ml-1 align-middle"
                style={{ animation: 'chatbot-cursor-blink 1s step-end infinite' }}
                aria-hidden="true"
              />
            )}
            {/* Confirm button for proposal */}
            {type === 'proposal' && onConfirm && (
              <button
                type="button"
                aria-label="Confirm action"
                onClick={onConfirm}
                className={cn(
                  'self-start h-8 px-4 rounded-full mt-2',
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
      </div>
    </div>
  )
}
