import { auth, clerkClient } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10)
  if (Number.isNaN(parsed) || parsed <= 0) return fallback
  return parsed
}

function normalizeKeyword(value: string | null): string {
  return (value || '').trim().toLowerCase()
}

function compareUsers(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const firstA = typeof a.first_name === 'string' ? a.first_name.toLowerCase() : ''
  const firstB = typeof b.first_name === 'string' ? b.first_name.toLowerCase() : ''
  const firstDiff = firstA.localeCompare(firstB)
  if (firstDiff !== 0) return firstDiff

  const lastA = typeof a.last_name === 'string' ? a.last_name.toLowerCase() : ''
  const lastB = typeof b.last_name === 'string' ? b.last_name.toLowerCase() : ''
  const lastDiff = lastA.localeCompare(lastB)
  if (lastDiff !== 0) return lastDiff

  const idA = typeof a.id === 'string' ? a.id : ''
  const idB = typeof b.id === 'string' ? b.id : ''
  return idA.localeCompare(idB)
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parsePositiveInt(searchParams.get('page'), 1)
    const limit = parsePositiveInt(searchParams.get('limit'), 10)
    const offset = (page - 1) * limit
    const firstNameKeyword = normalizeKeyword(searchParams.get('first_name'))
    const lastNameKeyword = normalizeKeyword(searchParams.get('last_name'))

    const requesterData = await instantServer.query({
      user_setting: {
        $: {
          where: {
            clerk_id: userId
          }
        }
      }
    })

    const requesterSetting = requesterData.user_setting[0]

    if (!requesterSetting) {
      return NextResponse.json(
        { error: 'User settings not found' },
        { status: 404 }
      )
    }

    if (requesterSetting.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only ADMIN can access user management' },
        { status: 403 }
      )
    }

    const allUsersData = await instantServer.query({
      user_setting: {
        users: {}
      }
    })

    const filteredUsers = (allUsersData.user_setting || [])
      .filter((setting) => !!setting.users?.[0]?.id)
      .filter((setting) => {
        const firstName = (setting.first_name || '').toLowerCase()
        const lastName = (setting.last_name || '').toLowerCase()

        if (firstNameKeyword && !firstName.includes(firstNameKeyword)) {
          return false
        }

        if (lastNameKeyword && !lastName.includes(lastNameKeyword)) {
          return false
        }

        return true
      })
      .sort(compareUsers)

    const total = filteredUsers.length
    const paginatedUsers = filteredUsers.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    const uniqueClerkIds = Array.from(
      new Set(
        paginatedUsers
          .map((setting) => setting.clerk_id)
          .filter((clerkId): clerkId is string => typeof clerkId === 'string' && clerkId.length > 0)
      )
    )

    const avatarByClerkId = new Map<string, string>()

    if (uniqueClerkIds.length > 0) {
      const clerk = await clerkClient()

      await Promise.all(
        uniqueClerkIds.map(async (clerkId) => {
          try {
            const clerkUser = await clerk.users.getUser(clerkId)
            if (clerkUser.imageUrl) {
              avatarByClerkId.set(clerkId, clerkUser.imageUrl)
            }
          } catch (error) {
            console.warn(`Failed to fetch Clerk user for clerk_id: ${clerkId}`, error)
          }
        })
      )
    }

    const users = paginatedUsers.map((setting) => ({
      ...setting,
      imageUrl: avatarByClerkId.get(setting.clerk_id)
    }))

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        hasMore
      },
      role: requesterSetting.role
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

