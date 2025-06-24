"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
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
}

export default function TodayWorkSummary({ onRefresh }: TodayWorkSummaryProps) {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null)
  const [copyingLog, setCopyingLog] = useState<WorkLog | null>(null)
  const [today, setToday] = useState<string>("")
  const [isClient, setIsClient] = useState(false)

  // 確保在客戶端才初始化日期
  useEffect(() => {
    setIsClient(true)
    setToday(new Date().toISOString().split("T")[0])
  }, [])

  const fetchWorkLogs = async () => {
    if (!session?.user || !isClient || !today) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const userId = (session.user as any).id
      const response = await fetch(`/api/worklog?userId=${userId}&date=${today}`)
      
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('獲取工作記錄失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isClient && today) {
      fetchWorkLogs()
    }
  }, [session, today, isClient])

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

  const isOvertime = (startTime: string) => {
    const t = parseISO(startTime)
    return t.getHours() >= 18 || t.getHours() < 6
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">📋 今日工作</h2>
        <div className="text-center text-white/60">載入中...</div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">📋 今日工作</h2>
          <span className="text-white/60 text-sm">{logs.length} 項工作</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            今日尚無工作記錄
          </div>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 6).map((log) => {
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
              href="/worklog" 
              className="text-blue-300 hover:text-blue-200 text-sm underline"
            >
              查看全部 {logs.length} 項工作 →
            </a>
          </div>
        )}
      </div>

      {/* 編輯/複製工作紀錄彈窗 */}
      {showModal && (
        <WorkLogModal
          initialMode="full"
          onClose={handleCloseModal}
          onSave={handleSave}
          editData={editingLog}
          copyData={copyingLog}
          showNext={!!copyingLog} // 複製模式下顯示「儲存並新增」
        />
      )}
    </>
  )
} 