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

// ─────────────────────────────────────────────────────────────────────────────
// Selection option type (Phase X: tappable user selection UI)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single selectable option rendered inside a selection bubble.
 * Used when the bot needs the user to pick from a list (e.g., disambiguation).
 */
export interface SelectionOption {
  /** Unique identifier (e.g., InstantDB user ID) */
  id: string
  /** Primary label shown as the main text (e.g., full name) */
  label: string
  /** Secondary label shown as a badge/chip (e.g., role) */
  sublabel: string
}

// Keep ChatMessage type for backwards compatibility (used by MessageBubble props)
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** Phase 3+: 'normal' | 'error'; Phase 5 adds: 'proposal' | 'warning' | 'nudge'; Phase X adds: 'selection' */
  type?: 'normal' | 'error' | 'proposal' | 'warning' | 'nudge' | 'selection'
  /** Populated when type === 'selection' — the tappable option list */
  selectionOptions?: SelectionOption[]
}
