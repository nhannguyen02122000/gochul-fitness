// src/app/(main)/layout.tsx
import MainLayout from '@/components/layout/MainLayout'
import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}

