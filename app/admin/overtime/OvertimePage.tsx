"use client"

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { TrendingUp, ChevronLeft, ChevronRight, Shield, List, Table } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import OvertimeSpreadsheet from '@/components/ui/OvertimeSpreadsheet'
import { useSession } from 'next-auth/react'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'WEB_ADMIN' | 'EMPLOYEE'
  createdAt: string
}

interface WorkLog {
  id: string
  startTime: string
  endTime: string | null
  projectCode: string
  projectName: string
  category: string
  content: string
  isEdited: boolean
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

interface AttendanceSignature {
  id: string
  userId: string
  date: string
  signedBy: string
  signedAt: string
  signerName: string
  note?: string
}

interface OvertimePageProps {
  selectedUser: string
  currentDate: Date
  searchTerm: string
}

export default function OvertimePage({ selectedUser, currentDate: initialDate, searchTerm }: OvertimePageProps) {
  const { data: session } = useSession()
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [signatures, setSignatures] = useState<AttendanceSignature[]>([])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [showSignModal, setShowSignModal] = useState(false)
  const [signPassword, setSignPassword] = useState('')
  const [signNote, setSignNote] = useState('')
  const [signErrors, setSignErrors] = useState<string[]>([])
  const [isSigningAttendance, setIsSigningAttendance] = useState(false)
  const [selectedUserData, setSelectedUserData] = useState<User | null>(null)
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [viewMode, setViewMode] = useState<'list' | 'spreadsheet'>('list')

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

  // 載入加班記錄
  const loadWorkLogs = useCallback(async () => {
    if (!selectedUser) return
    
    try {
      // 獲取當月的開始和結束時間
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      
      const response = await fetch(
        `/api/admin/worklogs?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}&userId=${selectedUser}&isOvertime=true`
      )
      if (response.ok) {
        const data = await response.json()
        setWorkLogs(data)
      }
    } catch (error) {
      console.error('載入加班記錄失敗:', error)
    }
  }, [currentDate, selectedUser])

  // 載入簽名記錄
  const loadSignatures = useCallback(async () => {
    if (!selectedUser) return
    
    try {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      const response = await fetch(
        `/api/admin/attendance/signatures?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}&userId=${selectedUser}`
      )
      if (response.ok) {
        const data = await response.json()
        setSignatures(data)
      }
    } catch (error) {
      console.error('載入簽名記錄失敗:', error)
    }
  }, [currentDate, selectedUser])

  useEffect(() => {
    loadUserData()
    loadWorkLogs()
    loadSignatures()
  }, [loadUserData, loadWorkLogs, loadSignatures])

  // 按日期分組工作記錄
  const groupWorkLogsByDate = useCallback(() => {
    const grouped: Record<string, WorkLog[]> = {}
    workLogs.forEach(log => {
      const date = format(parseISO(log.startTime), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(log)
    })
    return grouped
  }, [workLogs])

  // 獲取指定日期的簽名記錄
  const getDateSignatures = useCallback((date: string) => {
    return signatures.filter(sig => sig.date === date)
  }, [signatures])

  // 切換日期選擇
  const toggleDateSelection = useCallback((date: string, hasLogs: boolean) => {
    if (!hasLogs) return
    
    setSelectedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }, [])

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
          <TrendingUp className="w-6 h-6 text-orange-400" />
          加班管理 - {selectedUserData?.name}
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
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="text-white"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'spreadsheet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('spreadsheet')}
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

      {viewMode === 'spreadsheet' ? (
        <OvertimeSpreadsheet
          workLogs={workLogs}
          signatures={signatures}
          selectedUser={selectedUserData}
          currentDate={currentDate}
          onSelectDates={(dates) => setSelectedDates(new Set(dates))}
        />
      ) : (
        <div className="space-y-4">
          {(() => {
            const monthStart = startOfMonth(currentDate)
            const monthEnd = endOfMonth(currentDate)
            const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
            const groupedLogs = groupWorkLogsByDate()

            return monthDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayName = format(day, 'EEEE', { locale: zhTW })
              const dayLogs = groupedLogs[dateKey] || []
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey
              const dateSignatures = getDateSignatures(dateKey)

              if (dayLogs.length === 0) return null

              return (
                <Card
                  key={dateKey}
                  className={`bg-white/5 backdrop-blur border-white/10 p-4 ${selectedDates.has(dateKey) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => toggleDateSelection(dateKey, dayLogs.length > 0)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <TrendingUp className={`h-5 w-5 ${isToday ? 'text-yellow-300' : 'text-orange-400'}`} />
                      <h3 className={`text-lg font-semibold ${isToday ? 'text-yellow-300' : 'text-white'}`}>
                        {format(day, 'MM/dd')} ({dayName})
                        {isToday && <span className="ml-2 text-yellow-400">今天</span>}
                      </h3>
                      <span className="text-white/60 text-sm">
                        {dayLogs.length} 筆加班記錄
                      </span>
                      {dateSignatures.length > 0 && (
                        <span className="text-green-400 text-xs bg-green-500/20 px-2 py-1 rounded-full">
                          已簽核
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 加班記錄列表 */}
                  <div className="space-y-3 mt-4">
                    {dayLogs.map(log => {
                      const startTime = format(parseISO(log.startTime), 'HH:mm')
                      const endTime = log.endTime ? format(parseISO(log.endTime), 'HH:mm') : '-'
                      
                      // 計算加班時長
                      let overtimeDuration = '-'
                      if (log.endTime) {
                        const start = new Date(log.startTime)
                        const end = new Date(log.endTime)
                        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
                        
                        if (durationMinutes >= 30) {
                          const roundedMinutes = Math.floor(durationMinutes / 30) * 30
                          const hours = Math.floor(roundedMinutes / 60)
                          const minutes = roundedMinutes % 60
                          
                          if (hours === 0) {
                            overtimeDuration = `${minutes}分鐘`
                          } else if (minutes === 0) {
                            overtimeDuration = `${hours}小時`
                          } else {
                            overtimeDuration = `${hours}小時${minutes}分鐘`
                          }
                        }
                      }

                      return (
                        <div key={log.id} className="bg-white/5 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{startTime} - {endTime}</span>
                              <span className="text-white/60">({overtimeDuration})</span>
                            </div>
                            {log.isEdited && (
                              <span className="text-orange-400 text-xs bg-orange-500/20 px-2 py-1 rounded-full">
                                已編輯
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-blue-400">{log.projectCode}</span>
                            <span className="text-white/60">{log.projectName}</span>
                          </div>
                          <div className="text-sm text-white/80">{log.content}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 簽名記錄 */}
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
            }).filter(Boolean)
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