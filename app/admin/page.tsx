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
  User, Briefcase, Activity, FileText, Edit3, Check, CheckSquare, Square, Shield, FileSpreadsheet
} from 'lucide-react'
import AttendanceSpreadsheet from '@/components/ui/AttendanceSpreadsheet'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const WorkLogsPage = dynamic(() => import('./worklogs/page'), { ssr: false })
const AttendancePage = dynamic(() => import('./attendance/page'), { ssr: false })
const OvertimePage = dynamic(() => import('./overtime/page'), { ssr: false })

interface User {
  id: string
  email: string
  name: string | null
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
  isOvertime?: boolean
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
type AttendanceViewMode = 'list' | 'spreadsheet'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedUserIndex, setSelectedUserIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('worklogs')
  const [attendanceViewMode, setAttendanceViewMode] = useState<AttendanceViewMode>('list')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [currentModule, setCurrentModule] = useState<'worklogs' | 'attendance' | 'overtime'>('worklogs')
  
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
    
    // 對每個日期的工作記錄進行降序排序
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
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
  const filteredWorkLogs = workLogs
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) // 按時間降序排序
    .filter(log => 
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

        {/* 模組選擇 */}
        <div className="grid grid-cols-3 gap-4">
          <Card 
            className={`bg-white/5 backdrop-blur border-white/10 p-6 cursor-pointer transition-all hover:bg-white/10 ${currentModule === 'worklogs' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setCurrentModule('worklogs')}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">工作記錄</h2>
            </div>
            <p className="text-white/60 mt-2">查看和管理員工的工作記錄</p>
          </Card>

          <Card 
            className={`bg-white/5 backdrop-blur border-white/10 p-6 cursor-pointer transition-all hover:bg-white/10 ${currentModule === 'attendance' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setCurrentModule('attendance')}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">考勤記錄</h2>
            </div>
            <p className="text-white/60 mt-2">管理打卡記錄和簽核</p>
          </Card>

          <Card 
            className={`bg-white/5 backdrop-blur border-white/10 p-6 cursor-pointer transition-all hover:bg-white/10 ${currentModule === 'overtime' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setCurrentModule('overtime')}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">加班管理</h2>
            </div>
            <p className="text-white/60 mt-2">管理和審核加班申請</p>
          </Card>
        </div>

        {/* 內容區域 */}
        <Card className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
          <div className="p-6">
            {currentModule === 'worklogs' && (
              <div key="worklogs">
                <WorkLogsPage
                  selectedUser={selectedUser}
                  currentDate={currentDate}
                  searchTerm={searchTerm}
                />
              </div>
            )}
            {currentModule === 'attendance' && (
              <div key="attendance">
                <AttendancePage
                  selectedUser={selectedUser}
                  currentDate={currentDate}
                  searchTerm={searchTerm}
                />
              </div>
            )}
            {currentModule === 'overtime' && (
              <div key="overtime">
                <OvertimePage
                  selectedUser={selectedUser}
                  currentDate={currentDate}
                  searchTerm={searchTerm}
                />
              </div>
            )}
          </div>
        </Card>
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