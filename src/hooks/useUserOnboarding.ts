// src/hooks/useUserOnboarding.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
    CheckUserSettingResponse,
    CreateUserSettingRequest,
    CreateUserSettingResponse
} from '@/app/type/api'

// Query Keys
export const userOnboardingKeys = {
    all: ['userOnboarding'] as const,
    check: () => [...userOnboardingKeys.all, 'check'] as const
}

// Check if user_setting exists
async function checkUserSetting(): Promise<CheckUserSettingResponse> {
    const response = await fetch('/api/user/checkUserSetting')
    
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to check user setting')
    }
    
    return response.json()
}

// Create user_setting
async function createUserSetting(data: CreateUserSettingRequest): Promise<CreateUserSettingResponse> {
    const response = await fetch('/api/user/createUserSetting', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user setting')
    }
    
    return response.json()
}

// Hook to check if user_setting exists
export function useCheckUserSetting(enabled: boolean = true) {
    return useQuery({
        queryKey: userOnboardingKeys.check(),
        queryFn: checkUserSetting,
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1
    })
}

// Hook to create user_setting
export function useCreateUserSetting() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: createUserSetting,
        onSuccess: () => {
            // Invalidate check query to refetch
            queryClient.invalidateQueries({ queryKey: userOnboardingKeys.check() })
            // Also invalidate user info query
            queryClient.invalidateQueries({ queryKey: ['userInfo'] })
        }
    })
}

