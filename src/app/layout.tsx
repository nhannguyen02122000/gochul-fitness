import AntConfigProvider from '@/providers/AntConfigProvider'
import ReactQueryProvider from '@/providers/QueryClientProvider'
import { viVN } from '@clerk/localizations'
import {
  ClerkProvider
} from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import './globals.css'
import InstantDBAuthSync from '@/components/InstantAuthDB'

const notoFont = Noto_Sans({
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'GoChul - ComeFit',
  description: 'An application for booking services and ChulFitness',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GoChul Fitness'
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png'
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      localization={viVN}
      appearance={{
        layout: {
          unsafe_disableDevelopmentModeWarnings: true
        }
      }}
      signInUrl={'/sign-in'}
    >
      <InstantDBAuthSync />
      <html lang='en'>
        <body className={`${notoFont.className} antialiased`}>
          <ReactQueryProvider>
            <AntConfigProvider>{children}</AntConfigProvider>
          </ReactQueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
