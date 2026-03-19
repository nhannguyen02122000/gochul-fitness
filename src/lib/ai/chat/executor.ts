import type {
    CancelSessionArgs,
    CheckInSessionArgs,
    CreateContractArgs,
    CreateSessionArgs,
    ExecutedToolResult,
    GetContractsArgs,
    GetSessionsArgs,
    PlannerAction,
    PlannerResponse,
    UpdateContractStatusArgs
} from './types'
import { WRITE_ACTIONS } from './types'

function getOriginFromRequest(request: Request): string {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
}

function buildContractsQuery(args: GetContractsArgs): URLSearchParams {
    const params = new URLSearchParams()

    if (typeof args.page === 'number') params.set('page', String(args.page))
    if (typeof args.limit === 'number') params.set('limit', String(args.limit))
    if (args.statuses?.length) params.set('statuses', args.statuses.join(','))
    if (args.kind) params.set('kind', args.kind)
    if (typeof args.start_date === 'number') params.set('start_date', String(args.start_date))
    if (typeof args.end_date === 'number') params.set('end_date', String(args.end_date))
    if (args.sale_by_name) params.set('sale_by_name', args.sale_by_name)
    if (args.purchased_by_name) params.set('purchased_by_name', args.purchased_by_name)

    if (!params.has('page')) params.set('page', '1')
    if (!params.has('limit')) params.set('limit', '10')

    return params
}

function buildSessionsQuery(args: GetSessionsArgs): URLSearchParams {
    const params = new URLSearchParams()

    if (typeof args.page === 'number') params.set('page', String(args.page))
    if (typeof args.limit === 'number') params.set('limit', String(args.limit))
    if (args.statuses?.length) params.set('statuses', args.statuses.join(','))
    if (typeof args.start_date === 'number') params.set('start_date', String(args.start_date))
    if (typeof args.end_date === 'number') params.set('end_date', String(args.end_date))
    if (args.teach_by_name) params.set('teach_by_name', args.teach_by_name)
    if (args.customer_name) params.set('customer_name', args.customer_name)
    if (typeof args.from_minute === 'number') params.set('from_minute', String(args.from_minute))
    if (typeof args.to_minute === 'number') params.set('to_minute', String(args.to_minute))

    if (!params.has('page')) params.set('page', '1')
    if (!params.has('limit')) params.set('limit', '10')

    return params
}

function baseForwardHeaders(request: Request): HeadersInit {
    const cookie = request.headers.get('cookie')

    return {
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {})
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function extractContractIdsFromGetAllResponse(data: unknown): string[] {
    if (!isRecord(data)) return []
    const contracts = data.contracts
    if (!Array.isArray(contracts)) return []

    return contracts
        .map((item) => (isRecord(item) && typeof item.id === 'string' ? item.id : null))
        .filter((id): id is string => Boolean(id))
}

function extractHistoryIdsFromGetAllResponse(data: unknown): string[] {
    if (!isRecord(data)) return []

    // /api/history/getAll returns { history: [...] }
    // keep a fallback to sessions for compatibility with any legacy shape.
    const historyLike = Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.sessions)
            ? data.sessions
            : []

    return historyLike
        .map((item) => (isRecord(item) && typeof item.id === 'string' ? item.id : null))
        .filter((id): id is string => Boolean(id))
}

function extractHasMoreFromGetAllResponse(data: unknown): boolean {
    if (!isRecord(data)) return false
    const pagination = data.pagination
    if (!isRecord(pagination)) return false
    return Boolean(pagination.hasMore)
}

function extractUsersFromGetByRoleResponse(data: unknown): Array<{ id: string; fullName: string }> {
    if (!isRecord(data)) return []
    const users = data.users
    if (!Array.isArray(users)) return []

    return users
        .map((item) => {
            if (!isRecord(item)) return null
            const userNode = Array.isArray(item.users) ? item.users[0] : null
            const id = isRecord(userNode) && typeof userNode.id === 'string' ? userNode.id : ''
            const firstName = typeof item.first_name === 'string' ? item.first_name.trim() : ''
            const lastName = typeof item.last_name === 'string' ? item.last_name.trim() : ''
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim().toLowerCase()
            if (!id) return null
            return { id, fullName }
        })
        .filter((item): item is { id: string; fullName: string } => Boolean(item))
}

async function resolvePurchasedByForCreateContract(request: Request, purchasedByInput: string): Promise<{ ok: true; purchasedBy: string } | { ok: false; status: number; error: string }> {
    const normalized = purchasedByInput.trim()
    const normalizedLower = normalized.toLowerCase()

    if (!normalized) {
        return {
            ok: false,
            status: 400,
            error: 'purchased_by is required'
        }
    }

    const response = await callInternalGet(
        request,
        '/api/user/getByRole',
        new URLSearchParams({ role: 'CUSTOMER' })
    )

    if (response.status < 200 || response.status >= 300) {
        return {
            ok: false,
            status: response.status,
            error: 'Unable to resolve customer from provided purchased_by value'
        }
    }

    const customers = extractUsersFromGetByRoleResponse(response.data)

    const exactMatches = new Set<string>()
    const includesMatches = new Set<string>()

    for (const customer of customers) {
        const idLower = customer.id.toLowerCase()
        const nameLower = customer.fullName

        if (idLower === normalizedLower || nameLower === normalizedLower) {
            exactMatches.add(customer.id)
            continue
        }

        if (idLower.includes(normalizedLower) || nameLower.includes(normalizedLower)) {
            includesMatches.add(customer.id)
        }
    }

    const candidates = exactMatches.size ? Array.from(exactMatches) : Array.from(includesMatches)

    if (candidates.length === 1) {
        return { ok: true, purchasedBy: candidates[0] }
    }

    if (candidates.length === 0) {
        return {
            ok: false,
            status: 404,
            error: `Customer not found for purchased_by input: ${normalized}`
        }
    }

    return {
        ok: false,
        status: 400,
        error: `Ambiguous customer input: ${normalized}. Please provide a more specific customer name or ID.`
    }
}

async function resolveContractIdForWrite(request: Request, contractIdInput: string): Promise<{ ok: true; contractId: string } | { ok: false; status: number; error: string }> {
    const normalized = contractIdInput.trim()
    const normalizedLower = normalized.toLowerCase()

    if (!normalized) {
        return {
            ok: false,
            status: 400,
            error: 'Contract ID is required'
        }
    }

    // Resolve full ID, short prefix, partial substring, or fuzzy subsequence
    // to a full contract ID from the user's accessible contracts.
    const normalizedCompact = normalizedLower.replace(/[^a-z0-9]/g, '')

    const isSubsequence = (needle: string, haystack: string): boolean => {
        if (!needle) return false
        let j = 0
        for (let i = 0; i < haystack.length && j < needle.length; i += 1) {
            if (haystack[i] === needle[j]) j += 1
        }
        return j === needle.length
    }

    const exactMatches = new Set<string>()
    const startsWithMatches = new Set<string>()
    const includesMatches = new Set<string>()
    const fuzzyMatches = new Set<string>()
    let page = 1
    const limit = 100

    for (let i = 0; i < 50; i += 1) {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit)
        })

        const result = await callInternalGet(request, '/api/contract/getAll', params)

        if (result.status < 200 || result.status >= 300) {
            return {
                ok: false,
                status: result.status,
                error: 'Unable to resolve contract ID from your contract list'
            }
        }

        const contractIds = extractContractIdsFromGetAllResponse(result.data)
        for (const fullId of contractIds) {
            const fullIdLower = fullId.toLowerCase()
            const shortIdLower = fullId.split('-')[0]?.toLowerCase() ?? ''
            const fullIdCompact = fullIdLower.replace(/[^a-z0-9]/g, '')
            const shortIdCompact = shortIdLower.replace(/[^a-z0-9]/g, '')

            const hasCompactInput = normalizedCompact.length > 0

            if (
                fullIdLower === normalizedLower ||
                shortIdLower === normalizedLower ||
                (hasCompactInput && (fullIdCompact === normalizedCompact || shortIdCompact === normalizedCompact))
            ) {
                exactMatches.add(fullId)
                continue
            }

            if (
                fullIdLower.startsWith(normalizedLower) ||
                shortIdLower.startsWith(normalizedLower) ||
                (hasCompactInput && (fullIdCompact.startsWith(normalizedCompact) || shortIdCompact.startsWith(normalizedCompact)))
            ) {
                startsWithMatches.add(fullId)
                continue
            }

            if (
                fullIdLower.includes(normalizedLower) ||
                shortIdLower.includes(normalizedLower) ||
                (hasCompactInput && (fullIdCompact.includes(normalizedCompact) || shortIdCompact.includes(normalizedCompact)))
            ) {
                includesMatches.add(fullId)
                continue
            }

            if (
                hasCompactInput &&
                (isSubsequence(normalizedCompact, fullIdCompact) || isSubsequence(normalizedCompact, shortIdCompact))
            ) {
                fuzzyMatches.add(fullId)
            }
        }

        if (!extractHasMoreFromGetAllResponse(result.data)) break
        page += 1
    }

    const prioritizedMatches = exactMatches.size
        ? Array.from(exactMatches)
        : startsWithMatches.size
            ? Array.from(startsWithMatches)
            : includesMatches.size
                ? Array.from(includesMatches)
                : Array.from(fuzzyMatches)

    if (prioritizedMatches.length === 1) {
        return { ok: true, contractId: prioritizedMatches[0] }
    }

    if (prioritizedMatches.length === 0) {
        return {
            ok: false,
            status: 404,
            error: `Contract not found for ID input: ${normalized}`
        }
    }

    return {
        ok: false,
        status: 400,
        error: `Ambiguous contract ID input: ${normalized}. Please provide a more specific contract ID.`
    }
}

async function resolveHistoryIdForWrite(request: Request, historyIdInput: string): Promise<{ ok: true; historyId: string } | { ok: false; status: number; error: string }> {
    const normalized = historyIdInput.trim()
    const normalizedLower = normalized.toLowerCase()

    if (!normalized) {
        return {
            ok: false,
            status: 400,
            error: 'Session ID is required'
        }
    }

    const normalizedCompact = normalizedLower.replace(/[^a-z0-9]/g, '')

    const isSubsequence = (needle: string, haystack: string): boolean => {
        if (!needle) return false
        let j = 0
        for (let i = 0; i < haystack.length && j < needle.length; i += 1) {
            if (haystack[i] === needle[j]) j += 1
        }
        return j === needle.length
    }

    const exactMatches = new Set<string>()
    const startsWithMatches = new Set<string>()
    const includesMatches = new Set<string>()
    const fuzzyMatches = new Set<string>()
    let page = 1
    const limit = 100

    for (let i = 0; i < 50; i += 1) {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit)
        })

        const result = await callInternalGet(request, '/api/history/getAll', params)

        if (result.status < 200 || result.status >= 300) {
            return {
                ok: false,
                status: result.status,
                error: 'Unable to resolve session ID from your session list'
            }
        }

        const historyIds = extractHistoryIdsFromGetAllResponse(result.data)
        for (const fullId of historyIds) {
            const fullIdLower = fullId.toLowerCase()
            const shortIdLower = fullId.split('-')[0]?.toLowerCase() ?? ''
            const fullIdCompact = fullIdLower.replace(/[^a-z0-9]/g, '')
            const shortIdCompact = shortIdLower.replace(/[^a-z0-9]/g, '')

            const hasCompactInput = normalizedCompact.length > 0

            if (
                fullIdLower === normalizedLower ||
                shortIdLower === normalizedLower ||
                (hasCompactInput && (fullIdCompact === normalizedCompact || shortIdCompact === normalizedCompact))
            ) {
                exactMatches.add(fullId)
                continue
            }

            if (
                fullIdLower.startsWith(normalizedLower) ||
                shortIdLower.startsWith(normalizedLower) ||
                (hasCompactInput && (fullIdCompact.startsWith(normalizedCompact) || shortIdCompact.startsWith(normalizedCompact)))
            ) {
                startsWithMatches.add(fullId)
                continue
            }

            if (
                fullIdLower.includes(normalizedLower) ||
                shortIdLower.includes(normalizedLower) ||
                (hasCompactInput && (fullIdCompact.includes(normalizedCompact) || shortIdCompact.includes(normalizedCompact)))
            ) {
                includesMatches.add(fullId)
                continue
            }

            if (
                hasCompactInput &&
                (isSubsequence(normalizedCompact, fullIdCompact) || isSubsequence(normalizedCompact, shortIdCompact))
            ) {
                fuzzyMatches.add(fullId)
            }
        }

        if (!extractHasMoreFromGetAllResponse(result.data)) break
        page += 1
    }

    const prioritizedMatches = exactMatches.size
        ? Array.from(exactMatches)
        : startsWithMatches.size
            ? Array.from(startsWithMatches)
            : includesMatches.size
                ? Array.from(includesMatches)
                : Array.from(fuzzyMatches)

    if (prioritizedMatches.length === 1) {
        return { ok: true, historyId: prioritizedMatches[0] }
    }

    if (prioritizedMatches.length === 0) {
        return {
            ok: false,
            status: 404,
            error: `Session not found for ID input: ${normalized}`
        }
    }

    return {
        ok: false,
        status: 400,
        error: `Ambiguous session ID input: ${normalized}. Please provide a more specific session ID.`
    }
}

async function callInternalGet(
    request: Request,
    path: string,
    params: URLSearchParams
): Promise<{ status: number; data: unknown }> {
    const origin = getOriginFromRequest(request)
    const response = await fetch(`${origin}${path}?${params.toString()}`, {
        method: 'GET',
        headers: baseForwardHeaders(request),
        cache: 'no-store'
    })

    const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }))

    return {
        status: response.status,
        data
    }
}

async function callInternalPost(
    request: Request,
    path: string,
    body: unknown
): Promise<{ status: number; data: unknown }> {
    const origin = getOriginFromRequest(request)
    const response = await fetch(`${origin}${path}`, {
        method: 'POST',
        headers: baseForwardHeaders(request),
        body: JSON.stringify(body),
        cache: 'no-store'
    })

    const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }))

    return {
        status: response.status,
        data
    }
}

async function executeAction(
    request: Request,
    action: PlannerAction,
    canWrite: boolean
): Promise<ExecutedToolResult> {
    try {
        if (action.type === 'get_contracts') {
            const result = await callInternalGet(
                request,
                '/api/contract/getAll',
                buildContractsQuery(action.args as GetContractsArgs)
            )
            return { action, ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data }
        }

        if (action.type === 'get_sessions') {
            const result = await callInternalGet(
                request,
                '/api/history/getAll',
                buildSessionsQuery(action.args as GetSessionsArgs)
            )
            return { action, ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data }
        }

        if (WRITE_ACTIONS.has(action.type)) {
            if (!canWrite) {
                return {
                    action,
                    ok: false,
                    status: 409,
                    data: { error: 'Confirmation required before executing this action' }
                }
            }

            if (action.type === 'create_session') {
                const createArgs = action.args as CreateSessionArgs
                const resolvedContract = await resolveContractIdForWrite(request, createArgs.contract_id)

                if (!resolvedContract.ok) {
                    return {
                        action,
                        ok: false,
                        status: resolvedContract.status,
                        data: { error: resolvedContract.error }
                    }
                }

                const result = await callInternalPost(request, '/api/history/create', {
                    ...createArgs,
                    contract_id: resolvedContract.contractId
                })
                return { action, ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data }
            }

            if (action.type === 'check_in_session') {
                const { history_id } = action.args as CheckInSessionArgs
                const resolvedHistory = await resolveHistoryIdForWrite(request, history_id)

                if (!resolvedHistory.ok) {
                    return {
                        action,
                        ok: false,
                        status: resolvedHistory.status,
                        data: { error: resolvedHistory.error }
                    }
                }

                const result = await callInternalPost(request, '/api/history/updateStatus', {
                    history_id: resolvedHistory.historyId,
                    status: 'CHECKED_IN'
                })
                return { action, ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data }
            }

            if (action.type === 'cancel_session') {
                const { history_id } = action.args as CancelSessionArgs
                const resolvedHistory = await resolveHistoryIdForWrite(request, history_id)

                if (!resolvedHistory.ok) {
                    return {
                        action,
                        ok: false,
                        status: resolvedHistory.status,
                        data: { error: resolvedHistory.error }
                    }
                }

                const result = await callInternalPost(request, '/api/history/updateStatus', {
                    history_id: resolvedHistory.historyId,
                    status: 'CANCELED'
                })
                return { action, ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data }
            }

            if (action.type === 'create_contract') {
                const createContractArgs = action.args as CreateContractArgs
                const resolvedPurchasedBy = await resolvePurchasedByForCreateContract(request, createContractArgs.purchased_by)

                if (!resolvedPurchasedBy.ok) {
                    return {
                        action,
                        ok: false,
                        status: resolvedPurchasedBy.status,
                        data: { error: resolvedPurchasedBy.error }
                    }
                }

                const result = await callInternalPost(request, '/api/contract/create', {
                    ...createContractArgs,
                    purchased_by: resolvedPurchasedBy.purchasedBy
                })
                return { action, ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data }
            }

            if (action.type === 'update_contract_status') {
                const updateArgs = action.args as UpdateContractStatusArgs
                const resolvedContract = await resolveContractIdForWrite(request, updateArgs.contract_id)

                if (!resolvedContract.ok) {
                    return {
                        action,
                        ok: false,
                        status: resolvedContract.status,
                        data: { error: resolvedContract.error }
                    }
                }

                const result = await callInternalPost(request, '/api/contract/updateStatus', {
                    ...updateArgs,
                    contract_id: resolvedContract.contractId
                })
                return { action, ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data }
            }
        }

        return {
            action,
            ok: false,
            status: 400,
            data: { error: `Unknown action type: ${action.type}` }
        }
    } catch (error) {
        return {
            action,
            ok: false,
            status: 500,
            data: {
                error: error instanceof Error ? error.message : 'Unexpected tool execution error'
            }
        }
    }
}

export async function executePlannerActions(
    request: Request,
    plan: PlannerResponse,
    confirmed: boolean
): Promise<ExecutedToolResult[]> {
    const actions = plan.actions.slice(0, 4)
    const hasWriteAction = actions.some((action) => WRITE_ACTIONS.has(action.type))
    const canWrite = !hasWriteAction || confirmed

    const results: ExecutedToolResult[] = []

    for (const action of actions) {
        const result = await executeAction(request, action, canWrite)
        results.push(result)
    }

    return results
}
