// app/worklog/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import WorkLogModal from './WorkLogModal'
import WorkLogList from '@/components/worklog/WorkLogList'
import DashboardLayout from '@/components/layouts/DashboardLayout'

interface WorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  startTime: string
  endTime: string | null
}

export default function WorkLogPage() {
  const { data: session, status } = useSession()
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null)
  const refreshLogsRef = useRef<(() => Promise<void>) | null>(null)
  const [today, setToday] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [stats, setStats] = useState({ totalHours: 0, completed: 0, overtimeHours: 0 })

  // 確保在客戶端才初始化日期
  useEffect(() => {
    setIsClient(true)
    setToday(new Date())
  }, [])

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login'
    }
    // 檢查用戶是否在資料庫中存在
    if (status === 'authenticated' && session?.user) {
      const checkUserExists = async () => {
        try {
          const response = await fetch('/api/users')
          if (!response.ok) {
            console.error('用戶不存在，重新導向到登入頁面')
            window.location.href = '/login'
          }
        } catch (error) {
          console.error('檢查用戶狀態失敗:', error)
          window.location.href = '/login'
        }
      }
      checkUserExists()
    }
  }, [status, session])

  const handleAddWork = () => {
    setShowModal(true)
  }

  const handleModalSave = async () => {
    setShowModal(false)
    // 新增工作紀錄後刷新列表
    if (refreshLogsRef.current) {
      await refreshLogsRef.current()
    }
  }

  const handleRefresh = async () => {
    if (refreshLogsRef.current) {
      await refreshLogsRef.current()
    }
  }

  const handleEditLog = (log: WorkLog) => {
    setEditingLog(log)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingLog(null)
  }

  const calculateStats = (logs: WorkLog[]) => {
    let totalMinutes = 0
    let overtimeMinutes = 0
    logs.forEach((log) => {
      if (!log.endTime) return
      const start = new Date(log.startTime)
      const end = new Date(log.endTime)
      const minutes = (end.getTime() - start.getTime()) / 60000
      totalMinutes += minutes
      if (start.getHours() >= 18 || start.getHours() < 6) {
        overtimeMinutes += minutes
      }
    })
    setStats({
      totalHours: +(totalMinutes / 60).toFixed(1),
      completed: logs.length,
      overtimeHours: +(overtimeMinutes / 60).toFixed(1),
    })
  }

  if (!isClient || !today) {
    return (
      <DashboardLayout>
        <div className="min-h-screen p-6">
          <div className="text-white/60">載入中...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 space-y-6">
        {/* 頁面標題區域 */}
        <Card className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  📋 工作日誌
                </h1>
                <p className="text-white/70 mt-1">
                  {format(today, 'yyyy年MM月dd日 EEEE', { locale: zhTW })}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  🔄 重新整理
                </Button>
                <Button
                  onClick={handleAddWork}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg"
                >
                  ➕ 新增工作紀錄
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 統計資訊卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-400/30 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-300">{stats.totalHours}</div>
              <div className="text-blue-100 text-sm">總工作時數</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-400/30 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-300">{stats.completed}</div>
              <div className="text-green-100 text-sm">完成項目</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-400/30 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-300">{stats.overtimeHours}</div>
              <div className="text-orange-100 text-sm">加班時數</div>
            </CardContent>
          </Card>
        </div>

        {/* 工作紀錄列表 */}
        <Card className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">今日工作記錄</h2>
          </CardHeader>
          <CardContent>
            <WorkLogList
              onRefresh={(refreshFn: () => Promise<void>) => {
                refreshLogsRef.current = refreshFn
              }}
              onEdit={handleEditLog}
              onLogsLoaded={calculateStats}
            />
          </CardContent>
        </Card>

        {/* 新增/編輯工作紀錄彈窗 */}
        {showModal && (
          <WorkLogModal
            initialMode="full"
            onClose={handleCloseModal}
            onSave={handleModalSave}
            showNext={!editingLog} // 編輯模式下不顯示「儲存並新增」按鈕
            onNext={() => {
              // 新增並繼續時也要刷新列表
              if (refreshLogsRef.current) {
                refreshLogsRef.current()
              }
            }}
            editData={editingLog} // 傳遞編輯資料
          />
        )}
      </div>
    </DashboardLayout>
  )
}
