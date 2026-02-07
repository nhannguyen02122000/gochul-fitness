// API Types for all routes

// ============================================================================
// Common Types
// ============================================================================

export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export type ContractKind = 'PT' | 'REHAB' | 'PT_MONTHLY'

export type ContractStatus =
    | 'NEWLY_CREATED'
    | 'CUSTOMER_REVIEW'
    | 'CUSTOMER_CONFIRMED'
    | 'ACTIVE'
    | 'CANCELED'
    | 'EXPIRED'

export type HistoryStatus =
    | 'NEWLY_CREATED'
    | 'PT_CONFIRMED'
    | 'USER_CHECKED_IN'
    | 'PT_CHECKED_IN'
    | 'CANCELED'
    | 'EXPIRED'

// ============================================================================
// Entity Types (based on instant.schema.ts)
// ============================================================================

export interface User {
    id: string
    email?: string
    user_setting?: UserSetting[]
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
    status: HistoryStatus
    from: number
    to: number
    teach_by: string
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
    purchased_by: string
    users?: User[]
    sale_by_user?: User[]
    purchased_by_user?: User[]
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
    money: number
    purchased_by: string
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
    purchased_by?: string
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

// ============================================================================
// /api/user/updateBasicInfo
// ============================================================================

export interface UpdateUserBasicInfoRequest {
    first_name?: string
    last_name?: string
}

export interface UpdateUserBasicInfoSuccessResponse {
    user_setting: UserSetting
}

export type UpdateUserBasicInfoResponse = UpdateUserBasicInfoSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/history/create
// ============================================================================

export interface CreateHistoryRequest {
    contract_id: string
    date: number
    from: number
    to: number
}

export interface CreateHistorySuccessResponse {
    history: History
}

export type CreateHistoryResponse = CreateHistorySuccessResponse | ApiErrorResponse

// ============================================================================
// /api/history/update
// ============================================================================

export interface UpdateHistoryRequest {
    history_id: string
    date?: number
    from?: number
    to?: number
    status?: HistoryStatus
}

export interface UpdateHistorySuccessResponse {
    history: History
}

export type UpdateHistoryResponse = UpdateHistorySuccessResponse | ApiErrorResponse

// ============================================================================
// /api/history/delete
// ============================================================================

export interface DeleteHistoryRequest {
    history_id: string
}

export interface DeleteHistorySuccessResponse {
    message: string
    history_id: string
}

export type DeleteHistoryResponse = DeleteHistorySuccessResponse | ApiErrorResponse

// ============================================================================
// /api/history/getAll
// ============================================================================

export interface GetAllHistoryRequest {
    page?: string | number
    limit?: string | number
    statuses?: string
    start_date?: string | number
    end_date?: string | number
}

export interface GetAllHistorySuccessResponse {
    history: History[]
    pagination: PaginationMetadata
    role: Role
}

export type GetAllHistoryResponse = GetAllHistorySuccessResponse | ApiErrorResponse

// ============================================================================
// /api/contract/updateStatus
// ============================================================================

export interface UpdateContractStatusRequest {
    contract_id: string
    status: ContractStatus
}

export interface UpdateContractStatusSuccessResponse {
    contract: Contract
}

export type UpdateContractStatusResponse = UpdateContractStatusSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/history/updateStatus
// ============================================================================

export interface UpdateHistoryStatusRequest {
    history_id: string
    status: HistoryStatus
}

export interface UpdateHistoryStatusSuccessResponse {
    history: History
}

export type UpdateHistoryStatusResponse = UpdateHistoryStatusSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/user/getByRole
// ============================================================================

export interface GetUsersByRoleRequest {
    role?: string
}

export interface GetUsersByRoleSuccessResponse {
    users: UserSetting[]
}

export type GetUsersByRoleResponse = GetUsersByRoleSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/history/getOccupiedTimeSlots
// ============================================================================

export interface GetTrainerScheduleRequest {
    user_id: string
    date: number
}

export interface OccupiedSlot {
    from: number
    to: number
}

export interface GetTrainerScheduleSuccessResponse {
    occupied_slots: OccupiedSlot[]
}

export type GetTrainerScheduleResponse = GetTrainerScheduleSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/user/checkUserSetting
// ============================================================================

export interface CheckUserSettingSuccessResponse {
    exists: boolean
    user_setting?: UserSetting
}

export type CheckUserSettingResponse = CheckUserSettingSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/user/createUserSetting
// ============================================================================

export interface CreateUserSettingRequest {
    first_name: string
    last_name: string
}

export interface CreateUserSettingSuccessResponse {
    user_setting: UserSetting
}

export type CreateUserSettingResponse = CreateUserSettingSuccessResponse | ApiErrorResponse

