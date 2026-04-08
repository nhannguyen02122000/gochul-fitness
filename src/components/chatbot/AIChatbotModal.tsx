'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
// No AIProvider needed in AI SDK v6 — useChat manages its own transport
import { XIcon, Bot } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'
import MessageInput from './MessageInput'

export default function AIChatbotModal() {
  const pathname = usePathname()
  const { isOpen, setOpen } = useAIChatbotStore()

  // Auto-close on route change (no longer clears messages — useChat manages state)
  useEffect(() => {
    if (isOpen) {
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Mobile: full-width bottom sheet, anchor to bottom of viewport
          // Use ! to override DialogContent's built-in positioning
          '!fixed !bottom-0 !top-auto !left-0 !right-0',
          '!w-full !max-w-full !h-[85dvh] !max-h-[85dvh]',
          '!rounded-b-none !rounded-t-2xl',
          '!flex !flex-col !p-0 !gap-0',
          // Override the built-in translate-x-1/2 translate-y-1/2 centering
          '!translate-x-0 !-translate-y-0',
          // Desktop: floating panel anchored bottom-right
          'sm:!fixed sm:!bottom-6 sm:!right-6 sm:!top-auto',
          'sm:!left-auto sm:!right-6',
          'sm:!w-[400px] sm:!max-w-[400px] sm:!min-w-[320px]',
          'sm:!rounded-2xl sm:!rounded-b-2xl',
          'sm:!translate-x-0 sm:!-translate-y-0'
        )}
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 px-4 py-3 border-b shrink-0">
          {/* Bot avatar */}
          <div
            className="size-8 rounded-full bg-[var(--color-cta)] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Bot className="h-4 w-4 text-white" />
          </div>
          <DialogTitle id="ai-chatbot-title" className="text-base font-semibold leading-none">
            AI Assistant
          </DialogTitle>

          {/* Custom close button */}
          <button
            aria-label="Close chat"
            onClick={handleClose}
            className={cn(
              'absolute top-2 right-2',
              'size-7 rounded-[min(var(--radius-md),12px)]',
              'flex items-center justify-center',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* useChat manages its own transport — no AIProvider needed */}
        <MessageInput />
      </DialogContent>
    </Dialog>
  )
}
