'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function TestNotificationPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  const quickTests = [
    { name: '基本通知', message: '這是一個基本測試通知' },
    { name: '高優先級', message: '這是高優先級通知', priority: 'high' },
    { name: '安全警告', message: '安全警告：檢測到異常登入', tags: ['security', 'alert'] },
    { name: '工作提醒', message: '您有新的工作任務需要處理', tags: ['work'] },
  ]

  const sendTestNotification = async (test: any) => {
    if (!session?.user) {
      alert('請先登入')
      return
    }
    
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
          message: test.message,
          priority: test.priority,
          tags: test.tags,
        }),
      })

      if (response.ok) {
        alert(`測試通知「${test.name}」已發送！`)
      } else {
        alert('發送失敗，請檢查 Novu 設定')
      }
    } catch (error) {
      console.error('發送測試通知失敗:', error)
      alert('發送失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Novu 通知測試</h1>
          
          <div className="space-y-4">
            <div className="text-white/80 mb-4 space-y-1">
              <div>資料庫用戶 ID: {(session?.user as any)?.id || '未登入'}</div>
              <div>Novu Subscriber ID: {session?.user ? `user_${(session.user as any).id}` : '未登入'}</div>
            </div>
            
            {quickTests.map((test, index) => (
              <div key={index} className="bg-white/10 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white font-semibold">{test.name}</h3>
                    <p className="text-white/70 text-sm">{test.message}</p>
                    {test.tags && (
                      <div className="flex gap-2 mt-2">
                        {test.tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => sendTestNotification(test)}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {loading ? '發送中...' : '發送'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <a href="/notifications" className="text-blue-300 hover:text-blue-200">
              → 查看通知收件箱
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 