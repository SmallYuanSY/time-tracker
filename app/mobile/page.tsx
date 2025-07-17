'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import MobileSmartPunchWidget from './components/MobileSmartPunchWidget'
import TodayWorkSummary from '@/components/TodayWorkSummary'
import TodayStatsCard from '@/components/TodayStatsCard'
import MobileWorkLogModal from './components/MobileWorkLogModal'
import { Portal } from '@/components/ui/portal'
import { 
  Clock, Calendar, BookOpen, BarChart, Users, 
  Settings, Menu, X, Home, Briefcase, FileClock,
  User, LogOut
} from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileNavItem {
  name: string
  icon: React.ReactNode
  href: string
  color: string
}

const mobileNavItems: MobileNavItem[] = [
  { 
    name: '首頁', 
    icon: <Home className="w-5 h-5" />, 
    href: '/mobile',
    color: 'bg-blue-500'
  },
  { 
    name: '工作日誌', 
    icon: <BookOpen className="w-5 h-5" />, 
    href: '/mobile/journal',
    color: 'bg-green-500'
  },
  { 
    name: '案件管理', 
    icon: <Briefcase className="w-5 h-5" />, 
    href: '/mobile/projects',
    color: 'bg-purple-500'
  },
  { 
    name: '請假', 
    icon: <FileClock className="w-5 h-5" />, 
    href: '/mobile/leave',
    color: 'bg-orange-500'
  },
  { 
    name: '聯絡人', 
    icon: <Users className="w-5 h-5" />, 
    href: '/mobile/contacts',
    color: 'bg-pink-500'
  },
  { 
    name: '設定', 
    icon: <Settings className="w-5 h-5" />, 
    href: '/mobile/settings',
    color: 'bg-gray-500'
  },
]

export default function MobilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [summaryKey, setSummaryKey] = useState(0)
  const [punchWidgetKey, setPunchWidgetKey] = useState(0)
  const [showWorkLogModal, setShowWorkLogModal] = useState(false)
  const [isOvertimeMode, setIsOvertimeMode] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // 初始化
  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
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

  const handleNavigation = (href: string) => {
    setShowMobileMenu(false)
    if (href.startsWith('/mobile/')) {
      router.push(href)
    } else {
      // 對於非手機版路由，重定向到對應的手機版
      const mobilePath = href.replace('/', '/mobile/')
      router.push(mobilePath)
    }
  }

  const handleWorkLogSave = () => {
    setSummaryKey(k => k + 1)
    setPunchWidgetKey(k => k + 1)
    setShowWorkLogModal(false)
    setIsOvertimeMode(false)
  }

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-4"></div>
            <div>載入中...</div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
      {/* 頂部導航欄 */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-white font-semibold text-lg">工作日誌</h1>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileMenu(true)}
            className="text-white hover:bg-white/10"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="p-4 space-y-4 pb-20">
        {/* 歡迎卡片 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="text-center text-white">
            <h2 className="text-lg font-semibold mb-2">
              哈囉，{session?.user?.name || '使用者'}！
            </h2>
            {currentTime && (
              <>
                <div className="text-3xl font-bold font-mono mb-1">
                  {format(currentTime, 'HH:mm:ss')}
                </div>
                <div className="text-sm opacity-80">
                  {format(currentTime, 'yyyy年MM月dd日 EEEE', { locale: zhTW })}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* 智能打卡 */}
        <MobileSmartPunchWidget 
          key={punchWidgetKey}
          onWorkLogSaved={() => setSummaryKey(k => k + 1)}
          onOpenWorkLogModal={(isOvertime?: boolean) => {
            setIsOvertimeMode(!!isOvertime)
            setShowWorkLogModal(true)
          }}
        />

        {/* 今日統計 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center gap-2 mb-3 text-white">
            <BarChart className="w-5 h-5" />
            <h3 className="font-semibold">今日統計</h3>
          </div>
          <TodayStatsCard />
        </Card>

        {/* 今日工作摘要 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center gap-2 mb-3 text-white">
            <Calendar className="w-5 h-5" />
            <h3 className="font-semibold">今日工作</h3>
          </div>
          <TodayWorkSummary 
            key={summaryKey}
            onRefresh={() => setSummaryKey(k => k + 1)}
            refreshTrigger={summaryKey}
            isMobile={true}
          />
        </Card>

        {/* 快速操作 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <h3 className="font-semibold mb-3 text-white">快速操作</h3>
          <div className="grid grid-cols-2 gap-3">
            {mobileNavItems.slice(1, 5).map((item) => (
              <Button
                key={item.name}
                variant="outline"
                className="h-16 flex flex-col gap-1 bg-white/5 border-white/20 text-white hover:bg-white/10 touch-manipulation active:scale-95 transition-all"
                onClick={() => handleNavigation(item.href)}
              >
                <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center mb-1`}>
                  {item.icon}
                </div>
                <span className="text-xs">{item.name}</span>
              </Button>
            ))}
          </div>
        </Card>
      </main>

      {/* 手機版側邊選單 */}
      <Portal>
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-lg border-l border-gray-200/20"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 選單標題 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200/20">
                  <h2 className="text-lg font-semibold">選單</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* 用戶資訊 */}
                <div className="p-4 border-b border-gray-200/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {session?.user?.name || '使用者'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session?.user?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 導航項目 */}
                <div className="p-4 space-y-2">
                  {mobileNavItems.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className="w-full justify-start h-12 touch-manipulation"
                      onClick={() => handleNavigation(item.href)}
                    >
                      <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center mr-3`}>
                        {item.icon}
                      </div>
                      {item.name}
                    </Button>
                  ))}
                </div>

                {/* 登出按鈕 */}
                <div className="absolute bottom-4 left-4 right-4">
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 touch-manipulation"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    登出
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* 工作記錄模態框 */}
      <MobileWorkLogModal
        open={showWorkLogModal}
        onClose={() => setShowWorkLogModal(false)}
        onSave={handleWorkLogSave}
        initialMode="start"
        isOvertimeMode={isOvertimeMode}
      />
    </div>
  )
} 