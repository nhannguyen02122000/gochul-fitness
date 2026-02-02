// src/app/offline/page.tsx
'use client'

import { Button, Result } from 'antd'
import { WifiOutlined } from '@ant-design/icons'
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Result
        icon={<WifiOutlined className="text-gray-400" />}
        title="You're Offline"
        subTitle="Please check your internet connection and try again."
        extra={
          <Button type="primary" size="large" onClick={handleRetry}>
            Try Again
          </Button>
        }
      />
    </div>
  )
}

