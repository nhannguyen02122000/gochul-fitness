// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    contract: i.entity({
      created_at: i.number(),
      start_date: i.number().optional(),
      end_date: i.number().optional(),
      kind: i.string(), // PT, REHAB, PT_MONTHLY
      credits: i.number().optional(),
      status: i.string(),
      money: i.number()
    }),
    history: i.entity({
      date: i.number(),
      status: i.string(),
      from: i.number(),
      to: i.number()
    }),
    user_setting: i.entity({
      role: i.string(), // CUSTOMER, STAFF, ADMIN
      clerk_id: i.string(),
      first_name: i.string().optional(),
      last_name: i.string().optional()
    })
  },
  links: {
    historyContract: {
      forward: {
        on: 'contract',
        has: 'many',
        label: 'history'
      },
      reverse: {
        on: 'history',
        has: 'one',
        label: 'contract'
      }
    },
    historyUser: {
      forward: {
        on: 'history',
        has: 'one',
        label: 'users'
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'history'
      }
    },
    userSettings: {
      forward: {
        on: 'user_setting',
        has: 'one',
        label: 'users'
      },
      reverse: {
        on: '$users',
        has: 'one',
        label: 'user_setting'
      }
    },
    contractUser: {
      forward: {
        on: 'contract',
        has: 'one',
        label: 'users'
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'contract'
      }
    }
  },
  rooms: {}
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema { }
const schema: AppSchema = _schema;

export type { AppSchema }
export default schema;