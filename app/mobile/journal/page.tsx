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

interface WorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  startTime: string
  endTime: string | null
}

interface WorkTimeStats {
  totalHours: number
  totalMinutes: number
}

export default function MobileJournalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [workTimeStats, setWorkTimeStats] = useState<WorkTimeStats>({ totalHours: 0, totalMinutes: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // 載入工作記錄
  useEffect(() => {
    if (status === 'authenticated') {
      loadWorkLogs()
    }
  }, [status, currentDate])

  const loadWorkLogs = async () => {
    try {
      setLoading(true)
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/worklog?date=${dateStr}`)
      if (response.ok) {
        const data = await response.json()
        setWorkLogs(data)
        calculateWorkTimeStats(data)
      }
    } catch (error) {
      console.error('載入工作記錄失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateWorkTimeStats = (logs: WorkLog[]) => {
    let totalMinutes = 0
    logs.forEach(log => {
      if (log.endTime) {
        const start = new Date(log.startTime)
        const end = new Date(log.endTime)
        const duration = (end.getTime() - start.getTime()) / (1000 * 60)
        totalMinutes += duration
      }
    })
    
    const hours = Math.floor(totalMinutes / 60)
    setWorkTimeStats({
      totalHours: hours,
      totalMinutes: Math.round(totalMinutes % 60)
    })
  }

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const duration = (end.getTime() - start.getTime()) / (1000 * 60)
    const hours = Math.floor(duration / 60)
    const minutes = Math.round(duration % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getCategoryName = (categoryId: string) => {
    const categories: Record<string, string> = {
      'development': '程式開發',
      'design': '設計規劃',
      'meeting': '會議討論',
      'testing': '測試除錯',
      'documentation': '文件撰寫',
      'maintenance': '系統維護',
      'training': '學習訓練',
      'other': '其他工作',
    }
    return categories[categoryId] || categoryId
  }

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

        {/* 統計摘要 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <h3 className="font-semibold mb-3 text-white">當日統計</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{workTimeStats.totalHours}h</div>
              <div className="text-sm text-white/70">工作時間</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{workLogs.length}</div>
              <div className="text-sm text-white/70">任務數量</div>
            </div>
          </div>
        </Card>

        {/* 工作記錄列表 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center gap-2 mb-4 text-white">
            <Calendar className="w-5 h-5" />
            <h3 className="font-semibold">當日工作記錄</h3>
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-white/60">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-2"></div>
              <p>載入工作記錄中...</p>
            </div>
          ) : workLogs.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>尚無工作記錄</p>
              <p className="text-sm mt-1">點擊上方「+」按鈕新增記錄</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white/5 rounded-lg p-3 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm">{log.projectName}</h4>
                      <p className="text-white/60 text-xs">{log.projectCode}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-xs">
                        {format(new Date(log.startTime), 'HH:mm')}
                        {log.endTime && ` - ${format(new Date(log.endTime), 'HH:mm')}`}
                      </div>
                      {log.endTime && (
                        <div className="text-white/60 text-xs">
                          {calculateDuration(log.startTime, log.endTime)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-white/70 text-sm mb-2">
                    {log.content}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-white/10 rounded text-white/60 text-xs">
                      {getCategoryName(log.category)}
                    </span>
                    {!log.endTime && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-200 rounded text-xs">
                        進行中
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* 新增工作記錄模態框 */}
      <MobileWorkLogModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false)
          loadWorkLogs() // 重新載入工作記錄列表
        }}
        initialMode="full"
      />
    </div>
  )
} 