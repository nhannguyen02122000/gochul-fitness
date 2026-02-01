// src/lib/roleCheck.ts
export function isAdmin(role: string) {
    return role === 'ADMIN'
}

export function isStaffOrAdmin(role: string) {
    return role === 'STAFF' || role === 'ADMIN'
}