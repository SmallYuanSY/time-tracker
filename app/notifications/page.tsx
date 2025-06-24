'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from "@/components/layouts/DashboardLayout"
import NovuInbox from "@/app/components/ui/inbox/NovuInbox"
import { Button } from "@/components/ui/button"

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    // 檢查用戶是否在資料庫中存在
    if (status === 'authenticated' && session?.user) {
      const checkUserExists = async () => {
        try {
          const response = await fetch('/api/users')
          if (!response.ok) {
            console.error('用戶不存在，重新導向到登入頁面')
            router.push('/login')
          }
        } catch (error) {
          console.error('檢查用戶狀態失敗:', error)
          router.push('/login')
        }
      }
      checkUserExists()
    }
  }, [status, session, router])

  // 載入中狀態
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-4"></div>
            <div>載入中...</div>
          </div>
        </div>
      </div>
    )
  }

  // 未登入狀態
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <div className="text-white text-center">
            <div className="text-lg mb-2">🔐 需要登入</div>
            <div>正在重新導向至登入頁面...</div>
          </div>
        </div>
      </div>
    )
  }

  const sendTestNotification = async () => {
    if (!session?.user) return
    
    setLoading(true)
    try {
      const userId = (session.user as any).id;
      const subscriberId = `user_${userId}`;
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriberId: subscriberId,
          userId: userId,
          message: message || '這是一個測試通知！'
        }),
      })

      if (response.ok) {
        alert('測試通知已發送！')
        setMessage('')
      } else {
        alert('發送失敗，請檢查設定')
      }
    } catch (error) {
      console.error('發送測試通知失敗:', error)
      alert('發送失敗')
    } finally {
      setLoading(false)
    }
  }



  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">通知中心</h1>
          <p className="text-white/70 mt-2">查看您的所有通知和訊息</p>
        </div>



        {/* 測試通知區域 */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">發送測試通知</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <input
                type="text"
                placeholder="輸入測試訊息（選填）"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <Button
              onClick={sendTestNotification}
              disabled={loading || !session?.user}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? '發送中...' : '發送測試通知'}
            </Button>
          </div>
        </div>
        
        {/* Novu Inbox */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <NovuInbox />
        </div>
      </div>
    </DashboardLayout>
  )
} 