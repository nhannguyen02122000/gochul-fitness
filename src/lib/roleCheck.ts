/**
 * Role-based access control helpers for GoChul Fitness.
 * Single source of truth for all role checks across the codebase.
 * @file src/lib/roleCheck.ts
 */

export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export function isAdmin(role: string): role is 'ADMIN' {
  return role === 'ADMIN'
}

export function isStaff(role: string): role is 'STAFF' {
  return role === 'STAFF'
}

export function isCustomer(role: string): role is 'CUSTOMER' {
  return role === 'CUSTOMER'
}

export function isStaffOrAdmin(role: string): boolean {
  return role === 'STAFF' || role === 'ADMIN'
}

export function isAdminOrCustomer(role: string): boolean {
  return role === 'ADMIN' || role === 'CUSTOMER'
}

export function isValidRole(role: string): role is Role {
  return role === 'ADMIN' || role === 'STAFF' || role === 'CUSTOMER'
}

/**
 * Guard: returns true if role is one of the allowed roles.
 * Use for early-return patterns in API routes.
 *
 * @example
 * if (!requireRole(role, ['ADMIN'])) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 * }
 */
export function requireRole(role: string, allowed: Role[]): boolean {
  return allowed.includes(role as Role)
}
