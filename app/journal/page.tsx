"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Copy, FileText, Download, Calendar, Clock, ListTodo } from 'lucide-react'
import ClockRecordList from '@/components/worklog/ClockRecordList'
import ScheduledWorkList from '@/components/worklog/ScheduledWorkList'

interface WorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  startTime: string
  endTime: string | null
  createdAt: string
}

export default function JournalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [weeklyLogs, setWeeklyLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<'worklog' | 'clock'>('worklog')
  const [worklogSubTab, setWorklogSubTab] = useState<'actual' | 'scheduled'>('actual')
  const [isTransitioning, setIsTransitioning] = useState(false)

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // 獲取本週工作紀錄
  useEffect(() => {
    if (!session?.user) return

    const fetchWeeklyLogs = async () => {
      try {
        setLoading(true)
        const userId = (session.user as any).id
        
        // 計算本週的開始和結束日期
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // 週一開始
        const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
        
        // 將日期轉換為 ISO 字串格式
        const startISO = weekStart.toISOString()
        const endISO = weekEnd.toISOString()
        
        const response = await fetch(`/api/worklog?userId=${userId}&from=${startISO}&to=${endISO}`)
        
        if (response.ok) {
          const data = await response.json()
          // 按日期和時間排序
          const sortedLogs = data.sort((a: WorkLog, b: WorkLog) => {
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          })
          setWeeklyLogs(sortedLogs)
        }
      } catch (error) {
        console.error('獲取工作紀錄失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklyLogs()
  }, [session, currentWeek])



  // 處理工作記錄子標籤切換的動畫
  const handleWorklogSubTabChange = async (newTab: 'actual' | 'scheduled') => {
    if (newTab === worklogSubTab) return
    
    setIsTransitioning(true)
    
    // 淡出動畫
    await new Promise(resolve => setTimeout(resolve, 150))
    
    // 切換標籤
    setWorklogSubTab(newTab)
    
    // 淡入動畫
    await new Promise(resolve => setTimeout(resolve, 150))
    setIsTransitioning(false)
  }

  // 計算工作時數
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

  // 按日期分組工作紀錄
  const groupLogsByDate = () => {
    const grouped: { [key: string]: WorkLog[] } = {}
    
    weeklyLogs.forEach(log => {
      const date = format(parseISO(log.startTime), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(log)
    })
    
    return grouped
  }

  // 生成複製用的文字內容
  const generateCopyText = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const groupedLogs = groupLogsByDate()
    
    let copyText = `工作週報 (${format(weekStart, 'yyyy/MM/dd')} - ${format(weekEnd, 'yyyy/MM/dd')})\n\n`
    
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayName = format(day, 'EEEE', { locale: zhTW })
      const dayLogs = groupedLogs[dateKey] || []
      
      copyText += `${format(day, 'MM/dd')} (${dayName})\n`
      
      if (dayLogs.length === 0) {
        copyText += '　無工作紀錄\n'
      } else {
        dayLogs.forEach(log => {
          const startTime = format(parseISO(log.startTime), 'HH:mm')
          const duration = calculateDuration(log.startTime, log.endTime)
          copyText += `　${startTime} | ${log.projectCode} | ${log.projectName} | ${log.category} | ${duration}\n`
          copyText += `　　${log.content}\n`
        })
      }
      copyText += '\n'
    })
    
    return copyText
  }

  // 生成 Word 表格格式
  const generateWordTableText = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const groupedLogs = groupLogsByDate()
    
    let tableText = `日期\t時間\t專案代碼\t專案名稱\t工作分類\t工作內容\t工作時數\n`
    
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayName = format(day, 'EEEE', { locale: zhTW })
      const dayLogs = groupedLogs[dateKey] || []
      
      if (dayLogs.length === 0) {
        tableText += `${format(day, 'MM/dd')} (${dayName})\t\t\t\t\t無工作紀錄\t\n`
      } else {
        dayLogs.forEach((log, index) => {
          const startTime = format(parseISO(log.startTime), 'HH:mm')
          const duration = calculateDuration(log.startTime, log.endTime)
          const dateCell = index === 0 ? `${format(day, 'MM/dd')} (${dayName})` : ''
          
          tableText += `${dateCell}\t${startTime}\t${log.projectCode}\t${log.projectName}\t${log.category}\t${log.content}\t${duration}\n`
        })
      }
    })
    
    return tableText
  }

  // 生成單日表格格式（不含標題列和日期，不含工作分類和時數）
  const generateDayTableText = (day: Date, dayLogs: WorkLog[]) => {
    let tableText = ``
    
    if (dayLogs.length === 0) {
      tableText += `\t\t\t無工作紀錄\n`
    } else {
      dayLogs.forEach((log, index) => {
        const startTime = format(parseISO(log.startTime), 'HH:mm')
        const endTime = log.endTime ? format(parseISO(log.endTime), 'HH:mm') : '進行中'
        const timeRange = `${startTime}～${endTime}`
        
        tableText += `${log.projectCode}\t${log.projectName}\t${timeRange}\t${log.content}\n`
      })
    }
    
    return tableText
  }

  // 複製功能
  const handleCopy = async (format: 'text' | 'table') => {
    try {
      const textToCopy = format === 'text' ? generateCopyText() : generateWordTableText()
      await navigator.clipboard.writeText(textToCopy)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('複製失敗:', error)
      alert('複製失敗，請重試')
    }
  }

  // 單日複製功能
  const handleDayCopy = async (day: Date, dayLogs: WorkLog[]) => {
    try {
      const textToCopy = generateDayTableText(day, dayLogs)
      await navigator.clipboard.writeText(textToCopy)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('複製失敗:', error)
      alert('複製失敗，請重試')
    }
  }

  // 週導航
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    if (direction === 'prev') {
      newWeek.setDate(newWeek.getDate() - 7)
    } else {
      newWeek.setDate(newWeek.getDate() + 7)
    }
    setCurrentWeek(newWeek)
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-white text-lg">載入中...</div>
        </div>
      </DashboardLayout>
    )
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const groupedLogs = groupLogsByDate()

  return (
    <DashboardLayout>
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 頁面標題 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-white" />
              <h1 className="text-3xl font-bold text-white">工作日誌</h1>
            </div>
            
            {/* 標籤頁切換 */}
            <div className="flex bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('worklog')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'worklog'
                    ? 'bg-blue-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4" />
                工作記錄
              </button>
              <button
                onClick={() => setActiveTab('clock')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'clock'
                    ? 'bg-green-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Clock className="w-4 h-4" />
                打卡記錄
              </button>
            </div>
          </div>

          {/* 內容區域 */}
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
            <div className="p-6">
                            {activeTab === 'worklog' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-semibold text-white">
                        📋 {worklogSubTab === 'actual' ? '本週工作紀錄' : '預定工作項目'}
                      </h2>
                      {worklogSubTab === 'actual' && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => navigateWeek('prev')}
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            ← 上週
                          </Button>
                          <span className="text-white/80 text-sm px-3">
                            {format(weekStart, 'yyyy/MM/dd')} - {format(weekEnd, 'yyyy/MM/dd')}
                          </span>
                          <Button
                            onClick={() => navigateWeek('next')}
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            下週 →
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      {worklogSubTab === 'actual' && copySuccess && (
                        <div className="bg-green-500/20 border border-green-400/30 rounded-lg px-3 py-2 text-green-200 text-sm">
                          ✅ 已複製到剪貼板
                        </div>
                      )}
                      {worklogSubTab === 'actual' && (
                        <>
                          <Button
                            onClick={() => handleCopy('text')}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            複製週報
                          </Button>
                          <Button
                            onClick={() => handleCopy('table')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            複製表格
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 工作記錄子標籤切換 */}
                  <div className="flex justify-center mb-6">
                    <div className="flex bg-white/10 rounded-lg p-1">
                      <button
                        onClick={() => handleWorklogSubTabChange('actual')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                          worklogSubTab === 'actual'
                            ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        實際工作記錄
                      </button>
                      <button
                        onClick={() => handleWorklogSubTabChange('scheduled')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                          worklogSubTab === 'scheduled'
                            ? 'bg-purple-500 text-white shadow-lg transform scale-105'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <ListTodo className="w-4 h-4" />
                        預定工作項目
                      </button>
                    </div>
                  </div>

                                {/* 工作紀錄內容區域 - 帶動畫效果 */}
                  <div className={`transition-all duration-300 ease-in-out ${
                    isTransitioning 
                      ? 'opacity-0 transform translate-y-4' 
                      : 'opacity-100 transform translate-y-0'
                  }`}>
                    {worklogSubTab === 'actual' ? (
                      /* 實際工作記錄 */
                      <>
                        <div className="space-y-4">
                          {weekDays.map(day => {
                            const dateKey = format(day, 'yyyy-MM-dd')
                            const dayName = format(day, 'EEEE', { locale: zhTW })
                            const dayLogs = groupedLogs[dateKey] || []
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
                                  <Button
                                    onClick={() => handleDayCopy(day, dayLogs)}
                                    variant="outline"
                                    size="sm"
                                    className="border-white/20 text-white hover:bg-white/10 text-xs"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    複製當日
                                  </Button>
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
                                          </div>
                                        </Card>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {weeklyLogs.length === 0 && !loading && (
                          <div className="text-center text-white/60 py-12">
                            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">本週尚無工作紀錄</h3>
                            <p className="text-sm">開始記錄您的工作，建立專業的工作日誌</p>
                          </div>
                        )}
                      </>
                    ) : (
                      /* 預定工作項目 */
                      <div className="space-y-4">
                        <ScheduledWorkList />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* 打卡記錄內容 */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-semibold text-white">🕒 本週打卡記錄</h2>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => navigateWeek('prev')}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          ← 上週
                        </Button>
                        <span className="text-white/80 text-sm px-3">
                          {format(weekStart, 'yyyy/MM/dd')} - {format(weekEnd, 'yyyy/MM/dd')}
                        </span>
                        <Button
                          onClick={() => navigateWeek('next')}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          下週 →
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 打卡記錄列表 */}
                  {session?.user && (
                    <ClockRecordList 
                      userId={(session.user as any).id} 
                      currentWeek={currentWeek}
                    />
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 