// src/app/api/user/updateBasicInfo/route.ts
import { auth } from '@clerk/nextjs/server'
import { instantServer } from '@/lib/dbServer'
import { NextResponse } from 'next/server'


// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function POST(request: Request) {
    try {
        // Check if user is signed in
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        // Get user settings
        const userData = await instantServer.query({
            user_setting: {
                $: {
                    where: {
                        clerk_id: userId
                    }
                },
                users: {}
            }
        })

        const userSetting = userData.user_setting[0]

        if (!userSetting) {
            return NextResponse.json(
                { error: 'User settings not found' },
                { status: 404 }
            )
        }

        // Parse request body
        const body = await request.json()
        const { first_name, last_name } = body

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {}

        // Validate and add optional fields if provided
        if (first_name !== undefined) {
            if (typeof first_name !== 'string') {
                return NextResponse.json(
                    { error: 'Invalid field: first_name must be a string' },
                    { status: 400 }
                )
            }
            updateData.first_name = first_name
        }

        if (last_name !== undefined) {
            if (typeof last_name !== 'string') {
                return NextResponse.json(
                    { error: 'Invalid field: last_name must be a string' },
                    { status: 400 }
                )
            }
            updateData.last_name = last_name
        }

        // Check if there are any fields to update
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'No fields to update provided' },
                { status: 400 }
            )
        }

        // Update the user_setting using InstantDB transaction
        await instantServer.transact([
            instantServer.tx.user_setting[userSetting.id].update(updateData)
        ])

        // Query the updated user_setting to return it
        const updatedUserSettingData = await instantServer.query({
            user_setting: {
                $: {
                    where: {
                        id: userSetting.id
                    }
                },
                users: {}
            }
        })

        const updatedUserSetting = updatedUserSettingData.user_setting[0]

        if (!updatedUserSetting) {
            return NextResponse.json(
                { error: 'User setting updated but could not be retrieved' },
                { status: 500 }
            )
        }

        return NextResponse.json(
            { user_setting: updatedUserSetting },
            { status: 200 }
        )

    } catch (error) {
        console.error('Error updating user basic info:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

