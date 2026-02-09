// src/hooks/useHistory.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
    CreateHistoryRequest,
    CreateHistoryResponse,
    DeleteHistoryRequest,
    DeleteHistoryResponse,
    GetAllHistoryResponse,
    GetTrainerScheduleResponse,
    UpdateHistoryRequest,
    UpdateHistoryResponse,
    UpdateHistoryStatusRequest,
    UpdateHistoryStatusResponse
} from '@/app/type/api'
import { contractKeys } from './useContracts'

// Query Keys
export const historyKeys = {
    all: ['history'] as const,
    lists: () => [...historyKeys.all, 'list'] as const,
    list: (filters?: HistoryFilters) =>
        [...historyKeys.lists(), filters] as const,
    details: () => [...historyKeys.all, 'detail'] as const,
    detail: (id: string) => [...historyKeys.details(), id] as const
}

// Filter options for history queries
export interface HistoryFilters {
    statuses?: string
    start_date?: number
    end_date?: number
}

// Fetch all history
async function fetchHistory(
    page: number = 1,
    limit: number = 10,
    filters?: HistoryFilters
): Promise<GetAllHistoryResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
    })

    if (filters?.statuses) {
        params.append('statuses', filters.statuses)
    }
    if (filters?.start_date !== undefined) {
        params.append('start_date', filters.start_date.toString())
    }
    if (filters?.end_date !== undefined) {
        params.append('end_date', filters.end_date.toString())
    }

    const response = await fetch(`/api/history/getAll?${params.toString()}`)
    if (!response.ok) {
        throw new Error('Failed to fetch history')
    }
    return response.json()
}

// Create history
async function createHistory(
    data: CreateHistoryRequest
): Promise<CreateHistoryResponse> {
    const response = await fetch('/api/history/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create history')
    }
    return response.json()
}

// Update history
async function updateHistory(
    data: UpdateHistoryRequest
): Promise<UpdateHistoryResponse> {
    const response = await fetch('/api/history/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update history')
    }
    return response.json()
}

// Delete history
async function deleteHistory(
    data: DeleteHistoryRequest
): Promise<DeleteHistoryResponse> {
    const response = await fetch('/api/history/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete history')
    }
    return response.json()
}

// Update history status
async function updateHistoryStatus(
    data: UpdateHistoryStatusRequest
): Promise<UpdateHistoryStatusResponse> {
    const response = await fetch('/api/history/updateStatus', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update history status')
    }
    return response.json()
}

// Hooks

/**
 * Hook to fetch history with infinite scrolling
 * @example
 * const { 
 *   data, 
 *   isLoading, 
 *   error, 
 *   fetchNextPage, 
 *   hasNextPage, 
 *   isFetchingNextPage 
 * } = useInfiniteHistory(10, { statuses: 'ACTIVE,NEWLY_CREATED' })
 * 
 * // Access all history across pages:
 * const allHistory = data?.pages.flatMap(page => page.history) ?? []
 * 
 * // Load more:
 * <Button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
 *   {isFetchingNextPage ? 'Loading...' : hasNextPage ? 'Load More' : 'No more data'}
 * </Button>
 */
export function useInfiniteHistory(limit: number = 10, filters?: HistoryFilters) {
    return useInfiniteQuery({
        queryKey: [...historyKeys.lists(), 'infinite', { limit, filters }],
        queryFn: ({ pageParam = 1 }) => fetchHistory(pageParam, limit, filters),
        getNextPageParam: (lastPage) => {
            // Check if there are more pages to load
            if ('pagination' in lastPage && lastPage.pagination.hasMore) {
                return lastPage.pagination.page + 1
            }
            return undefined // No more pages
        },
        initialPageParam: 1
    })
}

/**
 * Hook to create a new history record (session)
 * @example
 * const { mutate, isPending } = useCreateHistory()
 * mutate({ 
 *   contract_id: '123', 
 *   date: Date.now(), 
 *   from: 480, // 8:00 AM
 *   to: 540    // 9:00 AM
 * })
 */
export function useCreateHistory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createHistory,
        onSuccess: () => {
            // Invalidate and refetch history list
            queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
            // Also invalidate contracts since creating a session may affect contract credits
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
        }
    })
}

/**
 * Hook to update an existing history record
 * @example
 * const { mutate, isPending } = useUpdateHistory()
 * mutate({ 
 *   history_id: '123', 
 *   status: 'PT_CONFIRMED',
 *   from: 480,
 *   to: 540
 * })
 */
export function useUpdateHistory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateHistory,
        onSuccess: () => {
            // Invalidate and refetch history list
            queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
        }
    })
}

/**
 * Hook to delete (cancel) a history record
 * @example
 * const { mutate, isPending } = useDeleteHistory()
 * mutate({ history_id: '123' })
 */
export function useDeleteHistory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteHistory,
        onSuccess: () => {
            // Invalidate and refetch history list
            queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
        }
    })
}

/**
 * Hook to update history status
 * @example
 * const { mutate, isPending } = useUpdateHistoryStatus()
 * mutate({ history_id: '123', status: 'PT_CONFIRMED' })
 */
export function useUpdateHistoryStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateHistoryStatus,
        onSuccess: () => {
            // Invalidate and refetch history list
            queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
            // Invalidate contracts after 2 seconds to refresh used_credits count
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
            }, 2000)
        }
    })
}

// Fetch trainer schedule (occupied time slots)
async function fetchTrainerSchedule(
    userId: string,
    date: number
): Promise<GetTrainerScheduleResponse> {
    const params = new URLSearchParams({
        user_id: userId,
        date: date.toString()
    })

    const response = await fetch(`/api/history/getOccupiedTimeSlots?${params.toString()}`)
    if (!response.ok) {
        throw new Error('Failed to fetch trainer schedule')
    }
    return response.json()
}

/**
 * Hook to fetch trainer's occupied time slots for a specific date
 * @param userId - Trainer's user ID (from contract.sale_by)
 * @param date - Date timestamp (start of day)
 * @returns Occupied time slots for the trainer on that date
 * @example
 * const { data, isLoading } = useTrainerSchedule(trainerId, selectedDate)
 * const occupiedSlots = data?.occupied_slots ?? []
 */
export function useTrainerSchedule(userId: string | undefined, date: number | undefined) {
    return useQuery({
        queryKey: ['history', 'trainer-schedule', userId, date],
        queryFn: () => fetchTrainerSchedule(userId!, date!),
        enabled: !!userId && !!date,
        staleTime: 1000 * 30 // 30 seconds - keep data fresh for scheduling
    })
}

