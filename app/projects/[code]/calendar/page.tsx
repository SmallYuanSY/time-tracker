'use client'

import { useEffect, useState } from 'react'
import { format, startOfDay, endOfDay, addDays, subDays, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useParams } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

// 定義工作記錄類型
type WorkLog = {
  id: string
  userId: string
  startTime: string
  endTime: string | null
  projectCode: string
  projectName: string
  category: string
  content: string
}

// 定義使用者類型
type User = {
  id: string
  name: string
}

// 定義工作類別顏色
const categoryColors: { [key: string]: { bg: string; border: string; text: string } } = {
  default: { bg: '#1E293B', border: '#3B82F6', text: '#60A5FA' },
  meeting: { bg: '#1E1B4B', border: '#6366F1', text: '#818CF8' },
  development: { bg: '#022C22', border: '#059669', text: '#34D399' },
  design: { bg: '#2E1907', border: '#EA580C', text: '#FB923C' },
  planning: { bg: '#082F49', border: '#0EA5E9', text: '#38BDF8' },
  testing: { bg: '#2D0C1A', border: '#E11D48', text: '#FB7185' },
  documentation: { bg: '#1A2E05', border: '#65A30D', text: '#A3E635' },
  research: { bg: '#2E2100', border: '#FACC15', text: '#FDE047' }
}

export default function CalendarPage() {
  const params = useParams<{ code: string }>()
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week'>('day')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  // 過濾使用者
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 計算時間範圍
  const timeRange = {
    start: startOfDay(date),
    end: view === 'day' ? endOfDay(date) : endOfDay(addDays(date, 6))
  }

  // 載入專案成員
  const loadProjectMembers = async () => {
    if (!params?.code) return

    try {
      const response = await fetch(`/api/projects/${params.code}/users`)
      if (!response.ok) throw new Error('無法載入專案成員')
      
      const data = await response.json()
      const members = data.map((member: any) => ({
        id: member.id,
        name: member.name || '未命名成員'
      }))
      setUsers(members)
    } catch (error) {
      toast({
        title: '錯誤',
        description: '載入專案成員時發生錯誤',
        variant: 'destructive'
      })
    }
  }

  // 載入工作記錄
  const loadWorkLogs = async () => {
    if (!params?.code) return

    try {
      setLoading(true)
      const response = await fetch(`/api/worklog?projectCode=${params.code}`)
      if (!response.ok) throw new Error('無法載入工作記錄')
      
      const data = await response.json()
      
      // 整理工作記錄
      const logs = data.reduce((acc: WorkLog[], group: any) => {
        return [...acc, ...group.logs]
      }, [])
      setWorkLogs(logs)
    } catch (error) {
      toast({
        title: '錯誤',
        description: '載入工作記錄時發生錯誤',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        loadProjectMembers(),
        loadWorkLogs()
      ])
      setLoading(false)
    }
    loadData()
  }, [params?.code])

  // 工具列元件
  const Toolbar = () => (
    <Card className="p-4 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setDate(new Date())}
          >
            <Calendar className="w-4 h-4" />
            今天
          </Button>
          <div className="h-6 w-px bg-gray-700" />
          <div className="text-sm text-gray-400">
            共 {users.length} 位成員
          </div>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="搜尋成員..."
            className="px-3 py-1 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDate(d => subDays(d, view === 'day' ? 1 : 7))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>
              {format(date, view === 'day' ? 'yyyy/MM/dd' : 'yyyy/MM/dd - MM/dd', { locale: zhTW })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDate(d => addDays(d, view === 'day' ? 1 : 7))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-6 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView('day')}
              className={view === 'day' ? 'bg-gray-700' : ''}
            >
              日檢視
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView('week')}
              className={view === 'week' ? 'bg-gray-700' : ''}
            >
              週檢視
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )

  // 時間軸元件
  const Timeline = () => {
    // 生成時間刻度
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    // 過濾當前時間範圍內的工作記錄
    const filteredLogs = workLogs.filter(log => {
      const startTime = parseISO(log.startTime)
      const endTime = log.endTime ? parseISO(log.endTime) : new Date()
      return startTime >= timeRange.start && endTime <= timeRange.end
    })

    return (
      <div className="relative overflow-auto">
        {/* 時間軸標題 */}
        <div className="sticky top-0 z-10 flex bg-gray-800 border-b border-gray-700">
          <div className="w-[120px] shrink-0 p-2 border-r border-gray-700 bg-gray-800">
            <span className="text-gray-300">使用者</span>
          </div>
          <div className="flex-1 flex">
            {hours.map(hour => (
              <div
                key={hour}
                className="w-[120px] shrink-0 p-2 text-center text-sm text-gray-400 border-r border-gray-700"
              >
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>
            ))}
          </div>
        </div>

        {/* 使用者列表和工作記錄 */}
        <div className="relative">
          {filteredUsers.map(user => (
            <div key={user.id} className="flex border-b border-gray-700">
              {/* 使用者名稱 */}
              <div className="w-[120px] shrink-0 p-1 border-r border-gray-700 bg-gray-800">
                <div className="text-sm truncate text-gray-300" title={user.name}>
                  {user.name}
                </div>
              </div>

              {/* 時間格線 */}
              <div className="flex-1 flex relative min-h-[65px] bg-gray-900">
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="w-[120px] shrink-0 border-r border-gray-700"
                  />
                ))}

                {/* 工作記錄項目 */}
                {filteredLogs
                  .filter(log => log.userId === user.id)
                  .map(log => {
                    const startTime = parseISO(log.startTime)
                    const endTime = log.endTime ? parseISO(log.endTime) : new Date()
                    const startHour = startTime.getHours() + startTime.getMinutes() / 60
                    const endHour = endTime.getHours() + endTime.getMinutes() / 60
                    const duration = endHour - startHour
                    
                    const categoryColor = categoryColors[log.category.toLowerCase()] || categoryColors.default

                    return (
                      <div
                        key={log.id}
                        className="absolute rounded-lg p-2 shadow-md transition-all hover:shadow-lg"
                        style={{
                          left: `${startHour * 120}px`,
                          width: `${Math.max(duration * 120, 120)}px`,
                          backgroundColor: categoryColor.bg,
                          borderLeft: `3px solid ${categoryColor.border}`,
                          top: '8px',
                          height: 'calc(100% - 16px)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium truncate text-gray-200">
                            {log.projectName}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${categoryColor.border}22`,
                              color: categoryColor.text
                            }}
                          >
                            {log.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {log.content}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-900">
        <div className="text-gray-400">載入中...</div>
      </div>
    )
  }

  if (workLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-gray-900 text-gray-400">
        <Calendar className="w-12 h-12 mb-4 text-gray-500" />
        <div>尚無工作記錄</div>
      </div>
    )
  }

  return (
    <div className="p-4 -mx-4 min-h-[calc(100vh-8rem)] bg-gray-900">
      <Toolbar />
      <Card className="overflow-hidden border-0 h-[calc(100vh-12rem)] shadow-sm bg-gray-800 border-gray-700">
        <Timeline />
      </Card>
    </div>
  )
} 