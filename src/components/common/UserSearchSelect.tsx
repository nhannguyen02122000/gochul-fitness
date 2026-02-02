// src/components/common/UserSearchSelect.tsx
'use client'

import { Select, Spin } from 'antd'
import { useCustomers } from '@/hooks/useUsers'
import { useMemo } from 'react'

interface UserSearchSelectProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function UserSearchSelect({
  value,
  onChange,
  placeholder = 'Search for customer...',
  disabled = false
}: UserSearchSelectProps) {
  const { data, isLoading } = useCustomers()

  const options = useMemo(() => {
    if (!data || 'error' in data) return []

    return data.users.map(user => {
      const userId = user.users?.[0]?.id || ''
      const email = user.users?.[0]?.email || 'No email'
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'No name'

      return {
        value: userId,
        label: `${fullName} (${email})`,
        searchtext: `${fullName} ${email}`.toLowerCase()
      }
    })
  }, [data])

  const filterOption = (input: string, option?: { label: string; value: string; searchtext: string }) => {
    if (!option) return false
    return option.searchtext.includes(input.toLowerCase())
  }

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled || isLoading}
      options={options}
      filterOption={filterOption}
      notFoundContent={isLoading ? <Spin size="small" /> : 'No customers found'}
      className="w-full"
    />
  )
}

