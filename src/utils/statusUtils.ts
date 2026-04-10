// src/utils/statusUtils.ts
import type { ContractStatus, HistoryStatus, Role, Contract, History } from '@/app/type/api'

// -----------------------------------------------------------------------
// Design System: Color Token Migration
//
// All status badge colors use CSS custom property tokens (Padlet palette).
// Do NOT use raw Tailwind classes like bg-blue-50, bg-zinc-100, etc.
// Always update these mappings when adding new statuses.
//
// Color mapping:
//   • Active / Completed → --color-success (teal green)
//   • Pending / Review / Paid / Confirmed → --color-warning (warm orange)
//     (these represent "in-progress" states, not errors)
//   • Canceled → destructive red (bg-red-50 text-red-700 — semantic danger)
//   • Default / Expired / Unknown → --color-warning
// -----------------------------------------------------------------------

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
    switch (status) {
      case 'NEWLY_CREATED':
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'ACTIVE':
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'CANCELED':
      case 'EXPIRED':
        // No actions for terminal statuses
        break
    }
  } else if (role === 'STAFF') {
    if (status === 'NEWLY_CREATED') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  } else if (role === 'CUSTOMER') {
    if (status === 'NEWLY_CREATED') {
      buttons.push({ label: 'Activate', nextStatus: 'ACTIVE', type: 'primary' })
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
  return status === 'NEWLY_CREATED'
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

  // CUSTOMER can view NEWLY_CREATED contracts (to see pending contracts to activate)
  // No restriction based on status for CUSTOMER
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
    'NEWLY_CREATED': { variant: 'secondary', className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' },
    'EXPIRED':       { variant: 'secondary', className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' },
    'ACTIVE':        { variant: 'secondary', className: 'bg-[var(--color-success-bg)] text-[var(--color-success)]' },
    'CANCELED':      { variant: 'destructive', className: 'bg-red-50 text-red-700' },
  }
  return variantMap[status] || variantMap['NEWLY_CREATED']
}

/** Lucide icon names for each contract status — provides non-color meaning */
export const CONTRACT_STATUS_ICON: Record<ContractStatus, string> = {
  'NEWLY_CREATED': 'Circle',
  'ACTIVE':        'Zap',
  'CANCELED':      'XCircle',
  'EXPIRED':       'Clock',
}

/**
 * Get variant for history status badge (shadcn Badge)
 * @param status - History status
 * @returns Badge variant + class tuple
 */
export function getHistoryStatusVariant(status: HistoryStatus): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string } {
  // Uses Padlet palette semantic tokens for consistency with dark mode
  const variantMap: Record<HistoryStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    // Pending → warm orange (warning)
    'NEWLY_CREATED': { variant: 'secondary', className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' },
    'EXPIRED':       { variant: 'secondary', className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' },
    // Completed → teal green (success)
    'CHECKED_IN':    { variant: 'secondary', className: 'bg-[var(--color-success-bg)] text-[var(--color-success)]' },
    // Destructive → semantic red (no Padlet token for danger)
    'CANCELED':      { variant: 'destructive', className: 'bg-red-50 text-red-700' },
  }
  return variantMap[status] || variantMap['NEWLY_CREATED']
}

/** Lucide icon names for each history status — provides non-color meaning */
export const HISTORY_STATUS_ICON: Record<HistoryStatus, string> = {
  'NEWLY_CREATED': 'Clock',
  'CHECKED_IN':    'LogIn',
  'CANCELED':      'XCircle',
  'EXPIRED':       'Clock',
}

/**
 * Get color for contract status badge (legacy compat)
 * @param status - Contract status
 * @returns color string
 */
export function getContractStatusColor(status: ContractStatus): string {
  const colorMap: Record<ContractStatus, string> = {
    'NEWLY_CREATED': 'default',
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
