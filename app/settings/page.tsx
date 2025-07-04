'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Button } from "@/components/ui/button"
import { SettingKey } from '@prisma/client'
import { Layout, Bell, Moon, Minimize, Clock, Mail, Lock } from 'lucide-react'

interface Setting {
  id: string
  key: SettingKey
  value: string
  updatedAt: string
}

// 設定選項定義
const SETTINGS = [
  {
    key: 'USE_CLASSIC_LAYOUT',
    title: '使用傳統佈局',
    description: '使用標籤式佈局顯示今日工作和預定工作',
    icon: Layout
  },
  {
    key: 'ENABLE_NOTIFICATIONS',
    title: '啟用通知',
    description: '接收系統通知（如下班提醒、工作提醒等）',
    icon: Bell
  },
  {
    key: 'DARK_MODE',
    title: '深色模式',
    description: '使用深色主題',
    icon: Moon
  },
  {
    key: 'COMPACT_VIEW',
    title: '精簡視圖',
    description: '使用更緊湊的介面佈局',
    icon: Minimize
  },
  {
    key: 'AUTO_CLOCK_OUT',
    title: '自動下班提醒',
    description: '在固定時間提醒下班打卡',
    icon: Clock
  }
]

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // 載入設定
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/users/settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('載入設定失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      loadSettings()
    }
  }, [status])

  // 檢查設定值
  const isEnabled = (key: string) => {
    const setting = settings.find(s => s.key === key)
    return setting ? setting.value === 'true' : false
  }

  // 切換設定
  const toggleSetting = async (key: string) => {
    try {
      setSaving(key)
      const newValue = !isEnabled(key)
      
      const response = await fetch('/api/users/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key,
          value: String(newValue)
        })
      })

      if (response.ok) {
        const updatedSetting = await response.json()
        setSettings(prev => {
          const existing = prev.find(s => s.key === key)
          if (existing) {
            return prev.map(s => s.key === key ? updatedSetting : s)
          }
          return [...prev, updatedSetting]
        })
      }
    } catch (error) {
      console.error('更新設定失敗:', error)
    } finally {
      setSaving(null)
    }
  }

  // 測試瀏覽器通知
  const testBrowserNotification = async () => {
    const notificationService = (await import('@/lib/notification')).notificationService;
    
    // 先請求權限
    const granted = await notificationService.requestPermission();
    if (!granted) {
      alert('請先允許瀏覽器通知權限');
      return;
    }

    // 立即發送一個測試通知
    await notificationService.sendPushNotification(
      '測試通知',
      {
        body: '這是一個測試通知，確認您的瀏覽器通知功能正常運作。',
        tag: 'test-notification',
      }
    );

    // 排程 10 秒後發送另一個通知
    const scheduledTime = new Date(Date.now() + 10000);
    await notificationService.schedulePushNotification(
      '排程測試通知',
      {
        body: '這是一個排程測試通知，在 10 秒後發送。',
        tag: 'test-scheduled-notification',
        scheduledTime,
      }
    );
  };

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // 載入中狀態
  if (status === 'loading' || loading) {
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
    return null
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 頁面標題 */}
          <div>
            <h1 className="text-2xl font-bold text-white">⚙️ 系統設定</h1>
            <p className="text-white/60 mt-2">
              自訂您的工作環境和偏好設定
            </p>
          </div>

          {/* 設定列表 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/10">
              {SETTINGS.map((setting) => {
                const Icon = setting.icon
                const enabled = isEnabled(setting.key)
                return (
                  <div key={setting.key} className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                          <Icon className="w-5 h-5 text-white/80" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-white">
                            {setting.title}
                          </h3>
                          <p className="text-sm text-white/60 mt-1">
                            {setting.description}
                          </p>
                          {/* 為通知設定添加測試按鈕 */}
                          {setting.key === 'ENABLE_NOTIFICATIONS' && enabled && (
                            <button
                              onClick={testBrowserNotification}
                              className="mt-3 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm rounded-lg transition-colors"
                            >
                              測試通知
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          variant={enabled ? "default" : "outline"}
                          onClick={() => toggleSetting(setting.key)}
                          disabled={saving === setting.key}
                          className={
                            enabled
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                              : "border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                          }
                        >
                          {saving === setting.key ? (
                            <div className="w-12 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                            </div>
                          ) : enabled ? (
                            "已啟用"
                          ) : (
                            "已停用"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 帳號設定區塊 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">👤 帳號設定</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <Mail className="w-5 h-5 text-white/80" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">修改信箱</h3>
                      <p className="text-sm text-white/60">更新您的登入信箱地址</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/settings/email')}
                  >
                    修改
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <Lock className="w-5 h-5 text-white/80" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">修改密碼</h3>
                      <p className="text-sm text-white/60">更新您的登入密碼</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/settings/password')}
                  >
                    修改
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 