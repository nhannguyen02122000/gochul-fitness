import InstantDBAuthSync from '@/components/InstantAuthDB'
import ReactQueryProvider from '@/providers/QueryClientProvider'
import RealtimeProvider from '@/providers/RealtimeProvider'
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
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          <ReactQueryProvider>
            <RealtimeProvider />
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
