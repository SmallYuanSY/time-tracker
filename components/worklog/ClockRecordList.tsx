"use client"

import { useState, useEffect } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react'

interface ClockRecord {
  id: string
  type: 'IN' | 'OUT'
  timestamp: string
}

interface ClockRecordListProps {
  userId: string
  currentWeek: Date
}

export default function ClockRecordList({ userId, currentWeek }: ClockRecordListProps) {
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([])
  const [loading, setLoading] = useState(true)

  // 獲取指定週的打卡記錄
  useEffect(() => {
    const fetchClockRecords = async () => {
      try {
        setLoading(true)
        
        // 計算本週的開始和結束日期
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // 週一開始
        const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
        
        // 直接用週範圍獲取所有打卡記錄
        const response = await fetch(`/api/clock/history?userId=${userId}&from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`)
        
        if (response.ok) {
          const records = await response.json()
          // 按時間排序
          const sortedRecords = records.sort((a: ClockRecord, b: ClockRecord) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          setClockRecords(sortedRecords)
        } else {
          console.error('獲取打卡記錄失敗:', response.status)
          setClockRecords([])
        }
      } catch (error) {
        console.error('獲取打卡記錄失敗:', error)
        setClockRecords([])
      } finally {
        setLoading(false)
      }
    }

    fetchClockRecords()
  }, [userId, currentWeek])

  // 按日期分組打卡記錄
  const groupRecordsByDate = () => {
    const grouped: { [key: string]: ClockRecord[] } = {}
    
    clockRecords.forEach(record => {
      const date = format(parseISO(record.timestamp), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(record)
    })
    
    return grouped
  }

  // 分析每日打卡記錄
  const analyzeDayRecords = (records: ClockRecord[]) => {
    if (records.length === 0) {
      return {
        workStart: null,
        workEnd: null,
        overtimeStart: null,
        overtimeEnd: null,
        totalWorkTime: '無記錄'
      }
    }

    // 按時間排序
    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // 找出正常上下班時間（前兩筆記錄：第一次IN和第一次OUT）
    let workStart: Date | null = null
    let workEnd: Date | null = null
    let overtimeStart: Date | null = null
    let overtimeEnd: Date | null = null

    // 第一次上班打卡
    const firstIn = sortedRecords.find(r => r.type === 'IN')
    if (firstIn) {
      workStart = new Date(firstIn.timestamp)
    }

    // 找第一次下班打卡（在第一次上班之後）
    if (workStart) {
      const firstOut = sortedRecords.find(r => 
        r.type === 'OUT' && new Date(r.timestamp) > workStart!
      )
      if (firstOut) {
        workEnd = new Date(firstOut.timestamp)
      }
    }

    // 找加班時間（在第一次下班之後的IN和最後的OUT）
    if (workEnd) {
      const overtimeIn = sortedRecords.find(r => 
        r.type === 'IN' && new Date(r.timestamp) > workEnd!
      )
      if (overtimeIn) {
        overtimeStart = new Date(overtimeIn.timestamp)
        
        // 找最後一次下班打卡
        const lastOut = [...sortedRecords].reverse().find(r => 
          r.type === 'OUT' && new Date(r.timestamp) > overtimeStart!
        )
        if (lastOut) {
          overtimeEnd = new Date(lastOut.timestamp)
        }
      }
    }

    // 計算總工作時間
    let totalMinutes = 0
    
    // 正常工作時間
    if (workStart && workEnd) {
      totalMinutes += (workEnd.getTime() - workStart.getTime()) / (1000 * 60)
    }
    
    // 加班時間
    if (overtimeStart && overtimeEnd) {
      totalMinutes += (overtimeEnd.getTime() - overtimeStart.getTime()) / (1000 * 60)
    }

    let totalWorkTime = '無記錄'
    if (totalMinutes > 0) {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = Math.round(totalMinutes % 60)
      
      if (hours === 0) {
        totalWorkTime = `${minutes}分鐘`
      } else {
        totalWorkTime = minutes > 0 ? `${hours}小時${minutes}分鐘` : `${hours}小時`
      }
    }

    return {
      workStart,
      workEnd,
      overtimeStart,
      overtimeEnd,
      totalWorkTime
    }
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const groupedRecords = groupRecordsByDate()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white/60">載入打卡記錄中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 週期標題 */}
      <div className="text-center text-white/90 font-medium">
        <Calendar className="w-5 h-5 inline-block mr-2" />
        {format(weekStart, 'yyyy/MM/dd')} - {format(weekEnd, 'yyyy/MM/dd')}
      </div>

      {/* 每日打卡記錄 */}
      {weekDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayName = format(day, 'EEEE', { locale: zhTW })
        const dayRecords = groupedRecords[dateKey] || []
        const analysis = analyzeDayRecords(dayRecords)
        
        return (
          <Card key={dateKey} className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4">
              {/* 日期標題 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">
                    {format(day, 'MM/dd')} ({dayName})
                  </span>
                </div>
                <div className="text-white/70 text-sm">
                  總工作時間：{analysis.totalWorkTime}
                </div>
              </div>
              
              {/* 打卡記錄摘要 */}
              {dayRecords.length === 0 ? (
                <div className="text-white/50 text-center py-6">
                  當日無打卡記錄
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 正常上下班時間 */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium">正常班時間</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 上班時間 */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-500/20">
                          <LogIn className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <div className="text-white/80 text-sm">上班打卡</div>
                          <div className="text-white font-mono">
                            {analysis.workStart 
                              ? format(analysis.workStart, 'HH:mm:ss')
                              : '--:--:--'
                            }
                          </div>
                        </div>
                      </div>
                      
                      {/* 下班時間 */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-500/20">
                          <LogOut className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <div className="text-white/80 text-sm">下班打卡</div>
                          <div className="text-white font-mono">
                            {analysis.workEnd 
                              ? format(analysis.workEnd, 'HH:mm:ss')
                              : '--:--:--'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 加班時間（如果有的話） */}
                  {(analysis.overtimeStart || analysis.overtimeEnd) && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span className="text-white font-medium">加班時間</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* 加班開始 */}
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-500/20">
                            <LogIn className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <div className="text-orange-200 text-sm">加班開始</div>
                            <div className="text-white font-mono">
                              {analysis.overtimeStart 
                                ? format(analysis.overtimeStart, 'HH:mm:ss')
                                : '--:--:--'
                              }
                            </div>
                          </div>
                        </div>
                        
                        {/* 加班結束 */}
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-red-500/20">
                            <LogOut className="w-4 h-4 text-red-400" />
                          </div>
                          <div>
                            <div className="text-orange-200 text-sm">加班結束</div>
                            <div className="text-white font-mono">
                              {analysis.overtimeEnd 
                                ? format(analysis.overtimeEnd, 'HH:mm:ss')
                                : '--:--:--'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 詳細打卡記錄（可收合） */}
                  <details className="group">
                    <summary className="cursor-pointer text-white/70 text-sm hover:text-white transition-colors">
                      <span className="group-open:hidden">▶ 查看詳細打卡記錄 ({dayRecords.length} 筆)</span>
                      <span className="hidden group-open:inline">▼ 隱藏詳細打卡記錄</span>
                    </summary>
                    <div className="mt-3 space-y-2">
                      {dayRecords.sort((a, b) => 
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                      ).map(record => (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                        >
                          <div className={`p-2 rounded-full ${
                            record.type === 'IN' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {record.type === 'IN' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="text-white font-medium">
                              {record.type === 'IN' ? '上班打卡' : '下班打卡'}
                            </div>
                            <div className="text-white/70 text-sm">
                              {format(parseISO(record.timestamp), 'HH:mm:ss')}
                            </div>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            record.type === 'IN' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {record.type === 'IN' ? '進入' : '離開'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 