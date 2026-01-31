import graph from '@/../instant.schema'
import { init as initServer } from '@instantdb/admin'
import { init as initClient } from '@instantdb/react'
type SchemaType = typeof graph

if (!process.env.NEXT_PUBLIC_INSTANTDB_APP_ID) {
  throw new Error('Missing NEXT_PUBLIC_INSTANTDB_APP_ID in .env file')
}

export const instantServer = initServer({
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID,
  adminToken: process.env.INSTANTDB_ADMIN_TOKEN
})

export const instantClient = initClient<SchemaType>({
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID,
  schema: graph,
  devtool: false
})
