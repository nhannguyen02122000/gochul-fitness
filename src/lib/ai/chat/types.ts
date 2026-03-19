import type { ContractStatus } from '@/app/type/api'

export type PlannerActionType =
    | 'get_contracts'
    | 'get_sessions'
    | 'create_session'
    | 'check_in_session'
    | 'cancel_session'
    | 'create_contract'
    | 'update_contract_status'

export interface GetContractsArgs {
    page?: number
    limit?: number
    statuses?: string[]
    kind?: 'PT' | 'REHAB' | 'PT_MONTHLY'
    start_date?: number
    end_date?: number
    sale_by_name?: string
    purchased_by_name?: string
}

export interface GetSessionsArgs {
    page?: number
    limit?: number
    statuses?: string[]
    start_date?: number
    end_date?: number
    teach_by_name?: string
    customer_name?: string
    from_minute?: number
    to_minute?: number
}

export interface CreateSessionArgs {
    contract_id: string
    date: number
    from: number
    to: number
}

export interface CheckInSessionArgs {
    history_id: string
}

export interface CancelSessionArgs {
    history_id: string
}

export interface CreateContractArgs {
    kind: 'PT' | 'REHAB' | 'PT_MONTHLY'
    money: number
    purchased_by: string
    duration_per_session: number
    start_date?: number
    end_date?: number
    credits?: number
}

export interface UpdateContractStatusArgs {
    contract_id: string
    status: ContractStatus
}

export interface PlannerAction {
    type: PlannerActionType
    args:
    | GetContractsArgs
    | GetSessionsArgs
    | CreateSessionArgs
    | CheckInSessionArgs
    | CancelSessionArgs
    | CreateContractArgs
    | UpdateContractStatusArgs
    reason: string
}

export interface PlannerResponse {
    locale: 'vi' | 'en'
    user_intent: string
    requires_confirmation: boolean
    confirmation_message?: string
    actions: PlannerAction[]
}

export interface ConversationHistoryItem {
    role: 'user' | 'assistant'
    content: string
}

export interface PlanRequestBody {
    message: string
    conversationLocale?: 'vi' | 'en'
    conversationHistory?: ConversationHistoryItem[]
}

export interface StreamRequestBody {
    message: string
    plan: PlannerResponse
    confirmed?: boolean
    conversationLocale?: 'vi' | 'en'
    conversationHistory?: ConversationHistoryItem[]
}

export interface ExecutedToolResult {
    action: PlannerAction
    ok: boolean
    status: number
    data: unknown
}

const CONTRACT_KIND_SET = new Set(['PT', 'REHAB', 'PT_MONTHLY'])
const CONTRACT_STATUS_SET = new Set<ContractStatus>([
    'NEWLY_CREATED',
    'CUSTOMER_REVIEW',
    'CUSTOMER_CONFIRMED',
    'CUSTOMER_PAID',
    'PT_CONFIRMED',
    'ACTIVE',
    'CANCELED',
    'EXPIRED'
])
const ACTION_SET = new Set<PlannerActionType>([
    'get_contracts',
    'get_sessions',
    'create_session',
    'check_in_session',
    'cancel_session',
    'create_contract',
    'update_contract_status'
])

// Actions that always require user confirmation before execution
export const WRITE_ACTIONS = new Set<PlannerActionType>([
    'create_session',
    'cancel_session',
    'check_in_session',
    'create_contract',
    'update_contract_status'
])

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asNumberOrUndefined(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
    return value
}

function asStringOrUndefined(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const next = value.trim()
    return next.length ? next : undefined
}

function asStringArrayOrUndefined(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined
    const normalized = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    return normalized.length ? normalized : undefined
}

function normalizeGetContractsArgs(value: unknown): GetContractsArgs {
    const obj = isRecord(value) ? value : {}
    const kind = asStringOrUndefined(obj.kind)

    return {
        page: asNumberOrUndefined(obj.page),
        limit: asNumberOrUndefined(obj.limit),
        statuses: asStringArrayOrUndefined(obj.statuses),
        kind: kind && CONTRACT_KIND_SET.has(kind) ? (kind as GetContractsArgs['kind']) : undefined,
        start_date: asNumberOrUndefined(obj.start_date),
        end_date: asNumberOrUndefined(obj.end_date),
        sale_by_name: asStringOrUndefined(obj.sale_by_name),
        purchased_by_name: asStringOrUndefined(obj.purchased_by_name)
    }
}

function normalizeGetSessionsArgs(value: unknown): GetSessionsArgs {
    const obj = isRecord(value) ? value : {}

    return {
        page: asNumberOrUndefined(obj.page),
        limit: asNumberOrUndefined(obj.limit),
        statuses: asStringArrayOrUndefined(obj.statuses),
        start_date: asNumberOrUndefined(obj.start_date),
        end_date: asNumberOrUndefined(obj.end_date),
        teach_by_name: asStringOrUndefined(obj.teach_by_name),
        customer_name: asStringOrUndefined(obj.customer_name),
        from_minute: asNumberOrUndefined(obj.from_minute),
        to_minute: asNumberOrUndefined(obj.to_minute)
    }
}

function normalizeCreateSessionArgs(value: unknown): CreateSessionArgs | null {
    const obj = isRecord(value) ? value : {}

    const contract_id = asStringOrUndefined(obj.contract_id)
    const date = asNumberOrUndefined(obj.date)
    const from = asNumberOrUndefined(obj.from)
    const to = asNumberOrUndefined(obj.to)

    if (!contract_id || date === undefined || from === undefined || to === undefined) {
        return null
    }

    return { contract_id, date, from, to }
}

function normalizeCheckInSessionArgs(value: unknown): CheckInSessionArgs | null {
    const obj = isRecord(value) ? value : {}
    const history_id = asStringOrUndefined(obj.history_id)
    if (!history_id) return null
    return { history_id }
}

function normalizeCancelSessionArgs(value: unknown): CancelSessionArgs | null {
    const obj = isRecord(value) ? value : {}
    const history_id = asStringOrUndefined(obj.history_id)
    if (!history_id) return null
    return { history_id }
}

function normalizeCreateContractArgs(value: unknown): CreateContractArgs | null {
    const obj = isRecord(value) ? value : {}

    const kind = asStringOrUndefined(obj.kind)
    const money = asNumberOrUndefined(obj.money)
    const purchased_by = asStringOrUndefined(obj.purchased_by)
    const duration_per_session = asNumberOrUndefined(obj.duration_per_session)

    if (!kind || !CONTRACT_KIND_SET.has(kind)) return null
    if (money === undefined) return null
    if (!purchased_by) return null
    if (
        duration_per_session === undefined ||
        !Number.isInteger(duration_per_session) ||
        duration_per_session < 15 ||
        duration_per_session > 180 ||
        duration_per_session % 15 !== 0
    ) {
        return null
    }

    return {
        kind: kind as CreateContractArgs['kind'],
        money,
        purchased_by,
        duration_per_session,
        start_date: asNumberOrUndefined(obj.start_date),
        end_date: asNumberOrUndefined(obj.end_date),
        credits: asNumberOrUndefined(obj.credits)
    }
}

function normalizeUpdateContractStatusArgs(value: unknown): UpdateContractStatusArgs | null {
    const obj = isRecord(value) ? value : {}
    const contract_id = asStringOrUndefined(obj.contract_id)
    const status = asStringOrUndefined(obj.status)

    if (!contract_id) return null
    if (!status || !CONTRACT_STATUS_SET.has(status as ContractStatus)) return null

    return { contract_id, status: status as ContractStatus }
}

function normalizeAction(value: unknown): PlannerAction | null {
    if (!isRecord(value)) return null

    const type = asStringOrUndefined(value.type)
    if (!type || !ACTION_SET.has(type as PlannerActionType)) return null

    const reason = asStringOrUndefined(value.reason) || 'No reason provided'

    if (type === 'get_contracts') {
        return { type: 'get_contracts', reason, args: normalizeGetContractsArgs(value.args) }
    }

    if (type === 'get_sessions') {
        return { type: 'get_sessions', reason, args: normalizeGetSessionsArgs(value.args) }
    }

    if (type === 'create_session') {
        const args = normalizeCreateSessionArgs(value.args)
        if (!args) return null
        return { type: 'create_session', reason, args }
    }

    if (type === 'check_in_session') {
        const args = normalizeCheckInSessionArgs(value.args)
        if (!args) return null
        return { type: 'check_in_session', reason, args }
    }

    if (type === 'cancel_session') {
        const args = normalizeCancelSessionArgs(value.args)
        if (!args) return null
        return { type: 'cancel_session', reason, args }
    }

    if (type === 'create_contract') {
        const args = normalizeCreateContractArgs(value.args)
        if (!args) return null
        return { type: 'create_contract', reason, args }
    }

    if (type === 'update_contract_status') {
        const args = normalizeUpdateContractStatusArgs(value.args)
        if (!args) return null
        return { type: 'update_contract_status', reason, args }
    }

    return null
}

export function validatePlannerResponse(value: unknown): PlannerResponse {
    if (!isRecord(value)) {
        throw new Error('Planner output is not an object')
    }

    const localeRaw = asStringOrUndefined(value.locale)
    const locale: PlannerResponse['locale'] = localeRaw === 'en' ? 'en' : 'vi'

    const user_intent = asStringOrUndefined(value.user_intent)
    if (!user_intent) {
        throw new Error('Planner output missing user_intent')
    }

    const requires_confirmation = Boolean(value.requires_confirmation)

    const rawActions = Array.isArray(value.actions) ? value.actions : []
    const actions = rawActions
        .map((action) => normalizeAction(action))
        .filter((action): action is PlannerAction => action !== null)
        .slice(0, 4)

    if (actions.length === 0) {
        throw new Error('Planner output has no valid actions')
    }

    const hasWriteAction = actions.some((action) => WRITE_ACTIONS.has(action.type))

    return {
        locale,
        user_intent,
        requires_confirmation: hasWriteAction ? true : requires_confirmation,
        confirmation_message: asStringOrUndefined(value.confirmation_message),
        actions
    }
}
