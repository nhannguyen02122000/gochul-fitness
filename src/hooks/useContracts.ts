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
    UpdateContractStatusResponse,
    ContractFilters,
} from '@/app/type/api'

// Query Keys
export const contractKeys = {
    all: ['contracts'] as const,
    lists: () => [...contractKeys.all, 'list'] as const,
    list: (page?: number, limit?: number, filters?: ContractFilters) =>
        [...contractKeys.lists(), { page, limit, filters }] as const,
    details: () => [...contractKeys.all, 'detail'] as const,
    detail: (id: string) => [...contractKeys.details(), id] as const,
}

// Fetch all contracts
async function fetchContracts(
    page: number = 1,
    limit: number = 10,
    filters?: ContractFilters
): Promise<GetAllContractsResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })

    if (filters?.statuses && filters.statuses.length > 0) {
        params.append('statuses', filters.statuses.join(','))
    }

    if (filters?.kind) {
        params.append('kind', filters.kind)
    }

    if (filters?.start_date !== undefined) {
        params.append('start_date', filters.start_date.toString())
    }

    if (filters?.end_date !== undefined) {
        params.append('end_date', filters.end_date.toString())
    }

    if (filters?.sale_by_name?.trim()) {
        params.append('sale_by_name', filters.sale_by_name.trim())
    }

    if (filters?.purchased_by_name?.trim()) {
        params.append('purchased_by_name', filters.purchased_by_name.trim())
    }

    const response = await fetch(`/api/contract/getAll?${params.toString()}`)
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
export function useContracts(page: number = 1, limit: number = 10, filters?: ContractFilters) {
    return useQuery({
        queryKey: contractKeys.list(page, limit, filters),
        queryFn: () => fetchContracts(page, limit, filters)
    })
}

/**
 * Hook to fetch contracts with infinite scrolling
 */
export function useInfiniteContracts(limit: number = 10, filters?: ContractFilters) {
    return useInfiniteQuery({
        queryKey: [...contractKeys.lists(), 'infinite', { limit, filters }],
        queryFn: ({ pageParam = 1 }) => fetchContracts(pageParam, limit, filters),
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
