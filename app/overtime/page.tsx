'use client'

import DashboardLayout from '@/components/layouts/DashboardLayout'
import OvertimeWidget from '@/components/ui/OvertimeWidget'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function OvertimePage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        載入中...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        重新導向至登入頁面...
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6">
        <OvertimeWidget />
      </div>
    </DashboardLayout>
  )
}
