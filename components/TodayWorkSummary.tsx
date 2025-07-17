"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { format, parseISO, addDays, subDays } from "date-fns"
import { zhTW } from "date-fns/locale"
import { nowInTaiwan } from "@/lib/timezone"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { timeTrackerAPI } from "@/lib/api-manager"

import WorkLogModal from "@/app/worklog/WorkLogModal"
import { WorkLogDeleteConfirmDialog } from "@/components/ui/WorkLogDeleteConfirmDialog"
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog"

interface WorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  startTime: string
  endTime: string | null
  isOvertime?: boolean // 加班標記
}

interface TodayWorkSummaryProps {
  onRefresh?: () => void
  onRefreshWithClock?: () => void // 當刪除打卡記錄時的刷新函數
  refreshTrigger?: number // 外部觸發刷新的信號
}

export default function TodayWorkSummary({ onRefresh, onRefreshWithClock, refreshTrigger }: TodayWorkSummaryProps) {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null)
  const [copyingLog, setCopyingLog] = useState<WorkLog | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(nowInTaiwan())
  const [isClient, setIsClient] = useState(false)
  const [dateAnimation, setDateAnimation] = useState<'none' | 'slide-left' | 'slide-right'>('none')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isDateChanging, setIsDateChanging] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    log: WorkLog | null
    message: string
    clocksCount: number
  }>({
    open: false,
    log: null,
    message: '',
    clocksCount: 0
  })
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    log: WorkLog | null
  }>({
    open: false,
    log: null
  })


  // 確保在客戶端才初始化
  useEffect(() => {
    setIsClient(true)
  }, [])

  const fetchWorkLogs = useCallback(async (forceRefresh = false) => {
    if (!session?.user || !isClient) {
      setLoading(false)
      setIsInitialLoad(false)
      return
    }

    try {
      // 只在初始載入時顯示載入狀態，日期切換時不顯示
      if (isInitialLoad) {
        setLoading(true)
      }
      
      const userId = (session.user as any).id
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      
      // 如果強制刷新，先清除快取
      if (forceRefresh) {
        timeTrackerAPI.clearCache('worklog')
      }
      
      // 使用 API 管理器
      const data = await timeTrackerAPI.getWorkLogs({ 
        userId, 
        date: dateString 
      }, forceRefresh)
      
      // API 回應是分組格式，需要提取 logs
      if (Array.isArray(data) && data.length > 0 && data[0].logs) {
        // 找到當前用戶的記錄
        const userGroup = data.find((group: any) => group.user.id === userId)
        setLogs(userGroup ? userGroup.logs : [])
      } else if (Array.isArray(data)) {
        // 如果是直接的記錄陣列（向後兼容）
        setLogs(data)
      } else {
        setLogs([])
      }
    } catch (error) {
      console.error('獲取工作記錄失敗:', error)
    } finally {
      setLoading(false)
      setIsInitialLoad(false)
      setIsDateChanging(false)
    }
  }, [session?.user, isClient, selectedDate, isInitialLoad])

  useEffect(() => {
    if (isClient && session?.user) {
      fetchWorkLogs()
    }
  }, [session, selectedDate, isClient, fetchWorkLogs])

  // 監聽外部刷新觸發
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchWorkLogs(true) // 強制刷新
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
    // 清除快取並強制刷新
    await fetchWorkLogs(true)
    if (onRefresh) onRefresh()
    handleCloseModal()
  }

  const handleDelete = (log: WorkLog) => {
    setDeleteDialog({
      open: true,
      log
    })
  }

  // 處理確認初始刪除
  const handleConfirmInitialDelete = async () => {
    const log = deleteDialog.log
    if (!log) return

    setDeleteDialog({ open: false, log: null })
    setDeletingId(log.id)

    try {
      // 第一次嘗試刪除，檢查是否需要確認
      const response = await fetch(`/api/worklog?id=${log.id}`, {
        method: 'DELETE',
      })

      if (response.status === 409) {
        // 需要確認刪除打卡記錄
        const data = await response.json()
        setConfirmDialog({
          open: true,
          log,
          message: data.message,
          clocksCount: data.clocksCount
        })
        setDeletingId(null)
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || '刪除失敗')
      }

      // 清除相關快取
      timeTrackerAPI.clearCache('worklog')
      
      // 重新載入資料
      await fetchWorkLogs(true)
      
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('刪除工作記錄失敗:', error)
      alert(`刪除失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setDeletingId(null)
    }
  }

  // 處理確認刪除（包含打卡記錄）
  const handleConfirmDelete = async () => {
    if (!confirmDialog.log) return

    setDeletingId(confirmDialog.log.id)
    setConfirmDialog({ open: false, log: null, message: '', clocksCount: 0 })

    try {
      const response = await fetch(`/api/worklog?id=${confirmDialog.log.id}&confirmDeleteClocks=true`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || '刪除失敗')
      }

      // 清除相關快取
      timeTrackerAPI.clearCache('worklog')
      
      // 重新載入資料
      await fetchWorkLogs(true)
      
      // 當刪除打卡記錄時，需要同時刷新打卡 widget
      if (onRefreshWithClock) {
        onRefreshWithClock()
      } else if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('刪除工作記錄失敗:', error)
      alert(`刪除失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setDeletingId(null)
    }
  }

  const handleQuickAdd = () => {
    setEditingLog(null)
    setCopyingLog(null)
    setShowModal(true)
  }

  const goToPreviousDay = () => {
    setIsDateChanging(true)
    setDateAnimation('slide-right')
    setTimeout(() => {
      setSelectedDate(prev => subDays(prev, 1))
      setDateAnimation('none')
    }, 150)
  }

  const goToNextDay = () => {
    setIsDateChanging(true)
    setDateAnimation('slide-left')
    setTimeout(() => {
      setSelectedDate(prev => addDays(prev, 1))
      setDateAnimation('none')
    }, 150)
  }

  const goToToday = () => {
    setIsDateChanging(true)
    setDateAnimation('slide-left')
    setTimeout(() => {
      setSelectedDate(nowInTaiwan())
      setDateAnimation('none')
    }, 150)
  }



  const today = nowInTaiwan()
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  const isFutureDate = selectedDate > today

  const isOvertime = (startTime: string) => {
    if (!startTime) return false
    try {
      const t = parseISO(startTime)
      return t.getHours() >= 18 || t.getHours() < 6
    } catch (error) {
      console.warn('無效的時間格式:', startTime)
      return false
    }
  }

  // 只在初始載入且沒有日期切換動畫時顯示載入畫面
  if (loading && isInitialLoad && !isDateChanging) {
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
          <div className="relative bg-white/10 backdrop-blur rounded-xl p-3 overflow-visible">
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
              <div className="relative">
                <span 
                  className={`block text-white font-medium text-lg transition-all duration-300 ease-out ${
                    dateAnimation === 'slide-left' ? 'transform -translate-x-full opacity-0' :
                    dateAnimation === 'slide-right' ? 'transform translate-x-full opacity-0' :
                    'transform translate-x-0 opacity-100'
                  }`}
                >
                  {format(selectedDate, 'yyyy/MM/dd (E)', { locale: zhTW })}
                </span>
              </div>
              {isToday && (
                <span className={`text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-400/30 transition-all duration-300 ${
                  dateAnimation !== 'none' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
                }`}>
                  今天
                </span>
              )}
              {isFutureDate && (
                <span className={`text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full border border-orange-400/30 transition-all duration-300 ${
                  dateAnimation !== 'none' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
                }`}>
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

        {/* 內容載入指示器 */}
        {isDateChanging && !isInitialLoad && (
          <div className="flex justify-center items-center py-4">
            <div className="flex items-center gap-2 text-white/40">
              <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <span className="text-sm ml-2">載入中...</span>
            </div>
          </div>
        )}

        {!isDateChanging && logs.length === 0 ? (
          <div className={`text-center text-white/60 py-8 transition-all duration-300 ${
            dateAnimation !== 'none' ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
          }`}>
            {isToday ? '今日尚無工作記錄' : `${format(selectedDate, 'MM/dd', { locale: zhTW })} 尚無工作記錄`}
          </div>
        ) : !isDateChanging && logs.length > 0 ? (
          <div className={`space-y-3 transition-all duration-300 ${
            dateAnimation !== 'none' ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
          }`}>
            {logs.slice(-6).reverse().map((log) => {
              // 加入空值檢查
              if (!log.startTime) {
                console.warn('發現無效的工作記錄:', log)
                return null
              }

              // 安全的時間格式化
              const start = log.startTime && !isNaN(new Date(log.startTime).getTime()) 
                ? format(parseISO(log.startTime), "HH:mm") 
                : "--:--"
              const end = log.endTime && !isNaN(new Date(log.endTime).getTime())
                ? format(parseISO(log.endTime), "HH:mm") 
                : "進行中"
              
              // 根據工作狀態決定卡片顏色
              let bgColor = ""
              if (!log.endTime) {
                // 進行中的工作：藍色
                bgColor = "bg-blue-500/20 border-blue-400/30"
              } else if ((log as any).isOvertime) {
                // 已完成的加班工作：橘色
                bgColor = "bg-orange-500/20 border-orange-400/30"
              } else {
                // 已完成的一般工作：綠色
                bgColor = "bg-green-500/20 border-green-400/30"
              }

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
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-0 text-xs disabled:opacity-50"
                        onClick={() => handleDelete(log)}
                        disabled={deletingId === log.id}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {deletingId === log.id ? '刪除中' : '刪除'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : null}

        {!isDateChanging && logs.length > 6 && (
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
      <WorkLogModal
        open={showModal}
        initialMode={editingLog || copyingLog ? "full" : "quick"}
        onClose={handleCloseModal}
        onSave={handleSave}
        onNext={async () => {
          // 「儲存並新增」時也要刷新資料
          await fetchWorkLogs(true)
          if (onRefresh) onRefresh()
        }}
        editData={editingLog}
        copyData={copyingLog}
        showNext={!!copyingLog || (!editingLog && !copyingLog)} // 複製模式或新增模式下顯示「儲存並新增」
      />

      {/* 初始刪除確認對話框 */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        onConfirm={handleConfirmInitialDelete}
        description={deleteDialog.log ? `確定要刪除這筆工作記錄嗎？\n\n專案：${deleteDialog.log.projectName}\n內容：${deleteDialog.log.content}` : ''}
      />

      {/* 刪除打卡記錄確認對話框 */}
      <WorkLogDeleteConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={handleConfirmDelete}
        message={confirmDialog.message}
        clocksCount={confirmDialog.clocksCount}
      />
    </>
  )
} 