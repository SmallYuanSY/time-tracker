'use client'

import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimeRangePicker } from '@/components/ui/date-time-range-picker'
import WorkLogList from '@/components/worklog/WorkLogList'
import { useState, useEffect } from 'react'
import { workCategories } from '@/lib/data/workCategories'
import { addMonths, startOfDay, endOfDay } from 'date-fns'

interface ProjectUser {
  id: string
  name: string | null
  email: string
}

export default function ProjectWorklogPage() {
  const params = useParams() as { code: string }
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([])
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    startOfDay(addMonths(new Date(), -1)), // 預設顯示最近一個月
    endOfDay(new Date())
  ])

  // 載入專案成員
  useEffect(() => {
    const loadProjectUsers = async () => {
      try {
        const response = await fetch(`/api/projects/${params.code}/users`)
        if (!response.ok) throw new Error('載入專案成員失敗')
        const data = await response.json()
        setProjectUsers(data)
      } catch (error) {
        console.error('載入專案成員失敗:', error)
      }
    }

    loadProjectUsers()
  }, [params.code])

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">工作紀錄</h1>
            <p className="text-muted-foreground mt-1">檢視此專案的工作紀錄</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="選擇工作類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部類型</SelectItem>
                {workCategories.map(category => (
                  <SelectItem key={category.id} value={category.content}>
                    <div className="flex items-center gap-2">
                      {category.icon && <span>{category.icon}</span>}
                      <span>{category.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="選擇員工" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部員工</SelectItem>
                {projectUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end">
          <DateTimeRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      <Card className="p-6">
        <WorkLogList 
          projectCode={params.code}
          category={selectedCategory === 'all' ? undefined : selectedCategory}
          userId={selectedUserId === 'all' ? undefined : selectedUserId}
          from={dateRange[0]?.toISOString()}
          to={dateRange[1]?.toISOString()}
        />
      </Card>
    </>
  )
} 