/**
 * GET /api/ai-chatbot/users/search — Lightweight user search for the AI chatbot.
 *
 * Accepts a name query (partial match, diacritic-insensitive) or exact $users.id UUID.
 * No role gate — all authenticated users can search (STAFF needs to look up customers,
 * CUSTOMER may need to look up trainers).
 *
 * Used exclusively by the AI chatbot's get_user tool.
 *
 * @file src/app/api/ai-chatbot/users/search/route.ts
 */

import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'
import type { Role, UserMatch, UserSearchSuccessResponse } from '@/app/type/api'

export const dynamic = 'force-dynamic'

/**
 * Strips Vietnamese diacritical marks for fuzzy name matching.
 * "Minh" → "minh" matches "Minh", "Mình", "Mính".
 */
function stripDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Sorts user settings by last_name → first_name → id. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserSettingRecord = Record<string, any>

function sortUsers(users: UserSettingRecord[]): UserSettingRecord[] {
  return [...users].sort((a, b) => {
    const lastA = (a.last_name ?? '').toLowerCase()
    const lastB = (b.last_name ?? '').toLowerCase()
    if (lastA < lastB) return -1
    if (lastA > lastB) return 1
    const firstA = (a.first_name ?? '').toLowerCase()
    const firstB = (b.first_name ?? '').toLowerCase()
    if (firstA < firstB) return -1
    if (firstA > firstB) return 1
    return a.id.localeCompare(b.id)
  })
}

export async function GET(request: Request) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Parse params ───────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const roleFilter = searchParams.get('role') as Role | null
  const resolvedIndexRaw = searchParams.get('resolved_index')
  const resolvedIndex = resolvedIndexRaw != null ? Number(resolvedIndexRaw) : null
  let limit = Number(searchParams.get('limit') ?? '10')
  if (!Number.isFinite(limit) || limit < 1) limit = 10
  if (limit > 50) limit = 50

  if (!q) {
    return NextResponse.json({ error: 'Missing required query parameter: q' }, { status: 400 })
  }

  // ── 3. UUID pattern — exact $users.id match ────────────────────────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isUuid = UUID_RE.test(q)

  try {
    // Fetch all user_settings with linked $users — full table scan (existing pattern)
    const allData = await instantServer.query({
      user_setting: { users: {} },
    })

    console.log('[user-search] total user_settings:', (allData.user_setting ?? []).length)
    console.log('[user-search] sample users[0]:', JSON.stringify(allData.user_setting?.[0]?.users))

    let settings = (allData.user_setting ?? []).filter(
      (s) => !!s.users?.[0]?.id
    )

    // Exact ID match takes priority
    if (isUuid) {
      const matched = settings.find((s) => s.users?.[0]?.id === q)
      if (matched) {
        const u = matched.users[0]
        const users: UserMatch[] = [{
          instant_id: u.id,
          first_name: matched.first_name ?? '',
          last_name: matched.last_name ?? '',
          full_name: [matched.first_name, matched.last_name].filter(Boolean).join(' ') || 'Unknown',
          email: u.email ?? '',
          role: matched.role,
          match_index: 0,
        }]
        return NextResponse.json({ users, pagination: { total: 1 } } satisfies UserSearchSuccessResponse)
      }
      // UUID given but not found — return empty
      return NextResponse.json({ users: [], pagination: { total: 0 } } satisfies UserSearchSuccessResponse)
    }

    // ── 4. Name search ──────────────────────────────────────────────────────
    const query = stripDiacritics(q)

    settings = settings.filter((s) => {
      const first = stripDiacritics(s.first_name ?? '')
      const last = stripDiacritics(s.last_name ?? '')
      return first.includes(query) || last.includes(query)
    })

    // Optional role filter
    if (roleFilter && ['ADMIN', 'STAFF', 'CUSTOMER'].includes(roleFilter)) {
      settings = settings.filter((s) => s.role === roleFilter)
    }

    const total = settings.length
    const sorted = sortUsers(settings)

    // User picked from a numbered list — return exactly that one user
    if (resolvedIndex != null) {
      const idx = resolvedIndex === -1 ? sorted.length - 1 : resolvedIndex
      const picked = sorted[idx]
      if (picked && picked.users && picked.users[0]) {
        const u = picked.users[0]
        const users: UserMatch[] = [{
          instant_id: u.id,
          first_name: picked.first_name ?? '',
          last_name: picked.last_name ?? '',
          full_name: [picked.first_name, picked.last_name].filter(Boolean).join(' ') || 'Unknown',
          email: u.email ?? '',
          role: picked.role,
          match_index: idx,
        }]
        return NextResponse.json({ users, pagination: { total } } satisfies UserSearchSuccessResponse)
      }
      // Index out of bounds — return empty
      return NextResponse.json({ users: [], pagination: { total } } satisfies UserSearchSuccessResponse)
    }

    const sliced = sorted.slice(0, limit)

    const users: UserMatch[] = sliced.map((s, i) => {
      const u = s.users && s.users[0] ? s.users[0] : { id: '', email: '' }
      return {
        instant_id: u.id,
        first_name: s.first_name ?? '',
        last_name: s.last_name ?? '',
        full_name: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown',
        email: u.email ?? '',
        role: s.role,
        match_index: i,
      }
    })

    return NextResponse.json({ users, pagination: { total } } satisfies UserSearchSuccessResponse)
  } catch (err) {
    console.error('[user-search] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
