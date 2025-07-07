'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Calendar, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import MobileWorkLogModal from '../components/MobileWorkLogModal'

export default function MobileJournalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-600">
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
            <h1 className="text-white font-semibold text-lg">工作日誌</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <Filter className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="p-4 space-y-4">
        {/* 日期選擇器 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center justify-between text-white">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(prev => new Date(prev.getTime() - 24 * 60 * 60 * 1000))}
              className="text-white hover:bg-white/10"
            >
              ←
            </Button>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {format(currentDate, 'yyyy年MM月dd日', { locale: zhTW })}
              </div>
              <div className="text-sm opacity-80">
                {format(currentDate, 'EEEE', { locale: zhTW })}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(prev => new Date(prev.getTime() + 24 * 60 * 60 * 1000))}
              className="text-white hover:bg-white/10"
            >
              →
            </Button>
          </div>
        </Card>

        {/* 工作記錄列表 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center gap-2 mb-4 text-white">
            <Calendar className="w-5 h-5" />
            <h3 className="font-semibold">當日工作記錄</h3>
          </div>
          
          {/* 暫時顯示空狀態 */}
          <div className="text-center py-8 text-white/60">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>尚無工作記錄</p>
            <p className="text-sm mt-1">點擊上方「+」按鈕新增記錄</p>
          </div>
        </Card>

        {/* 統計摘要 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <h3 className="font-semibold mb-3 text-white">當日統計</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">0h</div>
              <div className="text-sm text-white/70">工作時間</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-sm text-white/70">任務數量</div>
            </div>
          </div>
        </Card>
      </main>

      {/* 新增工作記錄模態框 */}
      <MobileWorkLogModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false)
          // TODO: 重新載入工作記錄列表
        }}
        initialMode="full"
      />
    </div>
  )
} 