import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import AntConfigProvider from '@/providers/AntConfigProvider'
import './globals.css'

const notoFont = Noto_Sans({
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'GoChul - ComeFit',
  description: 'An application for booking services and ChulFitness'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={`${notoFont.className} antialiased`}>
        <AntConfigProvider>{children}</AntConfigProvider>
      </body>
    </html>
  )
}
