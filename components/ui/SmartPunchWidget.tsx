"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import PunchCardWidget from '@/components/ui/PunchCardWidget'
import OvertimeWidget from '@/components/ui/OvertimeWidget'
import { TrendingUp } from 'lucide-react'
import { calculateWorkTime } from '@/lib/utils'

interface SmartPunchWidgetProps {
  onWorkLogSaved?: () => void
  onOpenWorkLogModal?: (isOvertime?: boolean) => void
}

// 新增假日型別定義
interface Holiday {
  id: string
  date: string
  name: string
  type: string
  isHoliday: boolean
  description?: string | null
}

interface WorkTimeSettings {
  normalWorkStart: string
  normalWorkEnd: string
  lunchBreakStart: string
  lunchBreakEnd: string
  overtimeStart: string
  minimumOvertimeUnit: number
}

export default function SmartPunchWidget({ onWorkLogSaved, onOpenWorkLogModal }: SmartPunchWidgetProps) {
  const { data: session, status } = useSession()
  const [shouldShowOvertime, setShouldShowOvertime] = useState(false)
  const [clockedIn, setClockedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showingWidget, setShowingWidget] = useState<'punch' | 'overtime'>('punch')
  const [holidayInfo, setHolidayInfo] = useState<Holiday | null>(null)
  const [workTimeSettings, setWorkTimeSettings] = useState<WorkTimeSettings>({
    normalWorkStart: '09:00',
    normalWorkEnd: '18:00',
    lunchBreakStart: '12:30',
    lunchBreakEnd: '13:30',
    overtimeStart: '18:00',
    minimumOvertimeUnit: 30
  })

  // 載入工作時間設定
  const loadWorkTimeSettings = async () => {
    try {
      const response = await fetch('/api/work-time-settings')
      if (!response.ok) throw new Error('無法載入工作時間設定')
      const data = await response.json()
      setWorkTimeSettings(data)
    } catch (error) {
      console.error('載入工作時間設定失敗:', error)
      // 使用預設設定
      setWorkTimeSettings({
        normalWorkStart: '09:00',
        normalWorkEnd: '18:00',
        lunchBreakStart: '12:30',
        lunchBreakEnd: '13:30',
        overtimeStart: '18:00',
        minimumOvertimeUnit: 30
      })
    }
  }

  // 計算工作時間
  const calculateTotalTime = useCallback((startTime: string, endTime: string) => {
    const result = calculateWorkTime(startTime, endTime, workTimeSettings)
    return {
      normalHours: Math.floor(result.normalMinutes / 60),
      normalMinutes: result.normalMinutes % 60,
      overtimeHours: Math.floor(result.overtimeMinutes / 60),
      overtimeMinutes: result.overtimeMinutes % 60
    }
  }, [workTimeSettings])

  // 計算工作時長（扣除午休時間和早於9點的時間）
  const calculateWorkHours = (clockRecords: any[]) => {
    if (!clockRecords || clockRecords.length === 0) return 0

    const sortedRecords = [...clockRecords].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    let totalMinutes = 0
    let lastInTime: Date | null = null

    for (const record of sortedRecords) {
      const time = new Date(record.timestamp)
      
      if (record.type === 'IN') {
        // 如果早於9點打卡，則以9點為計算起點
        const adjustedTime = new Date(time)
        if (time.getHours() < 9) {
          adjustedTime.setHours(9, 0, 0, 0)
        }
        lastInTime = adjustedTime
      } else if (record.type === 'OUT' && lastInTime) {
        const outTime = new Date(record.timestamp)
        let duration = outTime.getTime() - lastInTime.getTime()
        
        // 檢查是否跨越午休時間（12:30-13:30）
        const lunchStart = new Date(lastInTime)
        lunchStart.setHours(12, 30, 0)
        const lunchEnd = new Date(lastInTime)
        lunchEnd.setHours(13, 30, 0)
        
        // 如果工作時段跨越午休時間，扣除午休時間
        if (lastInTime <= lunchStart && outTime >= lunchEnd) {
          duration -= 60 * 60 * 1000 // 扣除一小時（毫秒）
        }
        
        totalMinutes += duration / (60 * 1000)
        lastInTime = null
      }
    }

    return totalMinutes / 60 // 轉換為小時
  }

  // 檢查當前時間是否為加班時段
  const isOvertimePeriod = () => {
    const now = new Date()
    const hour = now.getHours()
    
    // 加班時段：18:00後
    return hour >= 18
  }

  // 分析打卡記錄，判斷是否已完成正常工作（有正確配對的上下班記錄）
  const analyzeClockStatus = (clockRecords: any[]) => {
    if (!clockRecords || clockRecords.length === 0) {
      return false // 沒有打卡記錄，未完成正常工作
    }

    // 按時間排序打卡記錄
    const sortedRecords = [...clockRecords].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // 找第一次上班打卡
    const firstIn = sortedRecords.find(r => r.type === 'IN')
    if (!firstIn) {
      return false // 沒有上班記錄，未完成正常工作
    }

    // 找第一次下班打卡（在第一次上班之後）
    const firstInTime = new Date(firstIn.timestamp)
    const firstOut = sortedRecords.find(r => 
      r.type === 'OUT' && new Date(r.timestamp) > firstInTime
    )

    // 只有找到配對的第一次下班記錄，才算完成正常工作
    return !!firstOut
  }

  // 載入假日資訊
  const loadHolidayInfo = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const response = await fetch(`/api/admin/holidays/${today}`)
      if (response.ok) {
        const data = await response.json()
        setHolidayInfo(data.holiday)
      }
    } catch (error) {
      console.error('載入假日資訊失敗:', error)
    }
  }

  // 載入用戶打卡狀態
  const loadClockStatus = async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    try {
      const userId = (session.user as any).id
      
      // 同時檢查打卡狀態和進行中的加班記錄
      const [clockResponse, overtimeResponse] = await Promise.all([
        fetch(`/api/clock?userId=${userId}`),
        fetch(`/api/worklog?userId=${userId}&ongoing=true&overtime=true`)
      ])
      
      if (clockResponse.ok && overtimeResponse.ok) {
        const clockData = await clockResponse.json()
        const overtimeData = await overtimeResponse.json()
        
        setClockedIn(clockData.clockedIn)
        
        // API 返回按用戶分組的數據，需要提取工作記錄
        const flattenedOvertimeLogs = overtimeData.flatMap((group: any) => group.logs || [])
        const hasOngoingOvertime = flattenedOvertimeLogs.some((log: any) => !log.endTime && log.isOvertime)
        
        // 決定顯示模式的邏輯：
        let newShouldShowOvertime = false
        
        // 調試輸出
        console.log('SmartPunchWidget Debug:', {
          clockedIn,
          hasOngoingOvertime,
          flattenedOvertimeLogs: flattenedOvertimeLogs.length,
          overtimeData: overtimeData
        })
        
        if (hasOngoingOvertime) {
          // 1. 如果有進行中的加班記錄，顯示加班模組
          newShouldShowOvertime = true
        } else if (clockedIn) {
          // 2. 如果目前是上班狀態，一律顯示正常打卡模組
          newShouldShowOvertime = false
        } else {
          // 3. 如果目前是下班狀態且沒有進行中的加班
          const hasCompletedNormalWork = analyzeClockStatus(clockData.todayClocks || [])
          
          // 只有在已經完成正常下班打卡的情況下，才考慮切換到加班模組
          if (hasCompletedNormalWork && isOvertimePeriod()) {
            newShouldShowOvertime = true
          } else {
            newShouldShowOvertime = false
          }
        }
        
        // 如果狀態需要切換，觸發動畫
        if (newShouldShowOvertime !== shouldShowOvertime && !loading) {
          await animateTransition(newShouldShowOvertime)
        } else {
          setShouldShowOvertime(newShouldShowOvertime)
          setShowingWidget(newShouldShowOvertime ? 'overtime' : 'punch')
        }
      }
    } catch (error) {
      console.error('載入打卡狀態失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 動畫切換函數
  const animateTransition = async (toOvertime: boolean) => {
    setIsTransitioning(true)
    
    // 先淡出當前元件 (500ms 動畫的一半)
    await new Promise(resolve => setTimeout(resolve, 250))
    
    // 切換元件
    setShouldShowOvertime(toOvertime)
    setShowingWidget(toOvertime ? 'overtime' : 'punch')
    
    // 淡入新元件 (剩餘的 250ms)
    await new Promise(resolve => setTimeout(resolve, 250))
    setIsTransitioning(false)
  }

  useEffect(() => {
    if (status === 'authenticated') {
      loadHolidayInfo()
      loadClockStatus()
      loadWorkTimeSettings() // 載入工作時間設定
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [session, status]) // eslint-disable-line react-hooks/exhaustive-deps

  // 每分鐘檢查一次時間，確保在時間切換點正確切換模組
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === 'authenticated') {
        loadClockStatus()
      }
    }, 60000) // 每分鐘檢查一次

    return () => clearInterval(interval)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // 當加班狀態變化時重新載入 - 包含動畫觸發
  const handleStatusChange = async () => {
    // 立即重新載入狀態，可能觸發動畫
    await loadClockStatus()
    if (onWorkLogSaved) {
      onWorkLogSaved()
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-400/30 backdrop-blur-lg shadow-xl h-full rounded-2xl">
        <div className="flex items-center justify-center p-8 h-full min-h-[200px]">
          <div className="text-white/60">載入中...</div>
        </div>
      </div>
    )
  }

  // 根據假日類型設定背景樣式
  let bgStyle = "bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-400/30"
  if (holidayInfo) {
    if (holidayInfo.isHoliday) {
      if (holidayInfo.type === 'WEEKEND') {
        bgStyle = "bg-gradient-to-br from-purple-500/20 to-indigo-600/20 border-purple-400/30" // 週末
      } else {
        bgStyle = "bg-gradient-to-br from-red-500/20 to-pink-600/20 border-red-400/30" // 國定假日
      }
    } else {
      bgStyle = "bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border-yellow-400/30" // 補班日
    }
  }

  return (
    <div className={`transition-all duration-500 ease-in-out transform ${
      isTransitioning 
        ? 'opacity-0 scale-95 rotate-1' 
        : 'opacity-100 scale-100 rotate-0'
    }`}>
      {holidayInfo && (
        <div className={`mb-4 p-4 rounded-lg ${bgStyle}`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-white" />
            <span className="text-white font-medium">{holidayInfo.name}</span>
          </div>
          {holidayInfo.description && (
            <p className="text-white/80 text-sm mt-2">{holidayInfo.description}</p>
          )}
        </div>
      )}
      {showingWidget === 'overtime' ? (
        <OvertimeWidget 
          onStatusChange={handleStatusChange} 
          onOpenWorkLogModal={onOpenWorkLogModal}
          holidayInfo={holidayInfo}
        />
      ) : (
        <PunchCardWidget 
          onWorkLogSaved={handleStatusChange}
          holidayInfo={holidayInfo}
        />
      )}
    </div>
  )
} 