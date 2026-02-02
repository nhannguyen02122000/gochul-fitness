// src/hooks/useContracts.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
    CreateContractRequest,
    CreateContractResponse,
    DeleteContractRequest,
    DeleteContractResponse,
    GetAllContractsResponse,
    UpdateContractRequest,
    UpdateContractResponse,
    UpdateContractStatusRequest,
    UpdateContractStatusResponse
} from '@/app/type/api'

// Query Keys
export const contractKeys = {
    all: ['contracts'] as const,
    lists: () => [...contractKeys.all, 'list'] as const,
    list: (page?: number, limit?: number) =>
        [...contractKeys.lists(), { page, limit }] as const,
    details: () => [...contractKeys.all, 'detail'] as const,
    detail: (id: string) => [...contractKeys.details(), id] as const
}

// Fetch all contracts
async function fetchContracts(
    page: number = 1,
    limit: number = 10
): Promise<GetAllContractsResponse> {
    const response = await fetch(
        `/api/contract/getAll?page=${page}&limit=${limit}`
    )
    if (!response.ok) {
        throw new Error('Failed to fetch contracts')
    }
    return response.json()
}

// Create contract
async function createContract(
    data: CreateContractRequest
): Promise<CreateContractResponse> {
    const response = await fetch('/api/contract/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create contract')
    }
    return response.json()
}

// Update contract
async function updateContract(
    data: UpdateContractRequest
): Promise<UpdateContractResponse> {
    const response = await fetch('/api/contract/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update contract')
    }
    return response.json()
}

// Delete contract
async function deleteContract(
    data: DeleteContractRequest
): Promise<DeleteContractResponse> {
    const response = await fetch('/api/contract/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete contract')
    }
    return response.json()
}

// Update contract status
async function updateContractStatus(
    data: UpdateContractStatusRequest
): Promise<UpdateContractStatusResponse> {
    const response = await fetch('/api/contract/updateStatus', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update contract status')
    }
    return response.json()
}

// Hooks

/**
 * Hook to fetch all contracts with pagination (standard pagination)
 * @example
 * const { data, isLoading, error } = useContracts(1, 10)
 */
export function useContracts(page: number = 1, limit: number = 10) {
    return useQuery({
        queryKey: contractKeys.list(page, limit),
        queryFn: () => fetchContracts(page, limit)
    })
}

/**
 * Hook to fetch contracts with infinite scrolling
 * @example
 * const { 
 *   data, 
 *   isLoading, 
 *   error, 
 *   fetchNextPage, 
 *   hasNextPage, 
 *   isFetchingNextPage 
 * } = useInfiniteContracts(10)
 * 
 * // Access all contracts across pages:
 * const allContracts = data?.pages.flatMap(page => page.contracts) ?? []
 * 
 * // Load more:
 * <Button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
 *   {isFetchingNextPage ? 'Loading...' : hasNextPage ? 'Load More' : 'No more data'}
 * </Button>
 */
export function useInfiniteContracts(limit: number = 10) {
    return useInfiniteQuery({
        queryKey: [...contractKeys.lists(), 'infinite', { limit }],
        queryFn: ({ pageParam = 1 }) => fetchContracts(pageParam, limit),
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
 * Hook to create a new contract
 * @example
 * const { mutate, isPending } = useCreateContract()
 * mutate({ kind: 'PT', status: 'ACTIVE', money: 5000 })
 */
export function useCreateContract() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createContract,
        onSuccess: () => {
            // Invalidate and refetch contracts list
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
        }
    })
}

/**
 * Hook to update an existing contract
 * @example
 * const { mutate, isPending } = useUpdateContract()
 * mutate({ contract_id: '123', status: 'COMPLETED' })
 */
export function useUpdateContract() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateContract,
        onSuccess: () => {
            // Invalidate and refetch contracts list
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
        }
    })
}

/**
 * Hook to delete a contract
 * @example
 * const { mutate, isPending } = useDeleteContract()
 * mutate({ contract_id: '123' })
 */
export function useDeleteContract() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteContract,
        onSuccess: () => {
            // Invalidate and refetch contracts list
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
        }
    })
}

/**
 * Hook to update contract status
 * @example
 * const { mutate, isPending } = useUpdateContractStatus()
 * mutate({ contract_id: '123', status: 'CUSTOMER_REVIEW' })
 */
export function useUpdateContractStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateContractStatus,
        onSuccess: () => {
            // Invalidate and refetch contracts list
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
        }
    })
}

