"use client"

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Calendar, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { calculateWorkTime } from '@/lib/utils'

interface WorkLog {
  id: string
  startTime: string
  endTime: string | null
  projectCode: string
  projectName: string
  category: string
  content: string
  isEdited?: boolean
  editReason?: string
  editedAt?: string
  editedBy?: string
  editIpAddress?: string
  isOvertime?: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

interface WorkLogsPageProps {
  selectedUser: string | null
  currentDate: Date
  searchTerm: string
}

interface WorkTimeSettings {
  normalWorkStart: string
  normalWorkEnd: string
  lunchBreakStart: string
  lunchBreakEnd: string
  overtimeStart: string
  minimumOvertimeUnit: number
}

export default function WorkLogsPage({ selectedUser, currentDate, searchTerm }: WorkLogsPageProps) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [workTimeSettings, setWorkTimeSettings] = useState<WorkTimeSettings>({
    normalWorkStart: '09:00',
    normalWorkEnd: '18:00',
    lunchBreakStart: '12:30',
    lunchBreakEnd: '13:30',
    overtimeStart: '18:00',
    minimumOvertimeUnit: 30
  })

  // 載入工作記錄
  const loadWorkLogs = useCallback(async () => {
    if (!selectedUser) return
    
    try {
      const startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
      const endDate = endOfWeek(currentDate, { weekStartsOn: 1 })

      const response = await fetch(`/api/admin/worklogs?start=${startDate.toISOString()}&end=${endDate.toISOString()}&userId=${selectedUser}`)
      if (response.ok) {
        const data = await response.json()
        setWorkLogs(data)
      }
    } catch (error) {
      console.error('載入工作記錄失敗:', error)
    }
  }, [currentDate, selectedUser])

  // 載入工作時間設定
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/work-time-settings')
        if (response.ok) {
          const data = await response.json()
          setWorkTimeSettings(data)
        }
      } catch (error) {
        console.error('載入工作時間設定失敗:', error)
      }
    }

    loadSettings()
  }, [])

  // 計算工作時間
  const calculateTotalTime = useCallback((startTime: string, endTime: string) => {
    if (!startTime || !endTime) return { normalMinutes: 0, overtimeMinutes: 0 }
    
    return calculateWorkTime(startTime, endTime, workTimeSettings)
  }, [workTimeSettings])

  // 處理工作日誌資料
  const processWorkLogs = useCallback((logs: any[]) => {
    return logs.map(log => {
      const { normalMinutes, overtimeMinutes } = calculateTotalTime(log.startTime, log.endTime)
      return {
        ...log,
        normalMinutes,
        overtimeMinutes
      }
    })
  }, [calculateTotalTime])

  // 在載入資料時使用新的計算邏輯
  useEffect(() => {
    if (workLogs.length > 0) {
      const processedLogs = processWorkLogs(workLogs)
      setWorkLogs(processedLogs)
    }
  }, [workTimeSettings]) // 當設定變更時重新計算

  useEffect(() => {
    loadWorkLogs()
  }, [loadWorkLogs])

  const calculateDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return '進行中'
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    return `${hours}小時 ${minutes}分鐘`
  }

  const groupWorkLogsByDate = () => {
    const grouped: { [key: string]: WorkLog[] } = {}
    workLogs.forEach(log => {
      const date = format(new Date(log.startTime), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(log)
    })
    return grouped
  }

  return (
    <div className="space-y-4">
      {(() => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
        const groupedLogs = groupWorkLogsByDate()

        return weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayName = format(day, 'EEEE', { locale: zhTW })
          const dayLogs = groupedLogs[dateKey]?.filter(log => 
            searchTerm === '' || 
            log.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.category.toLowerCase().includes(searchTerm.toLowerCase())
          ) || []
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey

          return (
            <div key={dateKey} className="border-l-4 border-purple-400/50 pl-4">
              <div className={`flex items-center justify-between mb-3 ${isToday ? 'text-yellow-300' : 'text-white'}`}>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">
                    {format(day, 'MM/dd')} ({dayName})
                    {isToday && <span className="ml-2 text-yellow-400">今天</span>}
                  </h3>
                  <span className="text-white/60 text-sm">
                    {dayLogs.length} 項工作
                  </span>
                </div>
              </div>

              {dayLogs.length === 0 ? (
                <div className="text-white/60 text-sm ml-8 py-2">
                  無工作紀錄
                </div>
              ) : (
                <div className="space-y-3">
                  {dayLogs.map(log => {
                    const startTime = format(parseISO(log.startTime), 'HH:mm')
                    const duration = calculateDuration(log.startTime, log.endTime)

                    return (
                      <Card key={log.id} className="bg-white/5 backdrop-blur border-white/10">
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-white/70 font-mono text-sm bg-blue-500/20 px-2 py-1 rounded">
                              {log.projectCode}
                            </span>
                            <span className="text-white font-medium">
                              {log.projectName}
                            </span>
                            <span className="text-white/80 font-mono text-sm bg-white/10 px-2 py-1 rounded">
                              {startTime} ~ {log.endTime ? format(parseISO(log.endTime), 'HH:mm') : '進行中'}
                            </span>
                            {log.isOvertime && (
                              <span className="text-orange-400 text-xs bg-orange-500/20 px-2 py-1 rounded-full font-semibold">
                                加班
                              </span>
                            )}
                            {log.isEdited && (
                              <HoverCard>
                                <HoverCardTrigger>
                                  <div className="text-orange-400 text-xs bg-orange-500/20 px-2 py-1 rounded-full cursor-help">
                                    已編輯
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 bg-black/90 border border-orange-500/30">
                                  <div className="space-y-2">
                                    <div className="text-orange-400 font-medium">編輯記錄</div>
                                    {log.editReason && (
                                      <div className="text-sm">
                                        <span className="text-white/60">原因：</span>
                                        <span className="text-white">{log.editReason}</span>
                                      </div>
                                    )}
                                    {log.editedAt && (
                                      <div className="text-sm">
                                        <span className="text-white/60">編輯時間：</span>
                                        <span className="text-white">{format(parseISO(log.editedAt), 'yyyy/MM/dd HH:mm:ss')}</span>
                                      </div>
                                    )}
                                    {log.editIpAddress && (
                                      <div className="text-sm">
                                        <span className="text-white/60">IP位址：</span>
                                        <span className="text-white">{log.editIpAddress}</span>
                                      </div>
                                    )}
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                          <p className="text-white/80 text-sm mb-2">
                            {log.content}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm bg-purple-500/20 px-2 py-1 rounded">
                              {log.category}
                            </span>
                            <div className="text-white/60 text-xs">
                              工作時數: {duration}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      })()}
    </div>
  )
} 