'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { WeekCalendar } from '@/components/ui/WeekCalendar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { addWeeks, subWeeks, format } from 'date-fns'
import MultiCategorySelector from '@/components/ui/MultiCategorySelector'
import { useToast } from '@/components/ui/use-toast'

interface ProjectUser {
  id: string
  name: string | null
  email: string
  role?: string
  assignedAt?: Date
}

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

export default function ProjectCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [users, setUsers] = useState<ProjectUser[]>([])
  const [workLogs, setWorkLogs] = useState<UserWorkLogs[]>([])
  const { code } = useParams() as { code: string }
  const { toast } = useToast()

  const handlePrevWeek = () => {
    setCurrentDate(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentDate(prev => addWeeks(prev, 1))
  }

  const handleDateSelect = (date: Date, hour: number) => {
    // TODO: 實作選擇時間格的功能
    console.log('Selected:', { date, hour, user: selectedUser, categories: selectedCategories })
  }

  // 載入專案成員
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`/api/projects/${code}/users`)
        if (!response.ok) throw new Error('Failed to fetch users')
        const data = await response.json()
        setUsers(data)
      } catch (error) {
        toast({
          title: '錯誤',
          description: '無法載入專案成員',
          variant: 'destructive'
        })
      }
    }
    fetchUsers()
  }, [code, toast])

  // 載入工作紀錄
  useEffect(() => {
    const fetchWorkLogs = async () => {
      try {
        const from = new Date(currentDate)
        from.setDate(from.getDate() - from.getDay()) // 取得當週週日
        from.setHours(0, 0, 0, 0)

        const to = new Date(from)
        to.setDate(to.getDate() + 7) // 到下週週日
        to.setHours(23, 59, 59, 999)

        const params = new URLSearchParams({
          projectCode: code,
          from: from.toISOString(),
          to: to.toISOString()
        })

        if (selectedUser !== 'all') {
          params.append('userId', selectedUser)
        }

        if (selectedCategories.length > 0) {
          params.append('category', selectedCategories.join(','))
        }

        const response = await fetch(`/api/worklog?${params}`)
        if (!response.ok) throw new Error('Failed to fetch work logs')
        const data = await response.json()
        setWorkLogs(data)
      } catch (error) {
        toast({
          title: '錯誤',
          description: '無法載入工作紀錄',
          variant: 'destructive'
        })
      }
    }
    fetchWorkLogs()
  }, [code, currentDate, selectedUser, selectedCategories, toast])

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* 使用者選擇 */}
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <Users className="mr-2 h-4 w-4" />
              <SelectValue placeholder="全部成員" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部成員</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 工作類型選擇 */}
          <MultiCategorySelector
            value={selectedCategories}
            onChange={setSelectedCategories}
          />

          {/* 週次切換 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[100px] text-center">
              {format(currentDate, 'yyyy/MM/dd')}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <WeekCalendar
          currentDate={currentDate}
          onDateSelect={handleDateSelect}
          workLogs={workLogs}
        />
      </Card>
    </>
  )
} 