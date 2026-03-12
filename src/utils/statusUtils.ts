// src/utils/statusUtils.ts
import type { ContractStatus, HistoryStatus, Role, Contract, History } from '@/app/type/api'


export interface ActionButton {
  label: string
  nextStatus: ContractStatus | HistoryStatus
  type: 'primary' | 'default' | 'danger'
}

/**
 * Get available action buttons for contract based on current status and user role
 * @param status - Current contract status
 * @param role - User role
 * @returns Array of available action buttons
 */
export function getContractActionButtons(
  status: ContractStatus,
  role: Role
): ActionButton[] {
  const buttons: ActionButton[] = []

  if (role === 'ADMIN') {
    // ADMIN can perform transitions at specific stages
    switch (status) {
      case 'NEWLY_CREATED':
        buttons.push({ label: 'Send to Customer', nextStatus: 'CUSTOMER_REVIEW', type: 'primary' })
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'CUSTOMER_REVIEW':
        // No buttons - waiting for CUSTOMER to confirm
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'CUSTOMER_CONFIRMED':
        // No buttons - waiting for CUSTOMER payment completion
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'CUSTOMER_PAID':
        buttons.push({ label: 'PT Confirm Receipt', nextStatus: 'PT_CONFIRMED', type: 'primary' })
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'PT_CONFIRMED':
        // No buttons - waiting for CUSTOMER activation
        break
      case 'ACTIVE':
      case 'CANCELED':
      case 'EXPIRED':
        // No actions for terminal/active statuses
        break
    }
  } else if (role === 'STAFF') {
    // STAFF can: NEWLY_CREATED → CUSTOMER_REVIEW, CUSTOMER_PAID → PT_CONFIRMED
    if (status === 'NEWLY_CREATED') {
      buttons.push({ label: 'Send to Customer', nextStatus: 'CUSTOMER_REVIEW', type: 'primary' })
    } else if (status === 'CUSTOMER_PAID') {
      buttons.push({ label: 'PT Confirm Receipt', nextStatus: 'PT_CONFIRMED', type: 'primary' })
    }

    // STAFF can cancel any pre-ACTIVE status except terminal statuses and PT_CONFIRMED
    if (status !== 'ACTIVE' && status !== 'CANCELED' && status !== 'EXPIRED' && status !== 'PT_CONFIRMED') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  } else if (role === 'CUSTOMER') {
    // CUSTOMER can: CUSTOMER_REVIEW → CUSTOMER_CONFIRMED → CUSTOMER_PAID → ACTIVE
    if (status === 'CUSTOMER_REVIEW') {
      buttons.push({ label: 'Confirm Details', nextStatus: 'CUSTOMER_CONFIRMED', type: 'primary' })
    } else if (status === 'CUSTOMER_CONFIRMED') {
      buttons.push({ label: 'Payment Completed', nextStatus: 'CUSTOMER_PAID', type: 'primary' })
    } else if (status === 'PT_CONFIRMED') {
      buttons.push({ label: 'Activate', nextStatus: 'ACTIVE', type: 'primary' })
    }

    // CUSTOMER can cancel any pre-ACTIVE status except terminal statuses and PT_CONFIRMED
    if (status !== 'ACTIVE' && status !== 'CANCELED' && status !== 'EXPIRED' && status !== 'PT_CONFIRMED') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  }

  return buttons
}

/**
 * Get available action buttons for history/session based on current status and user role
 * NEW FLOW: NEWLY_CREATED -> CHECKED_IN with dual check-in timestamps handled by API.
 * This helper only supports Cancel as status transition; check-in is driven by UI + API.
 */
export function getHistoryActionButtons(
  status: HistoryStatus,
  role: Role
): ActionButton[] {
  const buttons: ActionButton[] = []

  if (status === 'CHECKED_IN' || status === 'EXPIRED' || status === 'CANCELED') {
    return buttons
  }

  if (status === 'NEWLY_CREATED') {
    if (role === 'ADMIN' || role === 'STAFF' || role === 'CUSTOMER') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  }

  return buttons
}

/**
 * Completed history status helper.
 */
export function isCompletedHistoryStatus(status: string): boolean {
  return status === 'CHECKED_IN'
}

/**
 * Returns true for statuses that are in workflow before ACTIVE.
 */
export function isPreActiveContractStatus(status: ContractStatus): boolean {
  return (
    status === 'NEWLY_CREATED' ||
    status === 'CUSTOMER_REVIEW' ||
    status === 'CUSTOMER_CONFIRMED' ||
    status === 'CUSTOMER_PAID' ||
    status === 'PT_CONFIRMED'
  )
}

/**
 * Check if user can view a contract based on status and role
 * @param status - Contract status
 * @param role - User role
 * @returns true if user can view the contract
 */
export function canViewContract(status: ContractStatus, role: Role): boolean {
  // ADMIN and STAFF can view all contracts
  if (role === 'ADMIN' || role === 'STAFF') {
    return true
  }

  // CUSTOMER cannot see NEWLY_CREATED contracts
  if (role === 'CUSTOMER' && status === 'NEWLY_CREATED') {
    return false
  }

  return true
}

/**
 * Check if a contract can be canceled
 * @param status - Contract status
 * @returns true if contract can be canceled
 */
export function canCancelContract(status: ContractStatus): boolean {
  // Can cancel any pre-ACTIVE status except terminal statuses
  return status !== 'ACTIVE' && status !== 'CANCELED' && status !== 'EXPIRED'
}

/**
 * Check if a history/session can be canceled
 * @param status - History status
 * @returns true if history can be canceled
 */
export function canCancelHistory(status: HistoryStatus): boolean {
  // Only NEWLY_CREATED can be canceled in the new lifecycle
  return status === 'NEWLY_CREATED'
}

/**
 * Get display text for contract status
 * @param status - Contract status
 * @returns Formatted status text
 */
export function getContractStatusText(status: ContractStatus): string {
  const statusMap: Record<ContractStatus, string> = {
    'NEWLY_CREATED': 'Newly Created',
    'CUSTOMER_REVIEW': 'Customer Review',
    'CUSTOMER_CONFIRMED': 'Customer Confirmed',
    'CUSTOMER_PAID': 'Payment Completed by Customer',
    'PT_CONFIRMED': 'PT Confirmed Receipt',
    'ACTIVE': 'Active',
    'CANCELED': 'Canceled',
    'EXPIRED': 'Expired'
  }
  return statusMap[status] || status
}

/**
 * Get display text for history status
 * @param status - History status
 * @returns Formatted status text
 */
export function getHistoryStatusText(status: HistoryStatus): string {
  const statusMap: Record<HistoryStatus, string> = {
    'NEWLY_CREATED': 'Pending check in',
    'CHECKED_IN': 'Completed',
    'CANCELED': 'Canceled',
    'EXPIRED': 'Expired'
  }
  return statusMap[status] || status
}

/**
 * Get variant for contract status badge (shadcn Badge)
 * @param status - Contract status
 * @returns Badge variant + class tuple
 */
export function getContractStatusVariant(status: ContractStatus): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string } {
  const variantMap: Record<ContractStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    'NEWLY_CREATED': { variant: 'secondary', className: 'bg-zinc-100 text-zinc-600' },
    'CUSTOMER_REVIEW': { variant: 'secondary', className: 'bg-blue-50 text-blue-700' },
    'CUSTOMER_CONFIRMED': { variant: 'secondary', className: 'bg-amber-50 text-amber-700' },
    'CUSTOMER_PAID': { variant: 'secondary', className: 'bg-indigo-50 text-indigo-700' },
    'PT_CONFIRMED': { variant: 'secondary', className: 'bg-purple-50 text-purple-700' },
    'ACTIVE': { variant: 'secondary', className: 'bg-emerald-50 text-emerald-700' },
    'CANCELED': { variant: 'destructive', className: 'bg-red-50 text-red-700' },
    'EXPIRED': { variant: 'secondary', className: 'bg-zinc-100 text-zinc-500' }
  }
  return variantMap[status] || variantMap['NEWLY_CREATED']
}

/**
 * Get variant for history status badge (shadcn Badge)
 * @param status - History status
 * @returns Badge variant + class tuple
 */
export function getHistoryStatusVariant(status: HistoryStatus): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string } {
  const variantMap: Record<HistoryStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    'NEWLY_CREATED': { variant: 'secondary', className: 'bg-amber-50 text-amber-700' },
    'CHECKED_IN': { variant: 'secondary', className: 'bg-emerald-50 text-emerald-700' },
    'CANCELED': { variant: 'destructive', className: 'bg-red-50 text-red-700' },
    'EXPIRED': { variant: 'secondary', className: 'bg-zinc-100 text-zinc-500' }
  }
  return variantMap[status] || variantMap['NEWLY_CREATED']
}

/**
 * Get color for contract status badge (legacy compat)
 * @param status - Contract status
 * @returns color string
 */
export function getContractStatusColor(status: ContractStatus): string {
  const colorMap: Record<ContractStatus, string> = {
    'NEWLY_CREATED': 'default',
    'CUSTOMER_REVIEW': 'processing',
    'CUSTOMER_CONFIRMED': 'warning',
    'CUSTOMER_PAID': 'processing',
    'PT_CONFIRMED': 'warning',
    'ACTIVE': 'success',
    'CANCELED': 'error',
    'EXPIRED': 'default'
  }
  return colorMap[status] || 'default'
}

/**
 * Get color for history status badge (legacy compat)
 * @param status - History status
 * @returns color string
 */
export function getHistoryStatusColor(status: HistoryStatus): string {
  const colorMap: Record<HistoryStatus, string> = {
    'NEWLY_CREATED': 'warning',
    'CHECKED_IN': 'success',
    'CANCELED': 'error',
    'EXPIRED': 'default'
  }
  return colorMap[status] || 'default'
}

/**
 * Check if user should see action buttons for a contract
 * @param contract - The contract
 * @param userRole - User's role
 * @param userInstantId - User's Instant DB ID
 * @returns true if user should see action buttons
 */
export function shouldShowContractActionButtons(
  contract: Contract,
  userRole: Role,
  userInstantId: string
): boolean {
  // ADMIN and STAFF can see buttons for all contracts
  if (userRole === 'ADMIN' || userRole === 'STAFF') {
    return true
  }

  // CUSTOMER can only see buttons for contracts they purchased
  if (userRole === 'CUSTOMER') {
    return contract.purchased_by === userInstantId
  }

  return false
}

/**
 * Check if user should see action buttons for a session/history
 * @param session - The history/session record
 * @param userRole - User's role
 * @param userInstantId - User's Instant DB ID
 * @returns true if user should see action buttons
 */
export function shouldShowHistoryActionButtons(
  session: History,
  userRole: Role,
  userInstantId: string
): boolean {
  // ADMIN and STAFF can see buttons for all sessions
  if (userRole === 'ADMIN' || userRole === 'STAFF') {
    return true
  }

  // CUSTOMER can only see buttons for sessions from contracts they purchased
  if (userRole === 'CUSTOMER') {
    // contract is an array, so access first element
    const contract = Array.isArray(session.contract) ? session.contract[0] : session.contract
    return contract?.purchased_by === userInstantId
  }

  return false
}
