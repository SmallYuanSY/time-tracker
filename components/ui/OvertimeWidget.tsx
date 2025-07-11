"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSession } from 'next-auth/react'
import { format, parseISO } from 'date-fns'

interface Holiday {
  id: string
  date: string
  name: string
  type: string
  isHoliday: boolean
  description?: string | null
}

interface OvertimeWidgetProps {
  onStatusChange?: () => void
  onOpenWorkLogModal?: (isOvertime?: boolean) => void
  holidayInfo?: Holiday | null
}

export default function OvertimeWidget({ onStatusChange, onOpenWorkLogModal, holidayInfo }: OvertimeWidgetProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [isInOvertime, setIsInOvertime] = useState(false)
  const [currentOvertimeLog, setCurrentOvertimeLog] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadOvertimeStatus = async () => {
    if (!session?.user) return
    try {
      setError(null)
      const userId = (session.user as any).id
      
      // 查詢進行中的加班記錄（isOvertime: true 且 endTime 為 null）
      const res = await fetch(`/api/worklog?userId=${userId}&ongoing=true&overtime=true`)
      if (res.ok) {
        const data = await res.json()
        // API 返回按用戶分組的數據，需要提取工作記錄
        const flattenedLogs = data.flatMap((group: any) => group.logs || [])
        const ongoingOvertime = flattenedLogs.find((log: any) => !log.endTime && log.isOvertime)
        
        if (ongoingOvertime) {
          setIsInOvertime(true)
          setCurrentOvertimeLog(ongoingOvertime)
        } else {
          setIsInOvertime(false)
          setCurrentOvertimeLog(null)
        }
      } else {
        setError('載入加班狀態失敗')
      }
    } catch (err) {
      setError('載入加班狀態時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOvertimeStatus()
  }, [session])

  const startOvertime = () => {
    // 打開工作記錄模態視窗，並標記為加班模式
    if (onOpenWorkLogModal) {
      onOpenWorkLogModal(true)
    }
  }

  const endOvertime = async () => {
    if (!session?.user || !currentOvertimeLog) return
    
    setActionLoading(true)
    setError(null)
    setMessage(null)
    
    try {
      // 收集設備資訊
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        timestamp: new Date().toISOString()
      }

      const res = await fetch('/api/overtime/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: (session.user as any).id,
          deviceInfo
        }),
      })
      
      if (res.ok) {
        setMessage('加班結束成功')
        await loadOvertimeStatus()
        if (onStatusChange) onStatusChange()
        
        // 3秒後清除訊息
        setTimeout(() => setMessage(null), 3000)
      } else {
        const errorText = await res.text()
        setError(errorText || '結束加班失敗')
      }
    } catch (err) {
      setError('結束加班時發生錯誤')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-400/30 backdrop-blur-lg shadow-xl h-full py-0">
        <CardContent className="flex items-center justify-center p-6 h-full" style={{ minHeight: '310px' }}>
          <div className="text-white/60">載入加班狀態...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-400/30 backdrop-blur-lg shadow-xl h-full py-0">
      <CardContent className="flex flex-col justify-center items-center p-6 h-full gap-6" style={{ minHeight: '310px' }}>
        <h3 className="text-white text-2xl font-bold text-center">⏱ 加班模式</h3>
        
        {error && (
          <div className="w-full p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="text-red-200 text-sm text-center">{error}</div>
          </div>
        )}

        {message && (
          <div className="w-full p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="text-green-200 text-sm text-center">{message}</div>
          </div>
        )}
        
        <div className="text-center p-4 bg-white/10 rounded-xl w-full">
          <div className="text-white text-lg font-medium">
            {isInOvertime ? (
              <div className="space-y-2">
                <div>⌛ 加班中</div>
                {currentOvertimeLog && (
                  <div className="space-y-1">
                    <div className="text-sm text-white/80">
                      開始時間：{format(parseISO(currentOvertimeLog.startTime), 'HH:mm')}
                    </div>
                    <div className="text-sm text-white/80">
                      {currentOvertimeLog.projectCode} - {currentOvertimeLog.projectName}
                    </div>
                  </div>
                )}
              </div>
            ) : '尚未開始加班'}
          </div>
        </div>
        
        <div className="w-full">
          {isInOvertime ? (
            <Button 
              onClick={endOvertime} 
              disabled={actionLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {actionLoading ? '處理中...' : '結束加班'}
            </Button>
          ) : (
            <Button 
              onClick={startOvertime} 
              disabled={actionLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {actionLoading ? '處理中...' : '開始加班'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
