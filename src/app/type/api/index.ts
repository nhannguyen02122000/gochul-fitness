// API Types for all routes

// ============================================================================
// Common Types
// ============================================================================

export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export type ContractKind = 'PT' | 'REHAB' | 'PT_MONTHLY'

export type ContractStatus = string // Define specific statuses as needed

// ============================================================================
// Entity Types (based on instant.schema.ts)
// ============================================================================

export interface User {
    id: string
    email?: string
}

export interface UserSetting {
    id: string
    role: Role
    clerk_id: string
    first_name?: string
    last_name?: string
    users?: User[]
}

export interface History {
    id: string
    date: number
    status: string
    from: number
    to: number
    users?: User[]
    contract?: Contract
}

export interface Contract {
    id: string
    created_at: number
    start_date?: number
    end_date?: number
    kind: ContractKind
    credits?: number
    status: ContractStatus
    money: number
    sale_by?: string
    users?: User[]
    sale_by_user?: User[]
    history?: History[]
}

// ============================================================================
// API Error Response
// ============================================================================

export interface ApiErrorResponse {
    error: string
}

// ============================================================================
// /api/contract/create
// ============================================================================

export interface CreateContractRequest {
    kind: ContractKind
    status: ContractStatus
    money: number
    start_date?: number
    end_date?: number
    credits?: number
}

export interface CreateContractSuccessResponse {
    contract: Contract
}

export type CreateContractResponse = CreateContractSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/contract/update
// ============================================================================

export interface UpdateContractRequest {
    contract_id: string
    kind?: ContractKind
    status?: ContractStatus
    money?: number
    start_date?: number
    end_date?: number
    credits?: number
    sale_by?: string
}

export interface UpdateContractSuccessResponse {
    contract: Contract
}

export type UpdateContractResponse = UpdateContractSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/contract/delete
// ============================================================================

export interface DeleteContractRequest {
    contract_id: string
}

export interface DeleteContractSuccessResponse {
    message: string
    contract_id: string
}

export type DeleteContractResponse = DeleteContractSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/contract/getAll
// ============================================================================

export interface GetAllContractsRequest {
    page?: string | number
    limit?: string | number
}

export interface PaginationMetadata {
    page: number
    limit: number
    total: number
    hasMore: boolean
}

export interface GetAllContractsSuccessResponse {
    contracts: Contract[]
    pagination: PaginationMetadata
    role: Role
}

export type GetAllContractsResponse = GetAllContractsSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/user/getUserInformation
// ============================================================================

// Clerk User type (simplified - extend as needed)
export interface ClerkUser {
    id: string
    emailAddresses?: Array<{
        emailAddress: string
        id: string
    }>
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string
    username?: string | null
    createdAt?: number
    updatedAt?: number
    [key: string]: unknown // For other Clerk properties
}

export interface GetUserInformationSuccessResponse extends ClerkUser {
    // UserSetting properties merged
    role?: Role
    clerk_id?: string
    first_name?: string
    last_name?: string
    instantUser?: User[]
}

export type GetUserInformationResponse = GetUserInformationSuccessResponse | ApiErrorResponse

