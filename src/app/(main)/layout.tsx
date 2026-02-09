// src/app/(main)/layout.tsx
import MainLayout from '@/components/layout/MainLayout'
import { ReactNode } from 'react'

// Disable caching for all pages in this layout
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}

