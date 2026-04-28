'use client'

import { instantClient } from '@/lib/db'
import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect } from 'react'

// If a user is signed in with Clerk, sign them in with InstantDB
export default function InstantDBAuthSync() {
  const { user } = useUser()
  const { getToken } = useAuth()

  useEffect(() => {
    if (!user) {
      instantClient.auth.signOut()
      return
    }

    getToken()
      .then((token) => {
        // Create a long-lived session with Instant for your Clerk user
        // It will look up the user by email or create a new user with
        // the email address in the session token.
        return instantClient.auth.signInWithIdToken({
          clientName: process.env.NEXT_PUBLIC_CLERK_CLIENT_NAME as string,
          idToken: token as string,
        })
      })
      .then(() => {
        // Sync email to $users so createUserSetting can find the record
        const email = user.emailAddresses?.[0]?.emailAddress
        if (email) {
          // Use the auth object's own identity to write the email
          return instantClient.transact([
            instantClient.tx.$users[instantClient.auth.id!].update({ email })
          ])
        }
      })
      .catch((error) => {
        console.error('Error signing in with Instant', error)
      })
  }, [user])

  return null
}