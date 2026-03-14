import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { instantServer } from '@/lib/dbServer'
import type { Role } from '@/app/type/api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED_ROLES: Role[] = ['ADMIN', 'STAFF', 'CUSTOMER']

function isValidRole(role: unknown): role is Role {
    return typeof role === 'string' && ALLOWED_ROLES.includes(role as Role)
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { uid, role } = body

        if (typeof uid !== 'string' || uid.trim().length === 0) {
            return NextResponse.json(
                { error: 'Invalid field: uid must be a non-empty string' },
                { status: 400 }
            )
        }

        if (!isValidRole(role)) {
            return NextResponse.json(
                { error: 'Invalid field: role must be one of ADMIN, STAFF, CUSTOMER' },
                { status: 400 }
            )
        }

        const requesterData = await instantServer.query({
            user_setting: {
                $: {
                    where: {
                        clerk_id: userId,
                    },
                },
                users: {},
            },
        })

        const requesterSetting = requesterData.user_setting[0]

        if (!requesterSetting) {
            return NextResponse.json({ error: 'User settings not found' }, { status: 404 })
        }

        if (requesterSetting.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden - Only ADMIN can update user roles' },
                { status: 403 }
            )
        }

        const allUserSettingsData = await instantServer.query({
            user_setting: {
                users: {},
            },
        })

        const targetUserSetting = allUserSettingsData.user_setting.find(
            (setting) => setting.users?.[0]?.id === uid
        )

        if (!targetUserSetting) {
            return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
        }

        if (targetUserSetting.clerk_id === userId) {
            return NextResponse.json(
                { error: 'Forbidden - You cannot change your own role' },
                { status: 400 }
            )
        }

        if (targetUserSetting.role === role) {
            return NextResponse.json(
                {
                    message: 'Role is unchanged',
                    user_setting: targetUserSetting,
                },
                { status: 200 }
            )
        }

        await instantServer.transact([
            instantServer.tx.user_setting[targetUserSetting.id].update({
                role,
            }),
        ])

        const updatedUserSettingData = await instantServer.query({
            user_setting: {
                $: {
                    where: {
                        id: targetUserSetting.id,
                    },
                },
                users: {},
            },
        })

        const updatedUserSetting = updatedUserSettingData.user_setting[0]

        if (!updatedUserSetting) {
            return NextResponse.json(
                { error: 'User role updated but could not be retrieved' },
                { status: 500 }
            )
        }

        return NextResponse.json(
            {
                message: 'User role updated successfully',
                user_setting: updatedUserSetting,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error updating user role:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
