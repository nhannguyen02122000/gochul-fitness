'use client'

import { create } from 'zustand'

interface AIChatbotStore {
  isOpen: boolean
  setOpen: (v: boolean) => void
  // REMOVED in Phase 5 (migrated to useChat from ai/react):
  // messages, isLoading, addMessage, setLoading, clearMessages
}

export const useAIChatbotStore = create<AIChatbotStore>((set) => ({
  isOpen: false,
  setOpen: (v) => set({ isOpen: v }),
}))

// Keep ChatMessage type for backwards compatibility (used by MessageBubble props)
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** Phase 3+: 'normal' | 'error'; Phase 5 adds: 'proposal' | 'warning' | 'nudge' */
  type?: 'normal' | 'error' | 'proposal' | 'warning' | 'nudge'
}
