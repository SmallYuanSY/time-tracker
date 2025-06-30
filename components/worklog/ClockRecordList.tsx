"use client"

import { useState, useEffect } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, LogIn, LogOut, Calendar, Edit3, Plane } from 'lucide-react'
import { useSession } from 'next-auth/react'
import DeviceInfoDisplay from '@/components/ui/DeviceInfoDisplay'
import { Portal } from '@/components/ui/portal'
import WorkTimeStatsCard from '@/components/ui/WorkTimeStatsCard'

interface ClockRecord {
  id: string
  userId: string
  type: 'IN' | 'OUT'
  timestamp: string
  ipAddress?: string
  macAddress?: string
  userAgent?: string
  deviceInfo?: string
  isEdited?: boolean
  editReason?: string
  editedAt?: string
  editedBy?: string
  editIpAddress?: string
  originalTimestamp?: string
}

interface LeaveRequest {
  id: string
  reason: string
  startDate: string
  endDate: string
  status: 'PENDING_AGENT' | 'AGENT_REJECTED' | 'PENDING_ADMIN' | 'ADMIN_REJECTED' | 'APPROVED'
}

interface ClockRecordListProps {
  userId: string
  currentWeek: Date
  timeRange?: 'week' | 'month'
}

interface EditClockModalProps {
  record: ClockRecord | null
  onClose: () => void
  onSave: () => void
}

function EditClockModal({ record, onClose, onSave }: EditClockModalProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    timestamp: '',
    editReason: '',
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (record) {
      const date = new Date(record.timestamp)
      const timeString = format(date, 'HH:mm')
      setFormData({
        timestamp: timeString,
        editReason: '',
      })
    }
  }, [record])

  const handleSubmit = async () => {
    const newErrors: string[] = []
    
    if (!formData.timestamp) newErrors.push('打卡時間為必填欄位')
    if (!formData.editReason.trim()) newErrors.push('編輯原因為必填欄位')
    
    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    if (!session?.user) {
      setErrors(['請先登入'])
      return
    }

    setIsSubmitting(true)
    setErrors([])

    try {
      // 構建完整的時間戳
      const originalDate = new Date(record!.timestamp)
      const timeParts = formData.timestamp.split(':')
      if (timeParts.length !== 2) {
        throw new Error('時間格式錯誤')
      }
      
      const hours = parseInt(timeParts[0], 10)
      const minutes = parseInt(timeParts[1], 10)
      
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('時間數值錯誤')
      }
      
      const newDate = new Date(originalDate)
      newDate.setHours(hours, minutes, 0, 0)

      const response = await fetch(`/api/clock/${record!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session.user as any).id,
          timestamp: newDate.toISOString(),
          editReason: formData.editReason,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || '編輯失敗')
      }

      onSave()
      onClose()
    } catch (error) {
      setErrors([error instanceof Error ? error.message : '編輯失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!record) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <h2 className="text-lg font-semibold mb-4 text-white">
            編輯打卡記錄
          </h2>

          {errors.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30">
              <ul className="text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {/* 打卡類型顯示 */}
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-sm text-white/60 mb-1">打卡類型</div>
              <div className={`font-medium ${record.type === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                {record.type === 'IN' ? '🟢 上班打卡' : '🔴 下班打卡'}
              </div>
            </div>

            {/* 原始時間顯示 */}
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-sm text-white/60 mb-1">原始時間</div>
              <div className="text-white font-mono">
                {format(new Date(record.timestamp), 'yyyy/MM/dd HH:mm:ss')}
              </div>
            </div>

            {/* 新時間輸入 */}
            <div className="space-y-2">
              <label className="text-sm text-white font-medium block">
                修改時間 <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={formData.timestamp}
                onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
                className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* 編輯原因 */}
            <div className="space-y-2">
              <label className="text-sm text-white font-medium block">
                編輯原因 <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={formData.editReason}
                onChange={(e) => setFormData(prev => ({ ...prev, editReason: e.target.value }))}
                placeholder="請說明編輯此打卡記錄的原因..."
                className="w-full rounded-xl bg-orange-500/20 border border-orange-400/50 px-4 py-2 text-white placeholder:text-orange-200/60 focus:outline-none focus:border-orange-400"
              />
              <p className="text-xs text-orange-200/80">
                ⚠️ 編輯原因將記錄您的IP地址，供管理員審核使用
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-white/80 hover:text-white hover:bg-white/10 border-white/20"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default function ClockRecordList({ userId, currentWeek, timeRange = 'week' }: ClockRecordListProps) {
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRecord, setEditingRecord] = useState<ClockRecord | null>(null)

  const fetchClockRecords = async () => {
    try {
      // 計算時間範圍
      let rangeStart: Date, rangeEnd: Date
      
      if (timeRange === 'month') {
        rangeStart = new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1)
        rangeEnd = new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 0)
      } else {
        rangeStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
        rangeEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
      }

      const response = await fetch(`/api/clock/history?userId=${userId}&from=${rangeStart.toISOString()}&to=${rangeEnd.toISOString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setClockRecords(data)
      } else {
        console.error('Failed to fetch clock records')
      }
    } catch (error) {
      console.error('Error fetching clock records:', error)
    }
  }

  const fetchLeaveRequests = async () => {
    try {
      // 計算時間範圍
      let rangeStart: Date, rangeEnd: Date
      
      if (timeRange === 'month') {
        rangeStart = new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1)
        rangeEnd = new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 0)
      } else {
        rangeStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
        rangeEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
      }

      const response = await fetch('/api/leaves/approved')
      if (response.ok) {
        const data = await response.json()
        // 過濾出指定用戶的已批准且在當前時間範圍內的請假記錄
        const approvedLeaves = data.filter((leave: any) => {
          // 確認是該用戶的請假記錄
          if (leave.requester.id !== userId) return false
          
          const leaveStart = new Date(leave.startDate)
          const leaveEnd = new Date(leave.endDate)
          
          // 檢查請假期間是否與當前顯示範圍有重疊
          return leaveStart <= rangeEnd && leaveEnd >= rangeStart
        })
        setLeaveRequests(approvedLeaves)
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error)
    }
  }

  useEffect(() => {
    if (userId) {
      setLoading(true)
      Promise.all([fetchClockRecords(), fetchLeaveRequests()]).finally(() => {
        setLoading(false)
      })
    }
  }, [userId, currentWeek, timeRange])

  const handleEditRecord = (record: ClockRecord) => {
    setEditingRecord(record)
  }

  const handleSaveEdit = () => {
    fetchClockRecords()
  }

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

  // 檢查某日是否有請假（可能是部分時間）
  const checkLeaveOnDate = (date: Date) => {
    const checkDateStr = format(date, 'yyyy-MM-dd')
    
    const dayLeaves = leaveRequests.filter(leave => {
      // 使用字符串比較來避免時區問題
      const leaveStartStr = format(new Date(leave.startDate), 'yyyy-MM-dd')
      const leaveEndStr = format(new Date(leave.endDate), 'yyyy-MM-dd')
      
      // 檢查日期字符串是否在請假期間內
      const isWithin = checkDateStr >= leaveStartStr && checkDateStr <= leaveEndStr
      

      
      return isWithin
    })
    
    if (dayLeaves.length > 0) {
      // 返回該日的所有請假記錄
      return dayLeaves
    }
    
    return null
  }

  // 分析每日打卡記錄 - 簡化版本
  const analyzeDayRecords = (records: ClockRecord[]) => {
    if (records.length === 0) {
      return {
        workStart: null,
        workEnd: null,
        firstOvertimeStart: null,
        lastOvertimeEnd: null,
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
    let firstOvertimeStart: Date | null = null
    let lastOvertimeEnd: Date | null = null

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

    // 找加班時間（在第一次下班之後的第一次IN和最後的OUT）
    if (workEnd) {
      const overtimeIn = sortedRecords.find(r => 
        r.type === 'IN' && new Date(r.timestamp) > workEnd!
      )
      if (overtimeIn) {
        firstOvertimeStart = new Date(overtimeIn.timestamp)
        
        // 找最後一次下班打卡
        const lastOut = [...sortedRecords].reverse().find(r => 
          r.type === 'OUT' && new Date(r.timestamp) > firstOvertimeStart!
        )
        if (lastOut) {
          lastOvertimeEnd = new Date(lastOut.timestamp)
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
    if (firstOvertimeStart && lastOvertimeEnd) {
      totalMinutes += (lastOvertimeEnd.getTime() - firstOvertimeStart.getTime()) / (1000 * 60)
    }

    let totalWorkTime = '無記錄'
    if (totalMinutes > 0) {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = Math.round(totalMinutes % 60)
      
      if (hours === 0) {
        totalWorkTime = `${minutes}分`
      } else {
        totalWorkTime = minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`
      }
    }

    return {
      workStart,
      workEnd,
      firstOvertimeStart,
      lastOvertimeEnd,
      totalWorkTime
    }
  }

  // 計算顯示範圍
  let rangeStart: Date, rangeEnd: Date, displayDays: Date[]
  
  if (timeRange === 'month') {
    rangeStart = new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1)
    rangeEnd = new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 0)
    displayDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  } else {
    rangeStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
    rangeEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
    displayDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  }
  
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
        {timeRange === 'month' 
          ? format(currentWeek, 'yyyy年MM月')
          : `${format(rangeStart, 'yyyy/MM/dd')} - ${format(rangeEnd, 'yyyy/MM/dd')}`
        }
      </div>

      {/* 每日打卡記錄 */}
      {displayDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayName = format(day, 'EEEE', { locale: zhTW })
        const dayRecords = groupedRecords[dateKey] || []
        const analysis = analyzeDayRecords(dayRecords)
        const leaveInfo = checkLeaveOnDate(day)
        
        // 決定卡片顏色：有打卡記錄時使用淡綠色，無打卡記錄時使用預設色
        const hasRecords = dayRecords.length > 0
        const cardBgClass = hasRecords 
          ? "bg-green-500/8 border-green-500/15 backdrop-blur-sm" 
          : "bg-white/5 border-white/10 backdrop-blur-sm"
        
        return (
          <Card key={dateKey} className={cardBgClass}>
            <CardContent className="p-4">
              {/* 日期標題 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${hasRecords ? 'text-green-400' : 'text-blue-400'}`} />
                  <span className="text-white font-medium">
                    {format(day, 'MM/dd')} ({dayName})
                  </span>
                  {hasRecords && (
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                  {leaveInfo && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                      <Plane className="w-3 h-3" />
                      {Array.isArray(leaveInfo) && leaveInfo.length > 0 ? (
                        leaveInfo.length === 1 ? (
                          // 單一請假記錄，顯示時間範圍
                          `請假 ${format(new Date(leaveInfo[0].startDate), 'HH:mm')}-${format(new Date(leaveInfo[0].endDate), 'HH:mm')}`
                        ) : (
                          // 多個請假記錄，只顯示「請假」
                          `請假 (${leaveInfo.length}筆)`
                        )
                      ) : (
                        '請假'
                      )}
                    </div>
                  )}
                </div>
                <div className="text-white/70 text-sm">
                  {analysis.totalWorkTime}
                </div>
              </div>
              
              {/* 打卡記錄摘要 */}
              {timeRange === 'month' ? (
                // 當月模式：簡化單行顯示
                <div className="grid grid-cols-4 gap-4 text-sm">
                  {/* 上班時間 */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-green-500/20">
                      <LogIn className="w-3 h-3 text-green-400" />
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">上班</div>
                      <div className="text-white font-mono text-sm">
                        {analysis.workStart 
                          ? format(analysis.workStart, 'HH:mm')
                          : '--:--'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* 下班時間 */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-red-500/20">
                      <LogOut className="w-3 h-3 text-red-400" />
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">下班</div>
                      <div className="text-white font-mono text-sm">
                        {analysis.workEnd 
                          ? format(analysis.workEnd, 'HH:mm')
                          : '--:--'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* 加班開始 */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-orange-500/20">
                      <LogIn className="w-3 h-3 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-orange-200/60 text-xs">加班</div>
                      <div className="text-white font-mono text-sm">
                        {analysis.firstOvertimeStart 
                          ? format(analysis.firstOvertimeStart, 'HH:mm')
                          : '--:--'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* 加班結束 */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-orange-500/20">
                      <LogOut className="w-3 h-3 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-orange-200/60 text-xs">離開</div>
                      <div className="text-white font-mono text-sm">
                        {analysis.lastOvertimeEnd 
                          ? format(analysis.lastOvertimeEnd, 'HH:mm')
                          : '--:--'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // 當週模式：保持原有詳細顯示
                                 dayRecords.length === 0 ? (
                  <div className="text-white/50 text-center py-6">
                    {leaveInfo ? (
                      Array.isArray(leaveInfo) && leaveInfo.length > 0 ? (
                        <div className="space-y-2">
                          <div>該日有請假安排，無打卡記錄</div>
                          {leaveInfo.map((leave, index) => (
                            <div key={index} className="text-purple-300 text-sm">
                              📝 {leave.reason} ({format(new Date(leave.startDate), 'HH:mm')}-{format(new Date(leave.endDate), 'HH:mm')})
                            </div>
                          ))}
                        </div>
                      ) : '請假日'
                    ) : '當日無打卡記錄'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 請假時間（如果有的話） */}
                    {leaveInfo && Array.isArray(leaveInfo) && leaveInfo.length > 0 && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Plane className="w-4 h-4 text-purple-400" />
                          <span className="text-white font-medium">請假時間</span>
                        </div>
                        <div className="space-y-2">
                          {leaveInfo.map((leave, index) => (
                            <div key={index} className="flex items-center justify-between bg-purple-500/5 rounded-lg p-3">
                              <div>
                                <div className="text-purple-200 font-medium">{leave.reason}</div>
                                <div className="text-white/70 text-sm">
                                  {format(new Date(leave.startDate), 'HH:mm')} - {format(new Date(leave.endDate), 'HH:mm')}
                                </div>
                              </div>
                              <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                                已批准
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
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
                    {(analysis.firstOvertimeStart || analysis.lastOvertimeEnd) && (
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
                                {analysis.firstOvertimeStart 
                                  ? format(analysis.firstOvertimeStart, 'HH:mm:ss')
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
                                {analysis.lastOvertimeEnd 
                                  ? format(analysis.lastOvertimeEnd, 'HH:mm:ss')
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
                      <summary className="cursor-pointer text-white/70 text-sm hover:text-white transition-colors list-none">
                        <div className="flex items-center gap-2">
                          <span className="group-open:rotate-90 transition-transform duration-200">▶</span>
                          <span className="group-open:hidden">查看詳細打卡記錄 ({dayRecords.length} 筆)</span>
                          <span className="hidden group-open:inline">隱藏詳細打卡記錄</span>
                        </div>
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
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {record.type === 'IN' ? '上班打卡' : '下班打卡'}
                                </span>
                                {record.isEdited && (
                                  <span className="text-orange-400 text-xs bg-orange-500/20 px-2 py-1 rounded-full">
                                    已編輯
                                  </span>
                                )}
                              </div>
                              <div className="text-white/70 text-sm">
                                {format(parseISO(record.timestamp), 'HH:mm:ss')}
                                {record.editedAt && (
                                  <span className="text-orange-300/60 ml-2">
                                    (修改於 {format(parseISO(record.editedAt), 'MM/dd HH:mm')})
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end gap-2">
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  record.type === 'IN' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {record.type === 'IN' ? '進入' : '離開'}
                                </div>
                                <DeviceInfoDisplay record={record} />
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEditRecord(record)}
                                className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-0"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                編輯
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* 工作時間統計 */}
      <WorkTimeStatsCard
        userId={userId}
        timeRange={timeRange}
        currentDate={currentWeek}
      />

      {/* 編輯彈窗 */}
      {editingRecord && (
        <EditClockModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
} 