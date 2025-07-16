'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Clock, Play, Square, Sunset, 
  Timer, MapPin, Zap
} from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface ClockRecord {
  id: string
  type: 'IN' | 'OUT'
  timestamp: string
  location?: string
}

interface MobileSmartPunchWidgetProps {
  onWorkLogSaved?: () => void
  onOpenWorkLogModal?: (isOvertime?: boolean) => void
}

export default function MobileSmartPunchWidget({
  onWorkLogSaved,
  onOpenWorkLogModal
}: MobileSmartPunchWidgetProps) {
  const { data: session } = useSession()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [todayRecords, setTodayRecords] = useState<ClockRecord[]>([])
  const [workStatus, setWorkStatus] = useState<'not_started' | 'working' | 'finished'>('not_started')

  // 初始化
  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 載入今日打卡記錄
  useEffect(() => {
    const loadTodayRecords = async () => {
      if (!session?.user) return

      try {
        const today = new Date().toISOString().split('T')[0]
        const userId = (session.user as any).id
        const response = await fetch(`/api/clock/history?date=${today}&userId=${userId}`)
        
        if (response.ok) {
          const records = await response.json()
          setTodayRecords(records)
          
          // 判斷當前工作狀態
          if (records.length === 0) {
            setWorkStatus('not_started')
          } else {
            const lastRecord = records[records.length - 1]
            if (lastRecord.type === 'IN') {
              setWorkStatus('working')
            } else {
              setWorkStatus('finished')
            }
          }
        }
      } catch (error) {
        console.error('載入打卡記錄失敗:', error)
      }
    }

    loadTodayRecords()
  }, [session])

  // 打卡操作
  const handlePunch = async (type: 'IN' | 'OUT') => {
    if (!session?.user || isLoading) return

    setIsLoading(true)
    
    try {
      const userId = (session.user as any).id
      const now = new Date()
      
      // 執行打卡
      const response = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
          timestamp: now.toISOString(),
          location: '手機版打卡'
        })
      })

      if (!response.ok) {
        throw new Error('打卡失敗')
      }

      // 如果是上班打卡，自動創建預設工作記錄
      if (type === 'IN') {
        try {
          const workLogResponse = await fetch('/api/worklog/quick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              projectCode: '00',
              projectName: '無案件編號',
              category: '其他',
              content: '手機打卡'
            })
          })

          if (!workLogResponse.ok) {
            console.warn('自動創建工作記錄失敗')
          }
        } catch (workLogError) {
          console.warn('自動創建工作記錄失敗:', workLogError)
          // 不阻斷打卡流程，只記錄警告
        }
      }

      // 重新載入記錄
      const today = new Date().toISOString().split('T')[0]
      const historyResponse = await fetch(`/api/clock/history?date=${today}&userId=${userId}`)
      
      if (historyResponse.ok) {
        const records = await historyResponse.json()
        setTodayRecords(records)
        
        // 更新工作狀態
        if (records.length === 0) {
          setWorkStatus('not_started')
        } else {
          const lastRecord = records[records.length - 1]
          if (lastRecord.type === 'IN') {
            setWorkStatus('working')
          } else {
            setWorkStatus('finished')
          }
        }
      }

      onWorkLogSaved?.()
    } catch (error) {
      console.error('打卡失敗:', error)
      alert('打卡失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  // 開始工作記錄
  const handleStartWorkLog = () => {
    onOpenWorkLogModal?.()
  }

  // 開始加班記錄
  const handleStartOvertime = () => {
    onOpenWorkLogModal?.(true)
  }

  // 計算今日工作時間
  const calculateTodayWorkTime = () => {
    if (!currentTime || todayRecords.length === 0) return '00:00'

    const today = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())
    let totalMinutes = 0

    // 只計算今天的記錄
    const todayFilteredRecords = todayRecords.filter(record => {
      const recordTime = new Date(record.timestamp)
      return recordTime >= today && recordTime <= todayEnd
    })

    // 配對 IN/OUT 記錄計算工作時間
    for (let i = 0; i < todayFilteredRecords.length; i += 2) {
      const inRecord = todayFilteredRecords[i]
      const outRecord = todayFilteredRecords[i + 1]

      if (inRecord && inRecord.type === 'IN') {
        const startTime = new Date(inRecord.timestamp)
        let endTime: Date

        if (outRecord && outRecord.type === 'OUT') {
          // 有配對的下班記錄
          endTime = new Date(outRecord.timestamp)
        } else if (workStatus === 'working') {
          // 還在工作中，使用當前時間
          endTime = currentTime
        } else {
          // 沒有配對的下班記錄且不在工作中，跳過
          continue
        }

        // 確保時間在今天範圍內
        if (startTime >= today && startTime <= todayEnd) {
          const workMinutes = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60))
          totalMinutes += workMinutes
        }
      }
    }

    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.floor(totalMinutes % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // 獲取狀態信息
  const getStatusInfo = () => {
    switch (workStatus) {
      case 'not_started':
        return {
          text: '尚未開始工作',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          icon: <Clock className="w-5 h-5" />
        }
      case 'working':
        return {
          text: '工作中',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          icon: <Zap className="w-5 h-5" />
        }
      case 'finished':
        return {
          text: '已下班',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          icon: <Sunset className="w-5 h-5" />
        }
    }
  }

  if (!mounted || !currentTime) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
        <div className="text-center text-white">
          <div className="animate-pulse">載入中...</div>
        </div>
      </Card>
    )
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="space-y-4">
      {/* 狀態顯示卡片 */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
        <div className="text-center text-white">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor} mb-3`}>
            {statusInfo.icon}
            <span className={`text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
          
          <div className="text-3xl font-bold font-mono mb-1">
            {calculateTodayWorkTime()}
          </div>
          <div className="text-sm text-white/70">
            今日工作時間
          </div>
        </div>
      </Card>

      {/* 打卡按鈕 */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
        <div className="space-y-3">
          {workStatus === 'not_started' ? (
            <Button
              onClick={() => handlePunch('IN')}
              disabled={isLoading}
              className="w-full h-16 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold text-lg touch-manipulation active:scale-95 transition-transform"
            >
              <Play className="w-6 h-6 mr-2" />
              上班打卡
            </Button>
          ) : workStatus === 'working' ? (
            <Button
              onClick={() => handlePunch('OUT')}
              disabled={isLoading}
              className="w-full h-16 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold text-lg touch-manipulation active:scale-95 transition-transform"
            >
              <Square className="w-6 h-6 mr-2" />
              下班打卡
            </Button>
          ) : (
            <Button
              onClick={() => handlePunch('IN')}
              disabled={isLoading}
              className="w-full h-16 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold text-lg touch-manipulation active:scale-95 transition-transform"
            >
              <Play className="w-6 h-6 mr-2" />
              重新上班
            </Button>
          )}
        </div>
      </Card>

      {/* 工作記錄按鈕 */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
        <h4 className="text-white font-medium mb-3 text-center">快速記錄</h4>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleStartWorkLog}
            variant="outline"
            className="h-14 bg-white/5 border-white/20 text-white hover:bg-white/10 touch-manipulation active:scale-95 transition-transform"
          >
            <Timer className="w-5 h-5 mb-1" />
            <div className="text-sm">工作記錄</div>
          </Button>

          <Button
            onClick={handleStartOvertime}
            variant="outline"
            className="h-14 bg-white/5 border-white/20 text-white hover:bg-white/10 touch-manipulation active:scale-95 transition-transform"
          >
            <Clock className="w-5 h-5 mb-1" />
            <div className="text-sm">加班記錄</div>
          </Button>
        </div>
      </Card>

      {/* 今日打卡記錄 */}
      {todayRecords.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            今日打卡記錄
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
                          {todayRecords.slice().reverse().map((record, index) => (
                <div key={record.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">
                    {record.type === 'IN' ? '🟢 上班打卡' : '🔴 下班打卡'}
                  </span>
                  <span className="text-white font-mono">
                    {record.timestamp && !isNaN(new Date(record.timestamp).getTime())
                      ? format(new Date(record.timestamp), 'HH:mm:ss')
                      : '--:--:--'
                    }
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* 載入指示器 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
              <span>處理中...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
} 