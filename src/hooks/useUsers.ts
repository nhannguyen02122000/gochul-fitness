// src/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query'
import type { GetUsersByRoleResponse, Role } from '@/app/type/api'

// Query Keys
export const userKeys = {
    all: ['users'] as const,
    byRole: (role: Role) => [...userKeys.all, 'role', role] as const
}

// Fetch users by role
async function fetchUsersByRole(role: Role): Promise<GetUsersByRoleResponse> {
    const response = await fetch(`/api/user/getByRole?role=${role}`)
    if (!response.ok) {
        throw new Error('Failed to fetch users')
    }
    return response.json()
}

/**
 * Hook to fetch all customers
 * @example
 * const { data, isLoading, error } = useCustomers()
 * const customers = data?.users || []
 */
export function useCustomers() {
    return useQuery({
        queryKey: userKeys.byRole('CUSTOMER'),
        queryFn: () => fetchUsersByRole('CUSTOMER')
    })
}

/**
 * Hook to fetch all staff members
 * @example
 * const { data, isLoading, error } = useStaff()
 * const staff = data?.users || []
 */
export function useStaff() {
    return useQuery({
        queryKey: userKeys.byRole('STAFF'),
        queryFn: () => fetchUsersByRole('STAFF')
    })
}

/**
 * Hook to fetch all admins
 * @example
 * const { data, isLoading, error } = useAdmins()
 * const admins = data?.users || []
 */
export function useAdmins() {
    return useQuery({
        queryKey: userKeys.byRole('ADMIN'),
        queryFn: () => fetchUsersByRole('ADMIN')
    })
}

