
import { init as initServer } from '@instantdb/admin'

if (!process.env.NEXT_PUBLIC_INSTANTDB_APP_ID) {
    throw new Error('Missing NEXT_PUBLIC_INSTANTDB_APP_ID in .env file')
}

export const instantServer = initServer({
    appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID,
    adminToken: process.env.INSTANTDB_ADMIN_TOKEN
})
