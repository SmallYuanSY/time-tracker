"use client"

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Clock, FileSpreadsheet, Shield, ChevronLeft, ChevronRight, List, Table, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AttendanceSpreadsheet from '@/components/ui/AttendanceSpreadsheet'
import { useSession } from 'next-auth/react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { calculateWorkTime } from '@/lib/utils'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'WEB_ADMIN' | 'EMPLOYEE'
  createdAt: string
}

interface ClockRecord {
  id: string
  type: 'IN' | 'OUT'
  timestamp: string
  isEdited?: boolean
  editReason?: string
  editedAt?: string
  editedBy?: string
  editIpAddress?: string
  originalTimestamp?: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface AttendanceSignature {
  id: string
  userId: string
  date: string
  signedBy: string
  signedAt: string
  note?: string
  signerName: string
}

interface AttendancePageProps {
  selectedUser: string
  currentDate: Date
  searchTerm: string
}

type AttendanceViewMode = 'list' | 'spreadsheet'

interface WorkTimeSettings {
  normalWorkStart: string
  normalWorkEnd: string
  lunchBreakStart: string
  lunchBreakEnd: string
  overtimeStart: string
  minimumOvertimeUnit: number
}

export default function AttendancePage({ selectedUser, currentDate: initialDate, searchTerm }: AttendancePageProps) {
  const { data: session } = useSession()
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([])
  const [signatures, setSignatures] = useState<AttendanceSignature[]>([])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [showSignModal, setShowSignModal] = useState(false)
  const [signPassword, setSignPassword] = useState('')
  const [signNote, setSignNote] = useState('')
  const [signErrors, setSignErrors] = useState<string[]>([])
  const [isSigningAttendance, setIsSigningAttendance] = useState(false)
  const [attendanceViewMode, setAttendanceViewMode] = useState<AttendanceViewMode>('list')
  const [selectedUserData, setSelectedUserData] = useState<User | null>(null)
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [workTimeSettings, setWorkTimeSettings] = useState<WorkTimeSettings>({
    normalWorkStart: '09:00',
    normalWorkEnd: '18:00',
    lunchBreakStart: '12:30',
    lunchBreakEnd: '13:30',
    overtimeStart: '18:00',
    minimumOvertimeUnit: 30
  })

  // 載入用戶資料
  const loadUserData = useCallback(async () => {
    if (!selectedUser) return
    
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const users = await response.json()
        const user = users.find((u: User) => u.id === selectedUser)
        if (user) {
          setSelectedUserData(user)
        }
      }
    } catch (error) {
      console.error('載入用戶資料失敗:', error)
    }
  }, [selectedUser])

  // 載入打卡記錄
  const loadClockRecords = useCallback(async () => {
    if (!selectedUser) return
    
    try {
      const startDate = startOfMonth(currentDate)
      const endDate = endOfMonth(currentDate)

      const response = await fetch(`/api/admin/attendance?start=${startDate.toISOString()}&end=${endDate.toISOString()}&userId=${selectedUser}`)
      if (response.ok) {
        const data = await response.json()
        setClockRecords(data)
      }
    } catch (error) {
      console.error('載入打卡記錄失敗:', error)
    }
  }, [currentDate, selectedUser])

  // 載入簽名記錄
  const loadSignatures = useCallback(async () => {
    if (!selectedUser) return
    
    try {
      const startDate = startOfMonth(currentDate)
      const endDate = endOfMonth(currentDate)

      const response = await fetch(`/api/admin/attendance/signatures?start=${startDate.toISOString()}&end=${endDate.toISOString()}&userId=${selectedUser}`)
      if (response.ok) {
        const data = await response.json()
        setSignatures(data)
      }
    } catch (error) {
      console.error('載入簽名記錄失敗:', error)
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

  // 處理考勤資料
  const processAttendanceData = useCallback((data: any[]) => {
    return data.map(record => {
      if (record.startTime && record.endTime) {
        const { normalMinutes, overtimeMinutes } = calculateTotalTime(
          record.startTime,
          record.endTime
        )
        return {
          ...record,
          normalMinutes,
          overtimeMinutes
        }
      }
      return record
    })
  }, [calculateTotalTime])

  // 在載入資料時使用新的計算邏輯
  useEffect(() => {
    if (clockRecords.length > 0) {
      const processedData = processAttendanceData(clockRecords)
      setClockRecords(processedData)
    }
  }, [workTimeSettings, clockRecords]) // 當設定變更時重新計算

  useEffect(() => {
    loadUserData()
    loadClockRecords()
    loadSignatures()
  }, [loadUserData, loadClockRecords, loadSignatures])

  const groupClockRecordsByDate = () => {
    const grouped: { [key: string]: ClockRecord[] } = {}
    clockRecords.forEach(record => {
      const date = format(new Date(record.timestamp), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(record)
    })
    return grouped
  }

  const toggleDateSelection = (dateKey: string, hasRecords: boolean) => {
    if (!hasRecords) return
    
    const newSelectedDates = new Set(selectedDates)
    if (selectedDates.has(dateKey)) {
      newSelectedDates.delete(dateKey)
    } else {
      newSelectedDates.add(dateKey)
    }
    setSelectedDates(newSelectedDates)
  }

  const isDateSignedByCurrentUser = (dateKey: string) => {
    return signatures.some(sig => sig.date === dateKey)
  }

  const getDateSignatures = (dateKey: string) => {
    return signatures.filter(sig => sig.date === dateKey)
  }

  const hasAnySignature = (dateKey: string) => {
    return signatures.some(sig => sig.date === dateKey)
  }

  // 月份導航
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
      return newDate
    })
  }

  // 處理簽名
  const handleSign = async () => {
    if (selectedDates.size === 0) {
      setSignErrors(['請至少選擇一個日期進行簽名'])
      return
    }

    if (!signPassword.trim()) {
      setSignErrors(['請輸入密碼'])
      return
    }

    if (!session?.user) {
      setSignErrors(['請先登入'])
      return
    }

    setIsSigningAttendance(true)
    setSignErrors([])

    try {
      const response = await fetch('/api/admin/attendance/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          dates: Array.from(selectedDates),
          password: signPassword,
          note: signNote.trim() || null,
          signedBy: (session.user as any).id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '簽名失敗')
      }

      // 重新載入簽名記錄
      await loadSignatures()
      
      // 清空選擇和密碼
      setSelectedDates(new Set())
      setSignPassword('')
      setSignNote('')
      setShowSignModal(false)
      
      alert('簽名成功')
    } catch (error) {
      setSignErrors([error instanceof Error ? error.message : '簽名失敗，請稍後再試'])
    } finally {
      setIsSigningAttendance(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-400" />
          考勤管理 - {selectedUserData?.name}
        </h2>
        
        <div className="flex items-center gap-3">
          {/* 月份導航 */}
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-white px-2">
              {format(currentDate, 'yyyy年MM月', { locale: zhTW })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 視圖切換 */}
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
            <Button
              variant={attendanceViewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAttendanceViewMode('list')}
              className="text-white"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={attendanceViewMode === 'spreadsheet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAttendanceViewMode('spreadsheet')}
              className="text-white"
            >
              <Table className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 簽名按鈕 */}
          <Button
            onClick={() => setShowSignModal(true)}
            disabled={selectedDates.size === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            簽名確認 ({selectedDates.size})
          </Button>
        </div>
      </div>

      {/* 根據視圖模式渲染不同內容 */}
      {attendanceViewMode === 'spreadsheet' ? (
        <AttendanceSpreadsheet
          clockRecords={clockRecords}
          signatures={signatures}
          selectedUser={selectedUserData}
          currentDate={currentDate}
        />
      ) : (
        <div className="space-y-4">
          {(() => {
            const monthStart = startOfMonth(currentDate)
            const monthEnd = endOfMonth(currentDate)
            const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
            const groupedRecords = groupClockRecordsByDate()

            return monthDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayName = format(day, 'EEEE', { locale: zhTW })
              const dayRecords = groupedRecords[dateKey] || []
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey
              const isSigned = isDateSignedByCurrentUser(dateKey)
              const hasSignature = hasAnySignature(dateKey)
              const dateSignatures = getDateSignatures(dateKey)

              return (
                <Card
                  key={dateKey}
                  className={`bg-white/5 backdrop-blur border-white/10 p-4 ${selectedDates.has(dateKey) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => toggleDateSelection(dateKey, dayRecords.length > 0)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar className={`h-5 w-5 ${isToday ? 'text-yellow-300' : 'text-white'}`} />
                      <h3 className={`text-lg font-semibold ${isToday ? 'text-yellow-300' : 'text-white'}`}>
                        {format(day, 'MM/dd')} ({dayName})
                        {isToday && <span className="ml-2 text-yellow-400">今天</span>}
                      </h3>
                      <span className="text-white/60 text-sm">
                        {dayRecords.length} 筆記錄
                      </span>
                      {hasSignature && (
                        <span className="text-green-400 text-xs bg-green-500/20 px-2 py-1 rounded-full">
                          已簽核
                        </span>
                      )}
                    </div>
                  </div>

                  {dayRecords.length === 0 ? (
                    <div className="text-white/60 text-sm py-2">
                      無打卡記錄
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayRecords
                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                        .map(record => (
                          <div
                            key={record.id}
                            className="flex items-center gap-4 text-white/80 text-sm bg-white/5 p-2 rounded"
                          >
                            <span className={`px-2 py-1 rounded ${record.type === 'IN' ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>
                              {record.type === 'IN' ? '上班' : '下班'}
                            </span>
                            <span className="font-mono">
                              {format(parseISO(record.timestamp), 'HH:mm:ss')}
                            </span>
                            {record.isEdited && (
                              <HoverCard>
                                <HoverCardTrigger>
                                  <div className="text-orange-400 text-xs bg-orange-500/20 px-2 py-1 rounded-full cursor-help">
                                    已編輯
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 bg-black/90 border border-orange-500/30" forceMount>
                                  <div className="space-y-2">
                                    <div className="text-orange-400 font-medium">編輯記錄</div>
                                    {record.editReason && (
                                      <div className="text-sm">
                                        <span className="text-white/60">原因：</span>
                                        <span className="text-white">{record.editReason}</span>
                                      </div>
                                    )}
                                    {record.editedAt && (
                                      <div className="text-sm">
                                        <span className="text-white/60">編輯時間：</span>
                                        <span className="text-white">{format(parseISO(record.editedAt), 'yyyy/MM/dd HH:mm:ss')}</span>
                                      </div>
                                    )}
                                    {record.editIpAddress && (
                                      <div className="text-sm">
                                        <span className="text-white/60">IP位址：</span>
                                        <span className="text-white">{record.editIpAddress}</span>
                                      </div>
                                    )}
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* 簽核記錄 */}
                  {dateSignatures.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-white/60 text-sm mb-2">簽核記錄：</div>
                      <div className="space-y-2">
                        {dateSignatures.map(sig => (
                          <div key={sig.id} className="text-sm text-white/70 flex items-center gap-2">
                            <span className="text-green-400">✓</span>
                            {sig.signerName} 於 {format(parseISO(sig.signedAt), 'MM/dd HH:mm')} 簽核
                            {sig.note && <span className="text-white/50">({sig.note})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })
          })()}
        </div>
      )}

      {/* 簽名確認對話框 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              數位簽名確認
            </h2>
            
            {signErrors.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30">
                {signErrors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  選擇的日期
                </label>
                <div className="text-sm bg-white/10 p-3 rounded-xl text-white">
                  {Array.from(selectedDates).join(', ')}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  管理員密碼 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={signPassword}
                  onChange={(e) => setSignPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400"
                  placeholder="請輸入密碼"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  備註（選填）
                </label>
                <textarea
                  value={signNote}
                  onChange={(e) => setSignNote(e.target.value)}
                  className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="請輸入備註"
                  rows={3}
                />
                <div className="text-xs text-white/60 space-y-1 mt-2">
                  <p>⚠️ 數位簽名將記錄您的身份和時間，具有法律效力</p>
                  <p>💡 多位主管可對同一日期進行簽名，建立多重審核機制</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSignModal(false)
                  setSignPassword('')
                  setSignNote('')
                  setSignErrors([])
                }}
                disabled={isSigningAttendance}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                取消
              </Button>
              <Button
                onClick={handleSign}
                disabled={isSigningAttendance || !signPassword.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSigningAttendance ? '簽名中...' : '確認簽名'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 