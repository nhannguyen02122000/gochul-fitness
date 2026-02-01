'use client'

import { useEffect } from 'react'


function App() {
  // Use Instant's `useQuery()` hook to get the todos

  useEffect(() => {

    const fetchUserInformation = async () => {
      console.log('fetching user information')
      const response = await fetch('/api/user/getUserInformation')
      const data = await response.json()
      console.log(data)
    }

    fetchUserInformation()
  }, [])

  return (
    <div className="-mt-16 font-mono min-h-screen flex justify-center items-center flex-col space-y-4">

      <div className="text-xs text-center">Open another tab to see todos update in realtime!</div>
    </div>
  )
}

export default App