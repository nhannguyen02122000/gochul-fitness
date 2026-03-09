// src/app/offline/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
  const router = useRouter()

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push('/')
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          You&apos;re Offline
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Please check your internet connection and try again.
        </p>
        <Button onClick={handleRetry} className="min-w-[160px] h-11">
          Try Again
        </Button>
      </div>
    </div>
  )
}
