"use client"

import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface WorkLog {
  id: string
  startTime: string
  endTime: string | null
  projectCode: string
  projectName: string
  category: string
  content: string
  userId: string
}

interface UserWorkLogs {
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
  logs: WorkLog[]
}

interface WeekCalendarProps {
  currentDate?: Date
  onDateSelect?: (date: Date, hour: number) => void
  workLogs?: UserWorkLogs[]
}

export function WeekCalendar({ 
  currentDate = new Date(),
  onDateSelect,
  workLogs = []
}: WeekCalendarProps) {
  const weekStart = startOfWeek(currentDate, { locale: zhTW })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const now = new Date()
  const currentHour = now.getHours()

  // 將工作紀錄按日期和小時分組，並加入使用者資訊
  const workLogMap = new Map<string, Map<number, Array<WorkLog & { userName: string | null }>>>()
  workLogs.forEach(userLogs => {
    userLogs.logs.forEach(log => {
      const startDate = new Date(log.startTime)
      const endDate = log.endTime ? new Date(log.endTime) : new Date()
      const dateKey = format(startDate, 'yyyy-MM-dd')
      
      // 計算這條記錄涉及的所有小時
      const startHour = startDate.getHours()
      const endHour = endDate.getHours()
      
      for (let hour = startHour; hour <= endHour; hour++) {
        if (!workLogMap.has(dateKey)) {
          workLogMap.set(dateKey, new Map())
        }
        const hourMap = workLogMap.get(dateKey)!
        if (!hourMap.has(hour)) {
          hourMap.set(hour, [])
        }
        // 加入使用者名稱資訊
        hourMap.get(hour)!.push({
          ...log,
          userName: userLogs.user.name
        })
      }
    })
  })

  // 檢查兩個工作時間是否重疊，且是不同使用者
  const isOverlapping = (log1: WorkLog & { userName: string | null }, log2: WorkLog & { userName: string | null }) => {
    // 如果是同一個使用者的工作，不算重疊
    if (log1.userId === log2.userId) return false

    const start1 = new Date(log1.startTime)
    const end1 = log1.endTime ? new Date(log1.endTime) : new Date()
    const start2 = new Date(log2.startTime)
    const end2 = log2.endTime ? new Date(log2.endTime) : new Date()

    return start1 < end2 && start2 < end1
  }

  // 計算每個工作紀錄應該顯示在第幾列
  const calculateLogRows = (logs: Array<WorkLog & { userName: string | null }>) => {
    const rows: Array<Array<WorkLog & { userName: string | null }>> = []
    
    logs.forEach(log => {
      // 尋找可以放置的列
      let rowIndex = 0
      while (true) {
        if (!rows[rowIndex]) {
          rows[rowIndex] = [log]
          break
        }
        // 檢查這一列的所有工作是否與當前工作有時間重疊
        const hasOverlap = rows[rowIndex].some(existingLog => 
          isOverlapping(existingLog, log)
        )
        
        if (!hasOverlap) {
          rows[rowIndex].push(log)
          break
        }
        rowIndex++
      }
    })
    
    return rows
  }

  return (
    <div className="w-full h-[calc(100vh-200px)] overflow-auto rounded-lg">
      <div className="relative min-w-[800px] bg-gradient-to-b from-background to-background/80">
        {/* 頂部日期列 */}
        <div className="flex border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
          <div className="w-20 shrink-0" /> {/* 時間軸左側空白 */}
          {weekDays.map((date, index) => (
            <div
              key={index}
              className={cn(
                "flex-1 p-3 text-center border-l border-border/50",
                format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && 
                "bg-primary/5 border-l-primary/30"
              )}
            >
              <div className={cn(
                "font-medium mb-1",
                format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && 
                "text-primary"
              )}>
                {format(date, 'EEE', { locale: zhTW })}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(date, 'MM/dd')}
              </div>
            </div>
          ))}
        </div>

        {/* 時間格線 */}
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className={cn(
              "flex group",
              hour === currentHour && "bg-primary/5"
            )}>
              {/* 時間軸 */}
              <div className={cn(
                "w-20 shrink-0 pr-3 py-2 text-right text-sm sticky left-0 z-10",
                "bg-gradient-to-r from-background via-background to-background/80 backdrop-blur-sm",
                hour === currentHour && "text-primary font-medium"
              )}>
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>
              
              {/* 每天的時間格 */}
              <div className="flex flex-1">
                {weekDays.map((date, dayIndex) => {
                  const dateKey = format(date, 'yyyy-MM-dd')
                  const hourLogs = workLogMap.get(dateKey)?.get(hour) || []
                  const logRows = calculateLogRows(hourLogs)
                  const rowHeight = logRows.length > 0 ? `${100 / logRows.length}%` : '100%'

                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={cn(
                        "flex-1 h-16 border-l border-border/30 relative group/cell transition-colors duration-150",
                        dayIndex === 0 && "border-l-[1.5px] border-l-border/50",
                        hour === 0 && "border-t border-t-border/50",
                        format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && 
                        hour === currentHour && "bg-primary/5",
                        "hover:bg-accent/5"
                      )}
                      onClick={() => onDateSelect?.(date, hour)}
                    >
                      {/* 半小時刻度 */}
                      <div className="absolute left-0 top-1/2 w-2 border-t border-border/20" />
                      
                      {/* 工作紀錄 */}
                      <div className="absolute inset-1 flex flex-col gap-1">
                        {logRows.map((row, rowIndex) => (
                          <div 
                            key={rowIndex} 
                            className="flex-1 min-h-0 relative"
                            style={{
                              height: `calc(${100 / logRows.length}% - ${(logRows.length - 1) * 0.25}rem)`
                            }}
                          >
                            {row.map((log, logIndex) => {
                              const startDate = new Date(log.startTime)
                              const endDate = log.endTime ? new Date(log.endTime) : new Date()
                              const startMinutes = startDate.getMinutes()
                              const endMinutes = endDate.getMinutes()
                              const startPercent = hour === startDate.getHours() ? (startMinutes / 60) * 100 : 0
                              const endPercent = hour === endDate.getHours() ? (endMinutes / 60) * 100 : 100
                              const width = `${endPercent - startPercent}%`
                              const left = `${startPercent}%`

                              return (
                                <div
                                  key={`${log.id}-${logIndex}`}
                                  className="absolute inset-y-0 bg-primary/20 rounded-sm border border-primary/30 p-0.5 text-[10px] leading-tight overflow-hidden"
                                  style={{ left, width }}
                                  title={`${log.userName || '未命名'} - ${log.projectName} - ${log.category}\n${log.content}`}
                                >
                                  <div className="font-medium truncate">{log.userName || '未命名'}</div>
                                  <div className="text-muted-foreground truncate">{log.content}</div>
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                      
                      {/* 互動提示 */}
                      <div className={cn(
                        "absolute inset-1 rounded border-2 border-primary/0 transition-all duration-150",
                        "group-hover/cell:border-primary/10",
                        "group-hover/cell:shadow-[0_0_0_4px_rgba(var(--primary)/_0.02)]"
                      )} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 當前時間指示器 */}
        <div 
          className="absolute left-20 right-0 border-t-2 border-primary/50 z-20 pointer-events-none"
          style={{
            top: `${currentHour * 64 + (now.getMinutes() / 60) * 64}px`
          }}
        >
          <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-primary/50" />
        </div>
      </div>
    </div>
  )
} 