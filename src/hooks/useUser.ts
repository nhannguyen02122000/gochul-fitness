// src/hooks/useUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
    UpdateUserBasicInfoRequest,
    UpdateUserBasicInfoResponse
} from '@/app/type/api'

// Query Keys
export const userKeys = {
    all: ['user'] as const,
    settings: () => [...userKeys.all, 'settings'] as const,
    setting: (id: string) => [...userKeys.settings(), id] as const
}

// Update user basic info
async function updateUserBasicInfo(
    data: UpdateUserBasicInfoRequest
): Promise<UpdateUserBasicInfoResponse> {
    const response = await fetch('/api/user/updateBasicInfo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user basic info')
    }
    return response.json()
}

// Hooks

/**
 * Hook to update user's basic information (first_name and last_name)
 * @example
 * const { mutate, isPending, error } = useUpdateUserBasicInfo()
 * mutate({ 
 *   first_name: 'John', 
 *   last_name: 'Doe' 
 * })
 */
export function useUpdateUserBasicInfo() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateUserBasicInfo,
        onSuccess: () => {
            // Invalidate and refetch user settings
            queryClient.invalidateQueries({ queryKey: userKeys.settings() })
        }
    })
}

