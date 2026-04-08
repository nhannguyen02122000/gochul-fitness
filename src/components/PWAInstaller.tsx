// src/components/PWAInstaller.tsx
'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.includes('localhost')

    if (isLocalhost) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister()
          })
        })
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name)
          })
        })
      }
      return
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration)
          })
          .catch((error) => {
            console.log('SW registration failed:', error)
          })
      })
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setShowInstall(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    window.addEventListener('appinstalled', () => {
      setShowInstall(false)
      setDeferredPrompt(null)
      toast.success('App installed successfully!')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    }

    setDeferredPrompt(null)
    setShowInstall(false)
  }

  const handleDismiss = () => {
    setShowInstall(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showInstall) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-xl shadow-2xl p-4 border border-border">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 bg-[var(--color-cta)] rounded-lg flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-0.5">
              Install ChulFitCoach
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Install for quick access and offline features
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="flex-1 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Install
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4 mr-1" />
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
