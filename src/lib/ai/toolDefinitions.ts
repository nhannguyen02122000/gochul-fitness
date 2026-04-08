/**
 * ChulFitCoach AI Chatbot — Tool Definitions
 *
 * Phase 1: All 10 ChulFitCoach API endpoints defined as Anthropic tool_use objects.
 * Phase 4: TOOL_DEFINITIONS is passed to anthropicClient.messages.create({ tools }).
 *
 * ══════════════════════════════════════════════════════════════
 * ROLE PERMISSIONS SUMMARY
 * ══════════════════════════════════════════════════════════════
 * Tool                    │ ADMIN │ STAFF │ CUSTOMER │
 * ─────────────────────────┼───────┼───────┼──────────┤
 * get_contracts           │   ✅  │   ✅  │    ✅    │
 * create_contract         │   ✅  │   ✅  │    ❌    │
 * update_contract         │   ✅  │   ❌  │    ❌    │
 * delete_contract         │   ✅  │   ❌  │    ❌    │
 * update_contract_status  │   ✅  │  ⚠️   │   ⚠️    │
 * get_sessions            │   ✅  │   ✅  │    ✅    │
 * create_session          │   ✅  │   ✅  │   ⚠️    │
 * update_session          │   ✅  │  ⚠️  │   ⚠️    │
 * update_session_status   │   ✅  │   ✅  │    ✅    │
 * update_session_note     │   ✅  │  ⚠️  │   ⚠️    │
 *
 * ⚠️ = limited (see description)
 *
 * The API layer is the authoritative enforcement gate. The AI uses this matrix
 * in the system prompt (hybrid approach — D-02) to give contextually accurate
 * error messages and ask appropriate follow-up questions.
 *
 * @file src/lib/ai/toolDefinitions.ts
 */

import 'server-only'

// Convenience alias matching the Anthropic SDK type
type Tool = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. get_user
// ─────────────────────────────────────────────────────────────────────────────
// All authenticated roles can search users. Supports partial name match
// (diacritic-insensitive) and exact $users.id UUID lookup.
// When multiple matches: returns numbered list; AI asks user to pick.
// When user picks: next call includes resolved_index to confirm exact user.

export const get_user: Tool = {
  name: 'get_user',
  description:
    'Look up a user by their name or InstantDB $users.id. Use this to resolve ' +
    'a name mention (e.g., "Minh", "Lan", "PT Minh Hoàng") to an InstantDB ID ' +
    'before calling create_contract, create_session, update_session, etc. ' +
    'ALWAYS execute this tool immediately — it is a READ-only tool (no confirmation needed). ' +
    'Returns a numbered list. If more than one match: present the list and ask the user ' +
    'to pick one by number (0, 1, 2…) or full name. If no match: tell the user to try a more specific name. ' +
    'Supports both partial name search and exact $users.id lookup.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Name to search (partial, diacritic-insensitive) or exact InstantDB $users.id (UUID format).',
      },
      role: {
        type: 'string',
        description: 'Optional role filter: CUSTOMER | STAFF | ADMIN',
        enum: ['CUSTOMER', 'STAFF', 'ADMIN'],
      },
      resolved_index: {
        type: 'number',
        description:
          'Optional. When the user picks from a numbered list, pass the ' +
          '0-based index here to confirm the exact user. Use -1 for the last item.',
      },
    },
    required: ['query'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. get_contracts
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: all contracts
// STAFF: contracts where sale_by = their InstantDB user ID
// CUSTOMER: contracts where purchased_by = their InstantDB user ID (NEWLY_CREATED excluded)

export const get_contracts: Tool = {
  name: 'get_contracts',
  description:
    'List gym contracts. Returns contracts filtered by the calling user role ' +
    '(ADMIN sees all, STAFF sees their own sales, CUSTOMER sees their own purchases). ' +
    'Supports pagination, status filtering, kind filtering, and date range filtering.',
  input_schema: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Page number (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Items per page (default: 10, max: 50)',
      },
      statuses: {
        type: 'string',
        description:
          'Comma-separated list of contract statuses. ' +
          'Valid values: NEWLY_CREATED, CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, ' +
          'CUSTOMER_PAID, PT_CONFIRMED, ACTIVE, CANCELED, EXPIRED. ' +
          'CUSTOMER role cannot request NEWLY_CREATED status.',
      },
      kind: {
        type: 'string',
        description:
          'Contract kind filter. Values: PT (Personal Training), ' +
          'REHAB (Rehabilitation), PT_MONTHLY (Monthly PT)',
        enum: ['PT', 'REHAB', 'PT_MONTHLY'],
      },
      start_date: {
        type: 'number',
        description: 'Filter contracts starting on or after this Unix timestamp (ms)',
      },
      end_date: {
        type: 'number',
        description: 'Filter contracts starting on or before this Unix timestamp (ms)',
      },
      sale_by_name: {
        type: 'string',
        description: 'Search by trainer/PT name (ADMIN/CUSTOMER only)',
      },
      purchased_by_name: {
        type: 'string',
        description: 'Search by customer name (ADMIN/STAFF only)',
      },
    },
    required: [],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. create_contract
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: ✅ create for any customer
// STAFF: ✅ create for any customer
// CUSTOMER: ❌ blocked — do NOT call this tool; tell user politely instead

export const create_contract: Tool = {
  name: 'create_contract',
  description:
    'Create a new gym contract. ADMIN and STAFF roles only. ' +
    'CUSTOMER role is BLOCKED — do not call this tool; explain politely. ' +
    'Returns HTTP 403 if called by CUSTOMER. Contract is created with ' +
    'status NEWLY_CREATED and sale_by set to the authenticated user.',
  input_schema: {
    type: 'object',
    properties: {
      purchased_by: {
        type: 'string',
        description: 'InstantDB $users.id of the customer (required)',
      },
      kind: {
        type: 'string',
        description: 'Contract type (required)',
        enum: ['PT', 'REHAB', 'PT_MONTHLY'],
      },
      credits: {
        type: 'number',
        description: 'Number of sessions (PT/REHAB only; PT_MONTHLY does not use credits)',
      },
      duration_per_session: {
        type: 'number',
        description: 'Minutes per session (15–180, must be divisible by 15)',
      },
      money: {
        type: 'number',
        description: 'Contract price in VND (required)',
      },
      start_date: {
        type: 'number',
        description: 'Contract start date as Unix timestamp (ms)',
      },
      end_date: {
        type: 'number',
        description: 'Contract end date as Unix timestamp (ms, required)',
      },
    },
    required: ['purchased_by', 'kind', 'money', 'end_date'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. update_contract_status
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: can force-set most transitions (see PROGRAM.md §4.2)
// STAFF: NEWLY_CREATED→CUSTOMER_REVIEW, CUSTOMER_PAID→PT_CONFIRMED, limited cancels
// CUSTOMER: limited workflow transitions on own contracts only
// See RBAC PRE-FILTER section in system prompt for full details.

export const update_contract_status: Tool = {
  name: 'update_contract_status',
  description:
    'Update the status of a gym contract (workflow transitions). ' +
    'ADMIN: all valid transitions. ' +
    'STAFF: NEWLY_CREATED→CUSTOMER_REVIEW, CUSTOMER_PAID→PT_CONFIRMED, ' +
    'NEWLY_CREATED/CUSTOMER_REVIEW/CUSTOMER_CONFIRMED→CANCELED. ' +
    'CUSTOMER: CUSTOMER_REVIEW→CUSTOMER_CONFIRMED/CANCELED, ' +
    'CUSTOMER_CONFIRMED→CUSTOMER_PAID/CANCELED, PT_CONFIRMED→ACTIVE. ' +
    'ACTIVE contracts cannot be canceled by STAFF or CUSTOMER. ' +
    'See RBAC PRE-FILTER section in system prompt for blocked transitions.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'InstantDB contract ID (required)',
      },
      status: {
        type: 'string',
        description:
          'New status value. Valid transitions depend on current status and role. ' +
          'Values: CUSTOMER_REVIEW, CUSTOMER_CONFIRMED, CUSTOMER_PAID, ' +
          'PT_CONFIRMED, ACTIVE, CANCELED, EXPIRED.',
        enum: [
          'CUSTOMER_REVIEW',
          'CUSTOMER_CONFIRMED',
          'CUSTOMER_PAID',
          'PT_CONFIRMED',
          'ACTIVE',
          'CANCELED',
          'EXPIRED',
        ],
      },
    },
    required: ['contract_id', 'status'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. update_contract
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN only. Updates contract fields (not status).
// STAFF/CUSTOMER: BLOCKED — do NOT call; explain politely instead.

export const update_contract: Tool = {
  name: 'update_contract',
  description:
    'Update contract fields (not status). ADMIN role only. ' +
    'STAFF and CUSTOMER are BLOCKED — do not call this tool; explain politely instead. ' +
    'Can update: kind, credits, duration_per_session, money, start_date, end_date.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'InstantDB contract ID (required)',
      },
      kind: {
        type: 'string',
        description: 'Contract type',
        enum: ['PT', 'REHAB', 'PT_MONTHLY'],
      },
      credits: {
        type: 'number',
        description: 'Number of sessions',
      },
      duration_per_session: {
        type: 'number',
        description: 'Minutes per session (15–180, divisible by 15)',
      },
      money: {
        type: 'number',
        description: 'Contract price in VND',
      },
      start_date: {
        type: 'number',
        description: 'Contract start date as Unix timestamp (ms)',
      },
      end_date: {
        type: 'number',
        description: 'Contract end date as Unix timestamp (ms)',
      },
    },
    required: ['contract_id'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. delete_contract
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN only. Soft-deletes by setting status to CANCELED.
// STAFF/CUSTOMER: BLOCKED — do NOT call; explain politely instead.

export const delete_contract: Tool = {
  name: 'delete_contract',
  description:
    'Cancel (soft-delete) a contract by setting its status to CANCELED. ' +
    'ADMIN role only. STAFF and CUSTOMER are BLOCKED — do not call this tool; ' +
    'explain politely instead. ACTIVE contracts cannot be deleted.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'InstantDB contract ID (required)',
      },
    },
    required: ['contract_id'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. get_sessions
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: all sessions
// STAFF: sessions they created (historyUser link)
// CUSTOMER: sessions from their own purchased contracts

export const get_sessions: Tool = {
  name: 'get_sessions',
  description:
    'List all training sessions (history). Returns sessions filtered by role. ' +
    'ADMIN sees all sessions; STAFF sees their own; CUSTOMER sees sessions from their contracts. ' +
    'Supports pagination, status/date filtering, and trainer/customer name search.',
  input_schema: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Page number (default: 1)',
      },
      limit: {
        type: 'number',
        description: 'Items per page (default: 10, max: 50)',
      },
      statuses: {
        type: 'string',
        description:
          'Comma-separated list of session statuses. ' +
          'Valid values: NEWLY_CREATED, CHECKED_IN, CANCELED, EXPIRED',
      },
      start_date: {
        type: 'number',
        description: 'Filter sessions on or after this Unix timestamp (ms)',
      },
      end_date: {
        type: 'number',
        description: 'Filter sessions on or before this Unix timestamp (ms)',
      },
      teach_by_name: {
        type: 'string',
        description: 'Search by trainer name',
      },
      customer_name: {
        type: 'string',
        description: 'Search by customer name',
      },
      from_minute: {
        type: 'number',
        description: 'Filter sessions starting at or after this minute of day (0–1440)',
      },
      to_minute: {
        type: 'number',
        description: 'Filter sessions starting at or before this minute of day (0–1440)',
      },
    },
    required: [],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. create_session
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: no restrictions
// STAFF: no restrictions
// CUSTOMER: can only create for contracts they purchased (purchased_by = their ID)
// Additional constraints: contract must be ACTIVE, not expired, no time overlap,
// credits available (PT/REHAB). Duration must match contract.duration_per_session.

export const create_session: Tool = {
  name: 'create_session',
  description:
    'Book a new training session. ' +
    'ADMIN/STAFF: any contract. CUSTOMER: only own ACTIVE contracts (purchased_by = your user ID), ' +
    'not expired, credits available. ' +
    'Do NOT call for another customer’s contract — explain politely instead. ' +
    'Additional constraints: no time overlap with existing sessions by the same trainer.',
  input_schema: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'InstantDB contract ID of the contract to book against (required)',
      },
      date: {
        type: 'number',
        description:
          'Session date as Unix timestamp (ms, day only — time component is ignored) (required)',
      },
      from: {
        type: 'number',
        description:
          'Start minute of the session (0–1440, e.g., 480 = 8:00 AM) (required)',
      },
      to: {
        type: 'number',
        description:
          'End minute of the session (0–1440, must be after `from`) (required)',
      },
      teach_by: {
        type: 'string',
        description: 'InstantDB $users.id of the trainer (required)',
      },
    },
    required: ['contract_id', 'date', 'from', 'to', 'teach_by'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. update_session
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: any session
// STAFF: sessions they created (users link)
// CUSTOMER: sessions from contracts they purchased
// Cannot update CHECKED_IN, CANCELED, or EXPIRED sessions.

export const update_session: Tool = {
  name: 'update_session',
  description:
    'Update a training session (date, time, or trainer). Reschedules a session. ' +
    'ADMIN: any session. STAFF: sessions they created. CUSTOMER: sessions from their own contracts. ' +
    'CUSTOMER attempting to update another person’s session: do NOT call; explain politely instead. ' +
    'Cannot update CHECKED_IN, CANCELED, or EXPIRED sessions.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: {
        type: 'string',
        description: 'InstantDB history/session ID (required)',
      },
      date: {
        type: 'number',
        description: 'New session date as Unix timestamp (ms, day only)',
      },
      from: {
        type: 'number',
        description: 'New start minute (0–1440)',
      },
      to: {
        type: 'number',
        description: 'New end minute (0–1440)',
      },
      teach_by: {
        type: 'string',
        description: 'New trainer InstantDB $users.id',
      },
    },
    required: ['history_id'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. update_session_status
// ─────────────────────────────────────────────────────────────────────────────
// Dual check-in system: both customer and staff must check in → status CHECKED_IN.
// Cancel (NEWLY_CREATED→CANCELED) allowed for any role on NEWLY_CREATED sessions.
// EXPIRED sessions cannot be updated.

export const update_session_status: Tool = {
  name: 'update_session_status',
  description:
    'Update a session status: check in a customer (NEWLY_CREATED→CHECKED_IN) or ' +
    'cancel a session (NEWLY_CREATED→CANCELED). ' +
    'Dual check-in: CUSTOMER sets user_check_in_time, STAFF/ADMIN sets staff_check_in_time. ' +
    'Both timestamps must be set → status becomes CHECKED_IN. ' +
    'Cancel is only allowed for NEWLY_CREATED sessions. EXPIRED sessions cannot be updated.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: {
        type: 'string',
        description: 'InstantDB history/session ID (required)',
      },
      action: {
        type: 'string',
        description:
          'Action to perform. "check_in": set the calling party\'s check-in timestamp. ' +
          '"cancel": cancel the session (NEWLY_CREATED only).',
        enum: ['check_in', 'cancel'],
      },
    },
    required: ['history_id', 'action'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. update_session_note
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: can update any session note
// STAFF: can update staff_note for sessions where teach_by matches their user ID
// CUSTOMER: can update customer_note for sessions from contracts they purchased

export const update_session_note: Tool = {
  name: 'update_session_note',
  description:
    'Add or update a note on a training session. ' +
    'STAFF/ADMIN can update staff_note; CUSTOMER can update customer_note. ' +
    'STAFF can only update notes for sessions where teach_by matches their user ID.',
  input_schema: {
    type: 'object',
    properties: {
      history_id: {
        type: 'string',
        description: 'InstantDB history/session ID (required)',
      },
      note: {
        type: 'string',
        description: 'Note text to set (required)',
      },
    },
    required: ['history_id', 'note'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. get_occupied_time_slots (Phase 5)
// ─────────────────────────────────────────────────────────────────────────────
export const get_occupied_time_slots: Tool = {
  name: 'get_occupied_time_slots',
  description:
    'Check which time slots a trainer already has booked on a given date. ' +
    'Returns a list of occupied time ranges as [from, to] minute pairs. ' +
    'Use this before creating a session to avoid conflicts.',
  input_schema: {
    type: 'object',
    properties: {
      trainer_id: {
        type: 'string',
        description: "Trainer's InstantDB $users.id (required)",
      },
      date: {
        type: 'number',
        description: 'Target date as Unix timestamp (ms, day precision) (required)',
      },
    },
    required: ['trainer_id', 'date'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL_DEFINITIONS — ordered array of all 11 tools
// ─────────────────────────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS: Tool[] = [
  get_user,
  get_contracts,
  create_contract,
  update_contract_status,
  update_contract,
  delete_contract,
  get_sessions,
  create_session,
  update_session,
  update_session_status,
  update_session_note,
  // Phase 5 additions:
  get_occupied_time_slots,
]
