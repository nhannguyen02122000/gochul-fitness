import InstantDBAuthSync from '@/components/InstantAuthDB'
import ReactQueryProvider from '@/providers/QueryClientProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { viVN } from '@clerk/localizations'
import {
  ClerkProvider
} from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

// Disable caching globally
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
        <body className={`${inter.variable} font-sans antialiased`}>
          <ReactQueryProvider>
            <TooltipProvider>
              {children}
              <Toaster position="top-center" richColors closeButton />
            </TooltipProvider>
          </ReactQueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
