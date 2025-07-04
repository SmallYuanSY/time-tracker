"use client"

import { format } from 'date-fns'
import { User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { workLogCacheManager } from '@/lib/cache/worklog'
import { WorkLog } from '@/lib/types/worklog'

interface WorkLogGroup {
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
  logs: WorkLog[]
}

interface WorkLogListProps {
  onRefresh?: () => void
  onEdit?: (log: WorkLog) => void
  onLogsLoaded?: (logs: WorkLog[]) => void
  mode?: 'all' | 'today' | 'date'
  date?: string
  projectCode?: string
  category?: string
  from?: string
  to?: string
  userId?: string
}

export default function WorkLogList({
  onRefresh,
  onEdit,
  onLogsLoaded,
  mode = 'all',
  date,
  projectCode,
  category,
  from,
  to,
  userId
}: WorkLogListProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<WorkLog[]>([])

  const loadWorkLogs = async (useCache = true) => {
    try {
      setLoading(true)
      setError(null)

      // 如果允許使用快取且有快取資料，先使用快取
      if (useCache && !projectCode) { // 專案視圖不使用快取
        const cache = workLogCacheManager.getCache()
        if (cache) {
          let filteredLogs = cache.logs
          if (projectCode) {
            filteredLogs = filteredLogs.filter(log => log.projectCode === projectCode)
          }
          if (category) {
            filteredLogs = filteredLogs.filter(log => log.category === category)
          }
          if (userId) {
            filteredLogs = filteredLogs.filter(log => log.userId === userId)
          }
          if (from && to) {
            filteredLogs = filteredLogs.filter(log => {
              const logDate = new Date(log.startTime)
              return logDate >= new Date(from) && logDate <= new Date(to)
            })
          }
          setLogs(filteredLogs)
          setLoading(false)
          
          // 通知父元件
          if (onLogsLoaded) {
            onLogsLoaded(filteredLogs)
          }
        }
      }

      // 構建 API 請求 URL
      let url = '/api/worklog'
      const params = new URLSearchParams()
      
      // 只有在沒有專案代碼時才加入使用者 ID
      if (!projectCode && session?.user) {
        params.append('userId', (session.user as any).id)
      }

      if (projectCode) {
        params.append('projectCode', projectCode)
      }

      if (category) {
        params.append('category', category)
      }

      if (userId) {
        params.append('userId', userId)
      }

      if (from) {
        params.append('from', from)
      }

      if (to) {
        params.append('to', to)
      }

      if (mode === 'today') {
        params.append('date', new Date().toISOString().split('T')[0])
      } else if (mode === 'date' && date) {
        params.append('date', date)
      }

      url = `${url}?${params.toString()}`

      // 發送 API 請求
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('載入工作紀錄失敗')
      }

      const data: WorkLogGroup[] = await response.json()
      
      // 將分組資料轉換為單一陣列
      const flattenedLogs = data.flatMap(group => 
        group.logs.map(log => ({
          ...log,
          user: group.user
        }))
      )

      // 只有在非專案視圖時才更新快取
      if (!projectCode && flattenedLogs.length > 0) {
        const cache = {
          lastUpdated: new Date().toISOString(),
          logs: flattenedLogs
        }
        workLogCacheManager.setCache(cache)
      }

      // 更新狀態
      setLogs(flattenedLogs)
      setLoading(false)

      // 通知父元件
      if (onLogsLoaded) {
        onLogsLoaded(flattenedLogs)
      }
    } catch (error) {
      console.error('載入工作紀錄失敗:', error)
      setError('載入工作紀錄失敗')
      setLoading(false)
    }
  }

  // 初始載入
  useEffect(() => {
    loadWorkLogs()
  }, [session, mode, date, projectCode, category, from, to, userId])

  // 處理編輯
  const handleEdit = (log: WorkLog) => {
    if (onEdit) {
      onEdit(log)
    }
  }

  // 處理重新整理
  const handleRefresh = () => {
    loadWorkLogs(false) // 強制重新載入，不使用快取
    if (onRefresh) {
      onRefresh()
    }
  }

  if (loading) {
    return <div className="text-center py-8">載入中...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
        <button
          onClick={handleRefresh}
          className="ml-2 text-blue-500 hover:underline"
        >
          重試
        </button>
      </div>
    )
  }

  if (!logs.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        尚無工作紀錄
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {logs.map(log => (
        <div
          key={log.id}
          className="p-4 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-lg text-foreground">
                {log.projectName} ({log.projectCode})
              </h3>
              <p className="text-muted-foreground mt-1">{log.content}</p>
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <div>
                  <span className="font-medium">
                    {format(new Date(log.startTime), 'M月d日')}
                  </span>
                  <span className="mx-2">
                    {format(new Date(log.startTime), 'HH:mm')}
                    {log.endTime && (
                      <>
                        <span> - </span>
                        <span>{format(new Date(log.endTime), 'HH:mm')}</span>
                      </>
                    )}
                  </span>
                  <span className="text-muted-foreground/70">{log.category}</span>
                </div>
                {projectCode && log.user && (
                  <div className="flex items-center gap-2 text-muted-foreground/70">
                    <User className="w-4 h-4" />
                    <span>{log.user.name || log.user.email}</span>
                  </div>
                )}
              </div>
            </div>
            {(!projectCode || (session?.user as any)?.id === log.userId) && (
              <button
                onClick={() => handleEdit(log)}
                className="text-primary hover:text-primary/80"
              >
                編輯
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 