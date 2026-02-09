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
        // No buttons - waiting for CUSTOMER to activate
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'ACTIVE':
        // No status change buttons for active contracts
        break
      case 'CANCELED':
      case 'EXPIRED':
        // No actions for terminal statuses
        break
    }
  } else if (role === 'STAFF') {
    // STAFF can: NEWLY_CREATED → CUSTOMER_REVIEW
    if (status === 'NEWLY_CREATED') {
      buttons.push({ label: 'Send to Customer', nextStatus: 'CUSTOMER_REVIEW', type: 'primary' })
    }
    // STAFF can cancel any status except ACTIVE, CANCELED, EXPIRED
    if (status !== 'ACTIVE' && status !== 'CANCELED' && status !== 'EXPIRED') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  } else if (role === 'CUSTOMER') {
    // CUSTOMER can: CUSTOMER_REVIEW → CUSTOMER_CONFIRMED → ACTIVE
    if (status === 'CUSTOMER_REVIEW') {
      buttons.push({ label: 'Payment Confirm', nextStatus: 'CUSTOMER_CONFIRMED', type: 'primary' })
    } else if (status === 'CUSTOMER_CONFIRMED') {
      buttons.push({ label: 'Activate', nextStatus: 'ACTIVE', type: 'primary' })
    }
    // CUSTOMER can cancel any status except ACTIVE, CANCELED, EXPIRED
    if (status !== 'ACTIVE' && status !== 'CANCELED' && status !== 'EXPIRED') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  }

  return buttons
}

/**
 * Get available action buttons for history/session based on current status and user role
 * @param status - Current history status
 * @param role - User role
 * @returns Array of available action buttons
 */
export function getHistoryActionButtons(
  status: HistoryStatus,
  role: Role
): ActionButton[] {
  const buttons: ActionButton[] = []

  if (role === 'ADMIN') {
    // ADMIN can perform transitions, but must wait for CUSTOMER to check in first
    switch (status) {
      case 'NEWLY_CREATED':
        buttons.push({ label: 'Confirm', nextStatus: 'PT_CONFIRMED', type: 'primary' })
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'PT_CONFIRMED':
        // Wait for CUSTOMER to check in - no check-in button for ADMIN
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'USER_CHECKED_IN':
        buttons.push({ label: 'Check In', nextStatus: 'PT_CHECKED_IN', type: 'primary' })
        buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
        break
      case 'PT_CHECKED_IN':
      case 'CANCELED':
      case 'EXPIRED':
        // No actions for terminal statuses
        break
    }
  } else if (role === 'STAFF') {
    // STAFF can: NEWLY_CREATED → PT_CONFIRMED, USER_CHECKED_IN → PT_CHECKED_IN
    // STAFF must wait for CUSTOMER to check in at PT_CONFIRMED status
    if (status === 'NEWLY_CREATED') {
      buttons.push({ label: 'Confirm', nextStatus: 'PT_CONFIRMED', type: 'primary' })
    } else if (status === 'USER_CHECKED_IN') {
      buttons.push({ label: 'Check In', nextStatus: 'PT_CHECKED_IN', type: 'primary' })
    }
    // STAFF can cancel except PT_CHECKED_IN, EXPIRED, CANCELED
    if (status !== 'PT_CHECKED_IN' && status !== 'EXPIRED' && status !== 'CANCELED') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  } else if (role === 'CUSTOMER') {
    // CUSTOMER can: PT_CONFIRMED → USER_CHECKED_IN
    if (status === 'PT_CONFIRMED') {
      buttons.push({ label: 'Check In', nextStatus: 'USER_CHECKED_IN', type: 'primary' })
    }
    // CUSTOMER can cancel except PT_CHECKED_IN, EXPIRED, CANCELED
    if (status !== 'PT_CHECKED_IN' && status !== 'EXPIRED' && status !== 'CANCELED') {
      buttons.push({ label: 'Cancel', nextStatus: 'CANCELED', type: 'danger' })
    }
  }

  return buttons
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
  // Can cancel any status except ACTIVE
  return status !== 'ACTIVE'
}

/**
 * Check if a history/session can be canceled
 * @param status - History status
 * @returns true if history can be canceled
 */
export function canCancelHistory(status: HistoryStatus): boolean {
  // Cannot cancel PT_CHECKED_IN, EXPIRED, or CANCELED
  return status !== 'PT_CHECKED_IN' && status !== 'EXPIRED' && status !== 'CANCELED'
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
    'NEWLY_CREATED': 'Newly Created',
    'PT_CONFIRMED': 'PT Confirmed',
    'USER_CHECKED_IN': 'User Checked In',
    'PT_CHECKED_IN': 'PT Checked In',
    'CANCELED': 'Canceled',
    'EXPIRED': 'Expired'
  }
  return statusMap[status] || status
}

/**
 * Get color for contract status badge
 * @param status - Contract status
 * @returns Ant Design badge color
 */
export function getContractStatusColor(status: ContractStatus): string {
  const colorMap: Record<ContractStatus, string> = {
    'NEWLY_CREATED': 'default',
    'CUSTOMER_REVIEW': 'processing',
    'CUSTOMER_CONFIRMED': 'warning',
    'ACTIVE': 'success',
    'CANCELED': 'error',
    'EXPIRED': 'default'
  }
  return colorMap[status] || 'default'
}

/**
 * Get color for history status badge
 * @param status - History status
 * @returns Ant Design badge color
 */
export function getHistoryStatusColor(status: HistoryStatus): string {
  const colorMap: Record<HistoryStatus, string> = {
    'NEWLY_CREATED': 'default',
    'PT_CONFIRMED': 'processing',
    'USER_CHECKED_IN': 'warning',
    'PT_CHECKED_IN': 'success',
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
    return session.contract?.purchased_by === userInstantId
  }

  return false
}

