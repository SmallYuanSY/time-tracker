'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, User, Mail, Lock, Bell, Palette, 
  Globe, Shield, HelpCircle, LogOut, ChevronRight,
  Settings, Smartphone
} from 'lucide-react'

interface SettingItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href?: string
  action?: () => void
  color: string
}

export default function MobileSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    })
  }

  const settingSections = [
    {
      title: '帳號設定',
      items: [
        {
          id: 'profile',
          title: '個人資料',
          description: '編輯姓名、頭像等基本資訊',
          icon: <User className="w-5 h-5" />,
          href: '/settings',
          color: 'bg-blue-500'
        },
        {
          id: 'email',
          title: '電子信箱',
          description: '更改登入信箱地址',
          icon: <Mail className="w-5 h-5" />,
          href: '/settings/email',
          color: 'bg-green-500'
        },
        {
          id: 'password',
          title: '密碼設定',
          description: '修改登入密碼',
          icon: <Lock className="w-5 h-5" />,
          href: '/settings/password',
          color: 'bg-red-500'
        }
      ]
    },
    {
      title: '應用程式設定',
      items: [
        {
          id: 'notifications',
          title: '通知設定',
          description: '管理推播通知偏好',
          icon: <Bell className="w-5 h-5" />,
          href: '/notifications',
          color: 'bg-yellow-500'
        },
        {
          id: 'theme',
          title: '外觀主題',
          description: '切換深色/淺色模式',
          icon: <Palette className="w-5 h-5" />,
          action: () => {
            // TODO: 實作主題切換
            console.log('切換主題')
          },
          color: 'bg-purple-500'
        },
        {
          id: 'language',
          title: '語言設定',
          description: '選擇介面語言',
          icon: <Globe className="w-5 h-5" />,
          action: () => {
            // TODO: 實作語言切換
            console.log('語言設定')
          },
          color: 'bg-indigo-500'
        }
      ]
    },
    {
      title: '其他',
      items: [
        {
          id: 'privacy',
          title: '隱私權政策',
          description: '查看隱私權與資料使用政策',
          icon: <Shield className="w-5 h-5" />,
          action: () => {
            // TODO: 開啟隱私權政策
            console.log('隱私權政策')
          },
          color: 'bg-gray-500'
        },
        {
          id: 'help',
          title: '說明與支援',
          description: '常見問題與技術支援',
          icon: <HelpCircle className="w-5 h-5" />,
          action: () => {
            // TODO: 開啟說明頁面
            console.log('說明與支援')
          },
          color: 'bg-orange-500'
        }
      ]
    }
  ]

  const handleItemClick = (item: SettingItem) => {
    if (item.href) {
      router.push(item.href)
    } else if (item.action) {
      item.action()
    }
  }

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-600 via-slate-600 to-zinc-600 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-4"></div>
            <div>載入中...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-600 via-slate-600 to-zinc-600">
      {/* 頂部導航欄 */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-white font-semibold text-lg">設定</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-white/60" />
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="p-4 space-y-4">
        {/* 用戶資訊卡片 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-semibold text-lg">
                {session?.user?.name || '使用者'}
              </h2>
              <p className="text-white/70 text-sm">
                {session?.user?.email}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Smartphone className="w-3 h-3 text-white/50" />
                <span className="text-white/50 text-xs">手機版</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 設定選項 */}
        {settingSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h3 className="text-white font-medium text-sm px-2 uppercase tracking-wide opacity-70">
              {section.title}
            </h3>
            
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 overflow-hidden">
              <div className="divide-y divide-white/10">
                {section.items.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors touch-manipulation active:scale-95"
                  >
                    <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-white font-medium">{item.title}</h4>
                      <p className="text-white/60 text-sm">{item.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        ))}

        {/* 登出按鈕 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4 mt-8">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 text-red-400 border-red-400/30 hover:bg-red-500/10 hover:border-red-400/50 font-semibold text-lg touch-manipulation"
          >
            <LogOut className="w-5 h-5 mr-2" />
            登出帳號
          </Button>
        </Card>

        {/* 版本資訊 */}
        <div className="text-center py-4">
          <p className="text-white/40 text-xs">
            工作日誌 手機版 v1.0.0
          </p>
        </div>
      </main>
    </div>
  )
} 