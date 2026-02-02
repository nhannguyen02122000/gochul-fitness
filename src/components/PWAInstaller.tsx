// src/components/PWAInstaller.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button, message } from 'antd'
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons'

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    // Register service worker
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

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Check if user has dismissed the install prompt before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setShowInstall(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Hide install prompt if already installed
    window.addEventListener('appinstalled', () => {
      setShowInstall(false)
      setDeferredPrompt(null)
      message.success('App installed successfully!')
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
    } else {
      console.log('User dismissed the install prompt')
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
      <div className="bg-white rounded-2xl shadow-2xl p-4 border-2 border-[#FA6868]/20">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FA6868] to-[#FAAC68] rounded-xl flex items-center justify-center shrink-0">
            <DownloadOutlined className="text-white text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Install GoChul Fitness
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Install our app for quick access and offline features!
            </p>
            <div className="flex gap-2">
              <Button
                type="primary"
                size="large"
                icon={<DownloadOutlined />}
                onClick={handleInstallClick}
                className="flex-1"
              >
                Install
              </Button>
              <Button
                size="large"
                icon={<CloseOutlined />}
                onClick={handleDismiss}
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

