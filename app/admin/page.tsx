"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import WorkTimeStatsCard from '@/components/ui/WorkTimeStatsCard'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { 
  Users, Calendar, Clock, TrendingUp, BarChart3, 
  Download, Filter, Search, Eye, ChevronLeft, ChevronRight,
  User, Briefcase, Activity, FileText, Edit3, Check, CheckSquare, Square, Shield
} from 'lucide-react'

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
  isEdited?: boolean
  editReason?: string
  editedAt?: string
  editedBy?: string
  editIpAddress?: string
  user: {
    id: string
    name: string
    email: string
  }
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

type ViewMode = 'worklogs' | 'attendance'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedUserIndex, setSelectedUserIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('worklogs')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  
  // 數據狀態
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([])
  const [signatures, setSignatures] = useState<AttendanceSignature[]>([])
  
  // 簽名相關狀態
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [showSignModal, setShowSignModal] = useState(false)
  const [signPassword, setSignPassword] = useState('')
  const [signNote, setSignNote] = useState('')
  const [signErrors, setSignErrors] = useState<string[]>([])
  const [isSigningAttendance, setIsSigningAttendance] = useState(false)

  // 根據視圖模式決定時間範圍
  const timeRange = viewMode === 'worklogs' ? 'week' : 'month'

  // 權限檢查
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    const checkAdminRole = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (!response.ok) {
          alert('權限檢查失敗')
          router.push('/')
          return
        }
        
        if (!data.user || (data.user.role !== 'ADMIN' && data.user.role !== 'WEB_ADMIN')) {
          alert('權限不足，只有管理員可以查看此頁面')
          router.push('/')
          return
        }
        
        setLoading(false)
      } catch (error) {
        console.error('檢查權限失敗:', error)
        alert('檢查權限失敗')
        router.push('/')
      }
    }

    checkAdminRole()
  }, [session, status, router])

  // 載入用戶列表
  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        // 預設選擇第一個用戶
        if (data.length > 0 && !selectedUser) {
          setSelectedUser(data[0].id)
          setSelectedUserIndex(0)
        }
      }
    } catch (error) {
      console.error('載入用戶列表失敗:', error)
    }
  }, [selectedUser])

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

  useEffect(() => {
    if (!loading) {
      loadUsers()
    }
  }, [loading, loadUsers])

  useEffect(() => {
    if (!loading && selectedUser) {
      if (viewMode === 'worklogs') {
        loadWorkLogs()
      } else if (viewMode === 'attendance') {
        loadClockRecords()
        loadSignatures()
      }
    }
  }, [loading, selectedUser, viewMode, currentDate, loadWorkLogs, loadClockRecords, loadSignatures])

  // 導航日期
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (timeRange === 'week') {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7))
      } else {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      }
      return newDate
    })
  }

  // 用戶導航
  const navigateUser = (direction: 'prev' | 'next') => {
    if (users.length === 0) return
    
    let newIndex = selectedUserIndex
    if (direction === 'next') {
      newIndex = (selectedUserIndex + 1) % users.length
    } else {
      newIndex = selectedUserIndex === 0 ? users.length - 1 : selectedUserIndex - 1
    }
    
    setSelectedUserIndex(newIndex)
    setSelectedUser(users[newIndex].id)
  }

  // 計算工作時數
  const calculateWorkHours = (startTime: string, endTime: string | null) => {
    if (!endTime) return 0
    const start = new Date(startTime)
    const end = new Date(endTime)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }

  // 計算工作時長文字
  const calculateDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return '進行中'
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60))
      return `${diffMinutes}分鐘`
    }
    
    return `${diffHours.toFixed(1)}小時`
  }

  // 按日期分組工作記錄
  const groupWorkLogsByDate = () => {
    const grouped: { [key: string]: WorkLog[] } = {}
    
    workLogs.forEach(log => {
      const date = format(parseISO(log.startTime), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(log)
    })
    
    return grouped
  }

  // 按日期分組打卡記錄
  const groupClockRecordsByDate = () => {
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

  // 簽名相關功能
  const toggleDateSelection = (dateKey: string, hasRecords: boolean) => {
    if (!hasRecords) return // 沒有記錄的日期不能選擇
    if (isDateSignedByCurrentUser(dateKey)) return // 當前用戶已簽名的日期不能選擇
    
    const newSelected = new Set(selectedDates)
    if (newSelected.has(dateKey)) {
      newSelected.delete(dateKey)
    } else {
      newSelected.add(dateKey)
    }
    setSelectedDates(newSelected)
  }

  const isDateSignedByCurrentUser = (dateKey: string) => {
    return signatures.some(sig => sig.date === dateKey && sig.signedBy === (session?.user as any)?.id)
  }

  const getDateSignatures = (dateKey: string) => {
    return signatures.filter(sig => sig.date === dateKey)
  }

  const hasAnySignature = (dateKey: string) => {
    return signatures.some(sig => sig.date === dateKey)
  }

  const handleSignAttendance = async () => {
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
        const errorText = await response.text()
        throw new Error(errorText || '簽名失敗')
      }

      // 重新載入簽名記錄
      await loadSignatures()
      
      // 清空選擇和密碼
      setSelectedDates(new Set())
      setSignPassword('')
      setSignNote('')
      setShowSignModal(false)
      
      alert(`成功簽名 ${selectedDates.size} 個日期的考勤記錄`)
    } catch (error) {
      setSignErrors([error instanceof Error ? error.message : '簽名失敗，請稍後再試'])
    } finally {
      setIsSigningAttendance(false)
    }
  }

  // 篩選記錄
  const filteredWorkLogs = workLogs.filter(log => 
    searchTerm === '' || 
    log.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredClockRecords = clockRecords.filter(record =>
    searchTerm === '' ||
    record.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">載入中...</div>
        </div>
      </DashboardLayout>
    )
  }

  const timeRangeText = timeRange === 'week' 
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MM/dd', { locale: zhTW })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MM/dd', { locale: zhTW })}`
    : format(currentDate, 'yyyy年MM月', { locale: zhTW })

  const selectedUserObj = users.find(u => u.id === selectedUser)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">管理員控制台</h1>
            <p className="text-white/60 mt-1">員工工作報告與數據分析</p>
          </div>
        </div>

        {/* 篩選器 */}
        <Card className="bg-white/5 backdrop-blur border-white/10">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* 視圖模式 */}
              <div className="flex bg-white/10 rounded-lg p-1">
                {[
                  { value: 'worklogs', label: '工作記錄', icon: FileText },
                  { value: 'attendance', label: '考勤記錄', icon: Clock },
                ].map((mode) => {
                  const Icon = mode.icon
                  return (
                    <Button
                      key={mode.value}
                      variant={viewMode === mode.value ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode(mode.value as ViewMode)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {mode.label}
                    </Button>
                  )
                })}
              </div>

              {/* 用戶選擇器 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateUser('prev')}
                  disabled={users.length <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value)
                    const index = users.findIndex(u => u.id === e.target.value)
                    setSelectedUserIndex(index)
                  }}
                  className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm min-w-[150px]"
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id} className="bg-gray-800">
                      {user.name || user.email} {user.role !== 'EMPLOYEE' && `(${user.role})`}
                    </option>
                  ))}
                </select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateUser('next')}
                  disabled={users.length <= 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* 時間範圍 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-3 py-1 bg-white/10 rounded text-white text-sm min-w-[120px] text-center">
                  {timeRangeText}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* 搜尋 */}
              <div className="flex items-center gap-2 ml-auto">
                <Search className="w-4 h-4 text-white/60" />
                <input
                  type="text"
                  placeholder="搜尋..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm placeholder:text-white/60"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 內容區域 */}
        <Card className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
          <div className="p-6">
            {viewMode === 'worklogs' ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                    📋 工作記錄 - {selectedUserObj?.name || selectedUserObj?.email}
                  </h2>
                </div>

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
                            <div className="space-y-2 ml-8">
                              {dayLogs.map(log => {
                                const startTime = format(parseISO(log.startTime), 'HH:mm')
                                const duration = calculateDuration(log.startTime, log.endTime)
                                
                                return (
                                  <Card key={log.id} className="bg-white/5 backdrop-blur border border-white/10 p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
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
                                          {log.isEdited && (
                                            <span className="text-orange-400 text-xs bg-orange-500/20 px-2 py-1 rounded-full">
                                              已編輯
                                            </span>
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
                                          {log.editedAt && (
                                            <div className="text-orange-300/60 text-xs">
                                              修改於: {format(parseISO(log.editedAt), 'MM/dd HH:mm')}
                                            </div>
                                          )}
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

                {filteredWorkLogs.length === 0 && (
                  <div className="text-center text-white/60 py-12">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">本週尚無工作紀錄</h3>
                    <p className="text-sm">此用戶在選定期間內沒有工作記錄</p>
                  </div>
                )}
              </>
            ) : (
              <>
                                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                     🕒 考勤記錄 - {selectedUserObj?.name || selectedUserObj?.email}
                   </h2>
                   
                   {/* 簽名操作按鈕 */}
                   <div className="flex items-center gap-3">
                     {selectedDates.size > 0 && (
                       <div className="text-white/70 text-sm">
                         已選擇 {selectedDates.size} 個日期
                       </div>
                     )}
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
                      const hasRecords = dayRecords.length > 0
                      const isSignedByMe = isDateSignedByCurrentUser(dateKey)
                      const allSignatures = getDateSignatures(dateKey)
                      const hasSignatures = hasAnySignature(dateKey)
                      const isSelected = selectedDates.has(dateKey)

                      return (
                        <div key={dateKey} className={`border-l-4 pl-4 ${
                          hasSignatures ? 'border-blue-400/70' : 
                          hasRecords ? 'border-green-400/50' : 'border-gray-500/30'
                        } ${isSelected ? 'bg-blue-500/10' : ''}`}>
                          <div className={`flex items-center justify-between mb-3 ${isToday ? 'text-yellow-300' : 'text-white'}`}>
                            <div className="flex items-center gap-3">
                              {/* 勾選框 - 有打卡記錄且當前用戶未簽名可以勾選 */}
                              {hasRecords && !isSignedByMe && (
                                <button
                                  onClick={() => toggleDateSelection(dateKey, hasRecords)}
                                  className="text-white hover:text-blue-400 transition-colors"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-blue-400" />
                                  ) : (
                                    <Square className="w-5 h-5" />
                                  )}
                                </button>
                              )}
                              
                              <Calendar className={`h-5 w-5 ${
                                hasSignatures ? 'text-blue-400' :
                                hasRecords ? 'text-green-400' : 'text-gray-500'
                              }`} />
                              <h3 className="text-lg font-semibold">
                                {format(day, 'MM/dd')} ({dayName})
                                {isToday && <span className="ml-2 text-yellow-400">今天</span>}
                              </h3>
                              <span className="text-white/60 text-sm">
                                {hasRecords ? `${dayRecords.length} 次打卡` : '無打卡記錄'}
                              </span>
                              
                              {/* 多重簽名狀態 */}
                              {hasSignatures && allSignatures.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                                    <Shield className="w-3 h-3" />
                                    <span>{allSignatures.length} 位主管已簽名</span>
                                  </div>
                                  {/* 簽名詳情（懸停顯示） */}
                                  <div className="group relative">
                                    <button className="text-blue-400 hover:text-blue-300">
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <div className="absolute left-0 top-6 z-10 hidden group-hover:block bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-white min-w-[250px] max-w-[400px]">
                                      <div className="space-y-2">
                                        {allSignatures.map((sig, index) => (
                                          <div key={sig.id} className="border-b border-gray-700 last:border-b-0 pb-2 last:pb-0">
                                            <div className="flex justify-between items-center">
                                              <span className="font-medium text-blue-300">{sig.signerName}</span>
                                              <span className="text-gray-400">{format(parseISO(sig.signedAt), 'MM/dd HH:mm')}</span>
                                            </div>
                                            {sig.note && (
                                              <div className="mt-1 text-gray-300 text-xs">
                                                <span className="text-gray-500">備註：</span>
                                                {sig.note}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="ml-8">
                            {hasRecords ? (() => {
                              // 分析當日打卡記錄
                              const workRecords = dayRecords.filter(r => r.type === 'IN' || r.type === 'OUT')
                              const workStart = workRecords.find(r => r.type === 'IN')
                              const workEnd = workRecords.filter(r => r.type === 'OUT').pop() // 最後一次下班
                              
                              // 計算總工作時間
                              let totalWorkTime = '無記錄'
                              if (workStart && workEnd) {
                                const diffMs = new Date(workEnd.timestamp).getTime() - new Date(workStart.timestamp).getTime()
                                const totalMinutes = diffMs / (1000 * 60)
                                const hours = Math.floor(totalMinutes / 60)
                                const minutes = Math.round(totalMinutes % 60)
                                
                                if (hours === 0) {
                                  totalWorkTime = `${minutes}分`
                                } else {
                                  totalWorkTime = minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`
                                }
                              }

                              return (
                                <Card className="bg-white/5 backdrop-blur border border-white/10 p-4">
                                  {/* 打卡記錄摘要 - 左右排列 */}
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    {/* 上班時間 */}
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-full bg-green-500/20">
                                        <Clock className="w-3 h-3 text-green-400" />
                                      </div>
                                      <div>
                                        <div className="text-white/60 text-xs">上班</div>
                                        <div className="text-white font-mono text-sm">
                                          {workStart 
                                            ? format(parseISO(workStart.timestamp), 'HH:mm')
                                            : '--:--'
                                          }
                                        </div>
                                        {workStart?.isEdited && (
                                          <div className="text-orange-400 text-xs">已編輯</div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* 下班時間 */}
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-full bg-red-500/20">
                                        <Clock className="w-3 h-3 text-red-400" />
                                      </div>
                                      <div>
                                        <div className="text-white/60 text-xs">下班</div>
                                        <div className="text-white font-mono text-sm">
                                          {workEnd 
                                            ? format(parseISO(workEnd.timestamp), 'HH:mm')
                                            : '--:--'
                                          }
                                        </div>
                                        {workEnd?.isEdited && (
                                          <div className="text-orange-400 text-xs">已編輯</div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* 工作時長 */}
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-full bg-blue-500/20">
                                        <Clock className="w-3 h-3 text-blue-400" />
                                      </div>
                                      <div>
                                        <div className="text-white/60 text-xs">時長</div>
                                        <div className="text-white font-mono text-sm">
                                          {totalWorkTime}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* 打卡次數 */}
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-full bg-purple-500/20">
                                        <Clock className="w-3 h-3 text-purple-400" />
                                      </div>
                                      <div>
                                        <div className="text-white/60 text-xs">次數</div>
                                        <div className="text-white font-mono text-sm">
                                          {dayRecords.length} 次
                                        </div>
                                      </div>
                                    </div>
                                  </div>

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
                                        <div key={record.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                          <div className={`p-2 rounded-full ${
                                            record.type === 'IN' 
                                              ? 'bg-green-500/20 text-green-400' 
                                              : 'bg-red-500/20 text-red-400'
                                          }`}>
                                            {record.type === 'IN' ? '上' : '下'}
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
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                </Card>
                              )
                            })() : (
                              <div className="text-white/50 text-center py-6 bg-gray-500/10 rounded-lg border border-gray-500/20">
                                <Clock className="h-12 w-12 mx-auto mb-2 text-gray-500" />
                                <div className="text-gray-400">當日無打卡記錄</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>

                {filteredClockRecords.length === 0 && (
                  <div className="text-center text-white/60 py-12">
                    <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">本月尚無考勤記錄</h3>
                    <p className="text-sm">此用戶在選定期間內沒有打卡記錄</p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* 工作時長統計 - 只在考勤模式下顯示 */}
        {viewMode === 'attendance' && selectedUser && (
          <Card className="bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-lg border border-white/20">
            <CardContent className="p-6">
              <WorkTimeStatsCard 
                userId={selectedUser}
                timeRange="month"
                currentDate={currentDate}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* 簽名確認彈窗 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              數位簽名確認
            </h2>

            {signErrors.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30">
                <ul className="text-sm space-y-1">
                  {signErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {/* 選擇的日期摘要 */}
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm text-white/60 mb-2">將要簽名的日期：</div>
                <div className="space-y-2">
                  {Array.from(selectedDates).sort().map(dateKey => {
                    const dateSignatures = getDateSignatures(dateKey)
                    return (
                      <div key={dateKey} className="bg-white/5 rounded-lg p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-300 font-medium">
                            {format(new Date(dateKey), 'MM/dd (EEEE)', { locale: zhTW })}
                          </span>
                          {dateSignatures.length > 0 && (
                            <span className="text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                              已有 {dateSignatures.length} 位主管簽名
                            </span>
                          )}
                        </div>
                        {dateSignatures.length > 0 && (
                          <div className="mt-1 text-xs text-white/60">
                            已簽名：{dateSignatures.map(sig => sig.signerName).join('、')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 用戶資訊 */}
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm text-white/60 mb-1">員工</div>
                <div className="text-white font-medium">
                  {selectedUserObj?.name || selectedUserObj?.email}
                </div>
              </div>

              {/* 簽名備註 */}
              <div className="space-y-2">
                <label className="text-sm text-white font-medium block">
                  簽名備註 (選填)
                </label>
                <textarea
                  rows={2}
                  value={signNote}
                  onChange={(e) => setSignNote(e.target.value)}
                  placeholder="您可以添加簽名備註，例如：考勤記錄無異常、已確認工時..."
                  className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>

              {/* 密碼輸入 */}
              <div className="space-y-2">
                <label className="text-sm text-white font-medium block">
                  管理員密碼 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={signPassword}
                  onChange={(e) => setSignPassword(e.target.value)}
                  placeholder="請輸入您的登入密碼以進行數位簽名"
                  className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400"
                />
                <div className="text-xs text-white/60 space-y-1">
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
              >
                取消
              </Button>
              <Button
                onClick={handleSignAttendance}
                disabled={isSigningAttendance || !signPassword.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSigningAttendance ? '簽名中...' : '確認簽名'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
} 