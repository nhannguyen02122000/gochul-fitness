// API Types for all routes

// ============================================================================
// Common Types
// ============================================================================

export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export type ContractKind = 'PT' | 'REHAB' | 'PT_MONTHLY'

export type ContractStatus =
    | 'NEWLY_CREATED'
    | 'ACTIVE'
    | 'CANCELED'
    | 'EXPIRED'

export type HistoryStatus =
    | 'NEWLY_CREATED'
    | 'CHECKED_IN'
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
    imageUrl?: string
    essential_information?: string
    essential_ready?: boolean
    users?: User[]
}

export interface History {
    id: string
    created_at: number
    updated_at: number
    date: number
    status: HistoryStatus
    from: number
    to: number
    teach_by: string
    staff_note?: string
    customer_note?: string
    user_check_in_time?: number
    staff_check_in_time?: number
    users?: User[]
    contract?: Contract
}

export interface Contract {
    id: string
    created_at: number
    updated_at: number
    start_date?: number
    end_date?: number
    kind: ContractKind
    credits?: number
    duration_per_session: number
    used_credits?: number // Number of history records with status NEWLY_CREATED or CHECKED_IN
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

export interface RealtimeTokenSuccessResponse {
    keyName: string
    ttl: number
    capability: string
    clientId: string
    timestamp: number
    nonce: string
    mac: string
}

export type RealtimeTokenResponse = RealtimeTokenSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/contract/create
// ============================================================================

export interface CreateContractRequest {
    kind: ContractKind
    money: number
    purchased_by: string
    duration_per_session: number
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
    duration_per_session: number
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

export interface ContractFilters {
    statuses?: ContractStatus[]
    kind?: ContractKind
    start_date?: number
    end_date?: number
    sale_by_name?: string
    purchased_by_name?: string
}

export interface GetAllContractsRequest extends ContractFilters {
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
    essential_information?: string
    essential_ready?: boolean
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
// /api/user/updateEssentialInformation
// ============================================================================

export interface UpdateEssentialInformationRequest {
    essential_information: string
    is_submit: boolean
}

export interface UpdateEssentialInformationSuccessResponse {
    user_setting: UserSetting
}

export type UpdateEssentialInformationResponse =
    | UpdateEssentialInformationSuccessResponse
    | ApiErrorResponse

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
    teach_by_name?: string
    customer_name?: string
    from_minute?: string | number
    to_minute?: string | number
}

export interface HistoryFilters {
    statuses?: HistoryStatus[]
    start_date?: number
    end_date?: number
    teach_by_name?: string
    customer_name?: string
    from_minute?: number
    to_minute?: number
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

export type LastCheckInBy = 'CUSTOMER' | 'STAFF' | 'ADMIN' | null

export interface UpdateHistoryStatusSuccessResponse {
    history: History
    last_check_in_by: LastCheckInBy
}

export type UpdateHistoryStatusResponse = UpdateHistoryStatusSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/history/updateNote
// ============================================================================

export interface UpdateHistoryNoteRequest {
    history_id: string
    note: string
}

export interface UpdateHistoryNoteSuccessResponse {
    history: History
}

export type UpdateHistoryNoteResponse = UpdateHistoryNoteSuccessResponse | ApiErrorResponse

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
// /api/user/getAll
// ============================================================================

export interface UserManagementFilters {
    first_name?: string
    last_name?: string
}

export interface GetAllUsersRequest extends UserManagementFilters {
    page?: string | number
    limit?: string | number
}

export interface GetAllUsersSuccessResponse {
    users: UserSetting[]
    pagination: PaginationMetadata
    role: Role
}

export type GetAllUsersResponse = GetAllUsersSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/user/updateRole
// ============================================================================

export interface UpdateUserRoleRequest {
    uid: string
    role: Role
}

export interface UpdateUserRoleSuccessResponse {
    message: string
    user_setting: UserSetting
}

export type UpdateUserRoleResponse = UpdateUserRoleSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/history/getOccupiedTimeSlots
// ============================================================================

export interface GetOccupiedTimeSlotsRequest {
    user_id: string
    date: number
}

export interface OccupiedSlot {
    from: number
    to: number
}

export interface GetOccupiedTimeSlotsSuccessResponse {
    occupied_slots: OccupiedSlot[]
}

export type GetOccupiedTimeSlotsResponse = GetOccupiedTimeSlotsSuccessResponse | ApiErrorResponse

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

// ============================================================================
// /api/history/getByContract
// ============================================================================

export interface GetHistoryByContractRequest {
    contract_id: string
}

export interface GetHistoryByContractSuccessResponse {
    history: History[]
    contract: Contract
    role: Role
}

export type GetHistoryByContractResponse = GetHistoryByContractSuccessResponse | ApiErrorResponse

// ============================================================================
// User Search (AI Chatbot)
// ============================================================================

export interface UserMatch {
  instant_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  role: Role
  match_index: number
}

export interface UserSearchSuccessResponse {
  users: UserMatch[]
  pagination: {
    total: number
  }
}

export type UserSearchResponse = UserSearchSuccessResponse | ApiErrorResponse

// ============================================================================
// /api/admin/migrateContractStatuses
// ============================================================================

export type DeprecatedContractStatus = 'CUSTOMER_REVIEW' | 'CUSTOMER_CONFIRMED' | 'CUSTOMER_PAID' | 'PT_CONFIRMED'

export interface MigrateContractStatusesPreviewContract {
    id: string
    current_status: DeprecatedContractStatus
    start_date: number | null
    purchased_by: string
    kind: ContractKind
}

export interface MigrateContractStatusesPreview {
    counts: {
        CUSTOMER_REVIEW: number
        CUSTOMER_CONFIRMED: number
        CUSTOMER_PAID: number
        PT_CONFIRMED: number
    }
    total: number
    contracts: MigrateContractStatusesPreviewContract[]
}

export interface MigrateContractStatusesSuccessResponse {
    message: string
    migrated: number
    by_status: {
        CUSTOMER_REVIEW: number
        CUSTOMER_CONFIRMED: number
        CUSTOMER_PAID: number
        PT_CONFIRMED: number
    }
}

export type MigrateContractStatusesResponse = MigrateContractStatusesSuccessResponse | ApiErrorResponse
