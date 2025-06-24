"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { useSession } from "next-auth/react"

interface WorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  startTime: string // ISO string
  endTime: string | null
}

interface WorkLogListProps {
  onRefresh?: (refreshFn: () => Promise<void>) => void
  onEdit?: (log: WorkLog) => void
}

export default function WorkLogList({ onRefresh, onEdit }: WorkLogListProps) {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [today, setToday] = useState<string>("")
  const [isClient, setIsClient] = useState(false)

  // 確保在客戶端才初始化日期
  useEffect(() => {
    setIsClient(true)
    setToday(new Date().toISOString().split("T")[0])
  }, [])

  useEffect(() => {
    if (!session?.user || !isClient || !today) {
      setLoading(false)
      return
    }

    const fetchWorkLogs = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const userId = (session.user as any).id
        const response = await fetch(`/api/worklog?userId=${userId}&date=${today}`)
        
        if (!response.ok) {
          throw new Error('獲取工作記錄失敗')
        }
        
        const data = await response.json()
        setLogs(data)
      } catch (error) {
        console.error('獲取工作記錄失敗:', error)
        setError(error instanceof Error ? error.message : '獲取工作記錄失敗')
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchWorkLogs()
  }, [session, today, isClient])

  // 將 refreshLogs 函數傳遞給父元件
  useEffect(() => {
    if (onRefresh) {
      onRefresh(refreshLogs)
    }
  }, [onRefresh])

  const isOvertime = (startTime: string) => {
    const t = parseISO(startTime)
    return t.getHours() >= 18 || t.getHours() < 6
  }

  const refreshLogs = async () => {
    if (!session?.user || !today) return

    try {
      setLoading(true)
      setError(null)
      
      const userId = (session.user as any).id
      const response = await fetch(`/api/worklog?userId=${userId}&date=${today}`)
      
      if (!response.ok) {
        throw new Error('獲取工作記錄失敗')
      }
      
      const data = await response.json()
      setLogs(data)
    } catch (error) {
      console.error('獲取工作記錄失敗:', error)
      setError(error instanceof Error ? error.message : '獲取工作記錄失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (log: WorkLog) => {
    // 複製工作記錄的內容到剪貼板
    const copyText = `案件編號: ${log.projectCode}
案件名稱: ${log.projectName}
分類: ${log.category}
工作內容: ${log.content}
開始時間: ${format(parseISO(log.startTime), "HH:mm")}
結束時間: ${log.endTime ? format(parseISO(log.endTime), "HH:mm") : "現在"}`

    navigator.clipboard.writeText(copyText).then(() => {
      setMessage('工作記錄已複製到剪貼板')
      setTimeout(() => setMessage(null), 3000) // 3秒後清除訊息
    }).catch(err => {
      console.error('複製失敗:', err)
      setError('複製失敗')
      setTimeout(() => setError(null), 3000)
    })
  }

  const handleEdit = (log: WorkLog) => {
    if (onEdit) {
      onEdit(log)
    }
  }

  const sortedLogs = [...logs].sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/60">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">錯誤：{error}</div>
      </div>
    )
  }

  if (message) {
    return (
      <div className="space-y-4">
        <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-3 text-green-100 text-center">
          {message}
        </div>
        {/* 顯示列表內容 */}
        {sortedLogs.map((log) => {
          const start = format(parseISO(log.startTime), "HH:mm")
          const end = log.endTime ? format(parseISO(log.endTime), "HH:mm") : "現在"
          const bgColor = isOvertime(log.startTime) ? "bg-orange-100/10 border-orange-300/20" : "bg-emerald-100/10 border-emerald-300/20"

          return (
            <Card key={log.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${bgColor}`}>
              <div className="flex-1 grid grid-cols-4 gap-2">
                <div className="px-2 py-1 rounded bg-white/20 text-white text-center">{log.projectCode}</div>
                <div className="px-2 py-1 rounded bg-white/20 text-white text-center">{log.projectName}</div>
                <div className="px-2 py-1 rounded bg-white/20 text-white text-center">{log.category}</div>
                <div className="px-2 py-1 rounded bg-white/20 text-white text-center">{start} - {end}</div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="bg-yellow-100 text-black px-3 py-1 text-sm rounded hover:bg-yellow-200"
                  onClick={() => handleCopy(log)}
                >
                  📋 複製
                </Button>
                <Button 
                  variant="destructive" 
                  className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => handleEdit(log)}
                >
                  ✏️ 編輯
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/60">今日尚無工作記錄</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedLogs.map((log) => {
        const start = format(parseISO(log.startTime), "HH:mm")
        const end = log.endTime ? format(parseISO(log.endTime), "HH:mm") : "現在"
        const bgColor = isOvertime(log.startTime) ? "bg-orange-100/10 border-orange-300/20" : "bg-emerald-100/10 border-emerald-300/20"

        return (
          <Card key={log.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${bgColor}`}>
            <div className="flex-1 grid grid-cols-4 gap-2">
              <div className="px-2 py-1 rounded bg-white/20 text-white text-center">{log.projectCode}</div>
              <div className="px-2 py-1 rounded bg-white/20 text-white text-center">{log.projectName}</div>
              <div className="px-2 py-1 rounded bg-white/20 text-white text-center">{log.category}</div>
              <div className="px-2 py-1 rounded bg-white/20 text-white text-center">{start} - {end}</div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                className="bg-yellow-100 text-black px-3 py-1 text-sm rounded hover:bg-yellow-200"
                onClick={() => handleCopy(log)}
              >
                📋 複製
              </Button>
              <Button 
                variant="destructive" 
                className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => handleEdit(log)}
              >
                ✏️ 編輯
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
} 