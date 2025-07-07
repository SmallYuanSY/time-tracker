"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { format, parseISO, differenceInMinutes } from "date-fns"

interface WorkLog {
  id: string
  startTime: string
  endTime: string | null
}

export default function TodayStatsCard() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState<string>("")
  const [isClient, setIsClient] = useState(false)

  // 確保在客戶端才初始化日期
  useEffect(() => {
    setIsClient(true)
    setToday(new Date().toISOString().split("T")[0])
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.user || !isClient || !today) {
        setLoading(false)
        return
      }

      try {
        const userId = (session.user as any).id
        const response = await fetch(`/api/worklog?userId=${userId}&date=${today}`)
        
        if (response.ok) {
          const data = await response.json()
          setLogs(data)
        }
      } catch (error) {
        console.error('獲取統計資料失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [session, today, isClient])

  // 計算統計資料
  const calculateStats = () => {
    if (logs.length === 0) {
      return { totalHours: 0, completedTasks: 0, overtimeHours: 0 }
    }

    let totalMinutes = 0
    let overtimeMinutes = 0
    const completedTasks = logs.filter(log => log.endTime).length

    logs.forEach(log => {
      if (log.endTime && log.startTime && 
          !isNaN(new Date(log.startTime).getTime()) && 
          !isNaN(new Date(log.endTime).getTime())) {
        const start = parseISO(log.startTime)
        const end = parseISO(log.endTime)
        let duration = differenceInMinutes(end, start)

        // 扣除午休時間 (12:30-13:30)
        const lunchStart = new Date(start)
        lunchStart.setHours(12, 30, 0, 0)
        const lunchEnd = new Date(start)
        lunchEnd.setHours(13, 30, 0, 0)

        // 檢查工作時間是否與午休時間重疊
        if (start < lunchEnd && end > lunchStart) {
          // 計算重疊時間
          const overlapStart = new Date(Math.max(start.getTime(), lunchStart.getTime()))
          const overlapEnd = new Date(Math.min(end.getTime(), lunchEnd.getTime()))
          const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart)
          
          // 扣除重疊的午休時間
          duration = Math.max(0, duration - overlapMinutes)
        }

        totalMinutes += duration

        // 計算加班時間（18:00 之後或 6:00 之前）- 也要扣除午休時間
        const startHour = start.getHours()
        const endHour = end.getHours()
        if (startHour >= 18 || startHour < 6 || endHour >= 18 || endHour < 6) {
          let overtimeDuration = differenceInMinutes(end, start)
          
          // 加班時間也要扣除午休時間
          if (start < lunchEnd && end > lunchStart) {
            const overlapStart = new Date(Math.max(start.getTime(), lunchStart.getTime()))
            const overlapEnd = new Date(Math.min(end.getTime(), lunchEnd.getTime()))
            const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart)
            overtimeDuration = Math.max(0, overtimeDuration - overlapMinutes)
          }
          
          // 加班時數計算：以30分鐘為單位計算
          if (overtimeDuration >= 30) {
            // 以30分鐘為單位，向下取整到最接近的30分鐘倍數
            const overtimeHalfHours = Math.floor(overtimeDuration / 30)
            overtimeMinutes += overtimeHalfHours * 30
          }
        }
      }
    })

    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      completedTasks,
      // 加班時數：已經按半小時單位計算，直接轉換
      overtimeHours: Math.round((overtimeMinutes / 60) * 2) / 2
    }
  }

  const stats = calculateStats()

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-400/30 backdrop-blur-lg shadow-xl h-full py-0">
        <CardContent className="flex items-center justify-center p-6 h-full" style={{ minHeight: '310px' }}>
          <div className="text-white/60">載入中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-400/30 backdrop-blur-lg shadow-xl h-full py-0">
      <CardContent className="p-6 h-full flex flex-col" style={{ minHeight: '310px' }}>
        <h3 className="text-white text-lg font-semibold text-center mb-4">📊 今日統計</h3>
        <div className="space-y-4 flex-1 flex flex-col justify-center">
        {/* 總工作時數 */}
        <div className="text-center p-3 bg-white/10 rounded-xl">
          <div className="text-2xl font-bold text-white">{stats.totalHours}h</div>
          <div className="text-white/70 text-sm">總工作時數</div>
        </div>

        {/* 完成任務和加班時數 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-white/10 rounded-xl">
            <div className="text-xl font-bold text-green-300">{stats.completedTasks}</div>
            <div className="text-white/70 text-xs">完成任務</div>
          </div>
          <div className="text-center p-3 bg-white/10 rounded-xl">
            <div className="text-xl font-bold text-orange-300">{stats.overtimeHours}h</div>
            <div className="text-white/70 text-xs">加班時數</div>
          </div>
        </div>

        {/* 進度條 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-white/70">
            <span>今日進度</span>
            <span>{Math.min(Math.round((stats.totalHours / 8) * 100), 100)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((stats.totalHours / 8) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  )
} 