'use client'

import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SelectionOption } from '@/store/useAIChatbotStore'

interface SelectionBubbleProps {
  options: SelectionOption[]
  onSelect: (value: string) => void
}

/**
 * Renders a tappable list of user-selection options inside a bot message bubble.
 *
 * Each option card has:
 * - An index badge (1, 2, 3…) on the left
 * - The user's name as the primary label
 * - A role badge as a coloured chip
 * - Minimum 44px tap target height
 *
 * Triggered when the AI needs the user to pick from a disambiguation list
 * (e.g., multiple users match a query — no typing required).
 */
export default function SelectionBubble({ options, onSelect }: SelectionBubbleProps) {
  if (!options?.length) return null

  return (
    <div
      role="listbox"
      aria-label="Chọn người dùng"
      className="flex flex-col gap-2 py-1"
    >
      {options.map((option, index) => (
        <button
          key={option.id ?? index}
          type="button"
          role="option"
          aria-selected={false}
          aria-label={`${option.label}, vai trò ${option.sublabel}`}
          onClick={() => onSelect(option.label)}
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl',
            'bg-muted/40 hover:bg-muted transition-colors duration-150',
            'cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cta)] focus-visible:ring-offset-1',
            'active:scale-[0.98] active:transition-transform duration-75',
            'text-left w-full min-h-[44px]',
            'animate-in slide-in-from-bottom-1 duration-200'
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Index badge */}
          <span
            aria-hidden="true"
            className={cn(
              'size-6 rounded-full shrink-0',
              'bg-[var(--color-cta)] text-white',
              'text-xs font-semibold',
              'flex items-center justify-center'
            )}
          >
            {index + 1}
          </span>

          {/* User icon */}
          <User
            aria-hidden="true"
            className="size-4 text-muted-foreground shrink-0"
          />

          {/* Name */}
          <span className="text-sm font-medium text-foreground flex-1 min-w-0">
            {option.label}
          </span>

          {/* Role badge */}
          <RoleBadge role={option.sublabel} />
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Role badge colour helper
// ─────────────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const upperRole = role.toUpperCase()

  const style =
    upperRole === 'ADMIN'
      ? 'bg-[var(--color-cta)]/15 text-[var(--color-cta)]'
      : upperRole === 'STAFF'
      ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
      : 'bg-muted text-muted-foreground'

  return (
    <span
      aria-label={`Vai trò: ${role}`}
      className={cn(
        'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
        style
      )}
    >
      {role}
    </span>
  )
}
