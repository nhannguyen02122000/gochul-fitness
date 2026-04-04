'use client'

import { create } from 'zustand'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
}

interface AIChatbotStore {
  messages: ChatMessage[]
  isLoading: boolean
  isOpen: boolean
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setLoading: (v: boolean) => void
  setOpen: (v: boolean) => void
  clearMessages: () => void
}

export const useAIChatbotStore = create<AIChatbotStore>((set) => ({
  messages: [],
  isLoading: false,
  isOpen: false,
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: Date.now() }
      ]
    })),
  setLoading: (v) => set({ isLoading: v }),
  setOpen: (v) => set({ isOpen: v }),
  clearMessages: () => set({ messages: [] })
}))
