"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { format, parseISO, addDays, subDays } from "date-fns"
import { zhTW } from "date-fns/locale"
import { nowInTaiwan } from "@/lib/timezone"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import WorkLogModal from "@/app/worklog/WorkLogModal"

interface WorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  startTime: string
  endTime: string | null
}

interface TodayWorkSummaryProps {
  onRefresh?: () => void
  refreshTrigger?: number // 外部觸發刷新的信號
}

export default function TodayWorkSummary({ onRefresh, refreshTrigger }: TodayWorkSummaryProps) {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null)
  const [copyingLog, setCopyingLog] = useState<WorkLog | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(nowInTaiwan())
  const [isClient, setIsClient] = useState(false)

  // 確保在客戶端才初始化
  useEffect(() => {
    setIsClient(true)
  }, [])

  const fetchWorkLogs = useCallback(async () => {
    if (!session?.user || !isClient) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const userId = (session.user as any).id
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/worklog?userId=${userId}&date=${dateString}`)
      
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('獲取工作記錄失敗:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user, isClient, selectedDate])

  useEffect(() => {
    if (isClient && session?.user) {
      fetchWorkLogs()
    }
  }, [session, selectedDate, isClient, fetchWorkLogs])

  // 監聽外部刷新觸發
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchWorkLogs()
    }
  }, [refreshTrigger, fetchWorkLogs])

  const handleEdit = (log: WorkLog) => {
    setEditingLog(log)
    setShowModal(true)
  }

  const handleCopy = (log: WorkLog) => {
    setCopyingLog(log)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingLog(null)
    setCopyingLog(null)
  }

  const handleSave = async () => {
    await fetchWorkLogs()
    if (onRefresh) onRefresh()
    handleCloseModal()
  }

  const handleQuickAdd = () => {
    setEditingLog(null)
    setCopyingLog(null)
    setShowModal(true)
  }

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1))
  }

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1))
  }

  const goToToday = () => {
    setSelectedDate(nowInTaiwan())
  }

  const today = nowInTaiwan()
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  const isFutureDate = selectedDate > today

  const isOvertime = (startTime: string) => {
    const t = parseISO(startTime)
    return t.getHours() >= 18 || t.getHours() < 6
  }

  if (loading) {
    return (
      <div>
        <div className="text-center text-white/60">載入中...</div>
      </div>
    )
  }

  return (
    <>
      <div>
        {/* 日期導航和標題 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-white">📋 工作記錄</h2>
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">{logs.length} 項工作</span>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                onClick={handleQuickAdd}
              >
                ➕ 快速紀錄
              </Button>
            </div>
          </div>
          
          {/* 日期選擇器 */}
          <div className="relative bg-white/10 backdrop-blur rounded-xl p-3">
            {/* 左側導航按鈕 */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousDay}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 中間日期顯示 - 絕對居中 */}
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4 text-white/60" />
              <span className="text-white font-medium text-lg">
                {format(selectedDate, 'yyyy/MM/dd (E)', { locale: zhTW })}
              </span>
              {isToday && (
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-400/30">
                  今天
                </span>
              )}
              {isFutureDate && (
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full border border-orange-400/30">
                  未來
                </span>
              )}
            </div>
            
            {/* 右側導航按鈕 */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextDay}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {!isToday && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToToday}
                  className="text-white/80 hover:text-white hover:bg-white/20 text-xs"
                >
                  回到今天
                </Button>
              )}
            </div>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            {isToday ? '今日尚無工作記錄' : `${format(selectedDate, 'MM/dd', { locale: zhTW })} 尚無工作記錄`}
          </div>
        ) : (
          <div className="space-y-3">
            {logs.slice(-6).map((log) => {
              const start = format(parseISO(log.startTime), "HH:mm")
              const end = log.endTime ? format(parseISO(log.endTime), "HH:mm") : "進行中"
              const bgColor = isOvertime(log.startTime) 
                ? "bg-orange-500/20 border-orange-400/30" 
                : "bg-blue-500/20 border-blue-400/30"

              return (
                <Card key={log.id} className={`${bgColor} backdrop-blur p-4 transition-all hover:bg-opacity-80`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* 第一行：案件編號 案件名稱 時間 分類 */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-white/70 font-mono bg-white/10 px-2 py-1 rounded">
                          {log.projectCode}
                        </span>
                        <h3 className="text-white font-medium truncate flex-1">{log.projectName}</h3>
                        <span className="text-xs text-white/60 whitespace-nowrap">{start} - {end}</span>
                        <span className="inline-block px-2 py-1 rounded text-xs bg-white/20 text-white/80 whitespace-nowrap">
                          {log.category}
                        </span>
                      </div>
                      
                      {/* 第二行：內容 */}
                      <p className="text-white/70 text-sm">{log.content}</p>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs"
                        onClick={() => handleCopy(log)}
                      >
                        📋 複製
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs"
                        onClick={() => handleEdit(log)}
                      >
                        ✏️ 編輯
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {logs.length > 6 && (
          <div className="text-center mt-4">
            <a 
              href="/journal" 
              className="text-blue-300 hover:text-blue-200 text-sm underline"
            >
              查看全部 {logs.length} 項工作 →
            </a>
          </div>
        )}
      </div>

      {/* 編輯/複製/新增工作紀錄彈窗 */}
      {showModal && (
        <WorkLogModal
          initialMode={editingLog || copyingLog ? "full" : "quick"}
          onClose={handleCloseModal}
          onSave={handleSave}
          onNext={async () => {
            // 「儲存並新增」時也要刷新資料
            await fetchWorkLogs()
            if (onRefresh) onRefresh()
          }}
          editData={editingLog}
          copyData={copyingLog}
          showNext={!!copyingLog || (!editingLog && !copyingLog)} // 複製模式或新增模式下顯示「儲存並新增」
        />
      )}
    </>
  )
} 