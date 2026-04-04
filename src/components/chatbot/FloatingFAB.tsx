'use client'

import { MessageCircle } from 'lucide-react'
import { useAIChatbotStore } from '@/store/useAIChatbotStore'
import { cn } from '@/lib/utils'

export default function FloatingFAB() {
  const { isOpen, setOpen } = useAIChatbotStore()

  if (isOpen) return null

  return (
    <button
      aria-label="Open AI Assistant"
      onClick={() => setOpen(true)}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'size-14 rounded-full',
        'bg-[var(--color-cta)] text-white shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-200',
        'hover:bg-[var(--color-cta-hover)] hover:scale-105',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  )
}