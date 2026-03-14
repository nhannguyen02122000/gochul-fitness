// src/hooks/useUsers.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
    GetAllUsersResponse,
    GetUsersByRoleResponse,
    Role,
    UpdateUserRoleRequest,
    UpdateUserRoleResponse,
    UserManagementFilters,
} from '@/app/type/api'

// Query Keys
export const userKeys = {
    all: ['users'] as const,
    byRole: (role: Role) => [...userKeys.all, 'role', role] as const,
    managementLists: () => [...userKeys.all, 'management'] as const,
    managementList: (page?: number, limit?: number, filters?: UserManagementFilters) =>
        [...userKeys.managementLists(), { page, limit, filters }] as const,
}

// Fetch users by role
async function fetchUsersByRole(role: Role): Promise<GetUsersByRoleResponse> {
    const response = await fetch(`/api/user/getByRole?role=${role}`)
    if (!response.ok) {
        throw new Error('Failed to fetch users')
    }
    return response.json()
}

async function fetchUsers(
    page: number = 1,
    limit: number = 10,
    filters?: UserManagementFilters
): Promise<GetAllUsersResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })

    if (filters?.first_name?.trim()) {
        params.append('first_name', filters.first_name.trim())
    }

    if (filters?.last_name?.trim()) {
        params.append('last_name', filters.last_name.trim())
    }

    const response = await fetch(`/api/user/getAll?${params.toString()}`)
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

export function useInfiniteUsers(limit: number = 10, filters?: UserManagementFilters) {
    return useInfiniteQuery({
        queryKey: [...userKeys.managementLists(), 'infinite', { limit, filters }],
        queryFn: ({ pageParam = 1 }) => fetchUsers(pageParam, limit, filters),
        getNextPageParam: (lastPage) => {
            if ('pagination' in lastPage && lastPage.pagination.hasMore) {
                return lastPage.pagination.page + 1
            }
            return undefined
        },
        initialPageParam: 1
    })
}


async function updateUserRole(payload: UpdateUserRoleRequest): Promise<UpdateUserRoleResponse> {
    const response = await fetch('/api/user/updateRole', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user role')
    }

    return response.json()
}

export function useUpdateUserRole() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateUserRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.managementLists() })
        },
    })
}
