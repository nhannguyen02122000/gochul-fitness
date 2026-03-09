// src/components/common/UserSearchSelect.tsx
'use client'

import { useCustomers } from '@/hooks/useUsers'
import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserSearchSelectProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function UserSearchSelect({
  value,
  onChange,
  placeholder = 'Select customer...',
  disabled = false
}: UserSearchSelectProps) {
  const { data, isLoading } = useCustomers()
  const [open, setOpen] = useState(false)

  const options = useMemo(() => {
    if (!data || 'error' in data) return []

    return data.users.map(user => {
      const userId = user.users?.[0]?.id || ''
      const email = user.users?.[0]?.email || 'No email'
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'No name'

      return {
        value: userId,
        label: fullName,
        email,
        searchText: `${fullName} ${email}`.toLowerCase()
      }
    })
  }, [data])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" />}
        role="combobox"
        aria-expanded={open}
        disabled={disabled || isLoading}
        className="w-full justify-between h-10 font-normal text-sm"
      >
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </span>
        ) : selectedOption ? (
          <span className="truncate">{selectedOption.label}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or email..." />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.searchText}
                  onSelect={() => {
                    onChange?.(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate">{option.label}</span>
                    <span className="text-xs text-muted-foreground truncate">{option.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
