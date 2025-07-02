"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { format, parseISO, addDays, subDays, isWithinInterval } from "date-fns"
import { useSession } from "next-auth/react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Clock, CheckCircle, Circle, Edit, Trash2, Play, Copy } from "lucide-react"
import { getWorkCategoryByContent } from '@/lib/data/workCategories'

interface ScheduledWork {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  priority: number
  isCompleted: boolean
  workType: 'SCHEDULED' | 'URGENT'
  scheduledStartDate: string
  scheduledEndDate: string
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    name: string
    code: string
  } | null
  user?: {
    id: string
    name: string
    email: string
  } | null
}

interface ScheduledWorkListProps {
  onRefresh?: (refreshFn: () => Promise<void>) => void
  onEdit?: (work: ScheduledWork) => void
  onWorksLoaded?: (works: ScheduledWork[]) => void
  onStartWork?: (work: ScheduledWork) => void
  onCopy?: (work: ScheduledWork) => void
  mode?: 'week' | 'all'
  currentWeek?: Date
}

// 可排序的工作項目組件
function SortableWorkItem({ 
  work, 
  onEdit, 
  onDelete, 
  onToggleComplete,
  onStartWork,
  onCopy 
}: { 
  work: ScheduledWork
  onEdit: (work: ScheduledWork) => void
  onDelete: (id: string) => void
  onToggleComplete: (id: string, isCompleted: boolean) => void
  onStartWork: (work: ScheduledWork) => void
  onCopy?: (work: ScheduledWork) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: work.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priorityColor = 
    work.priority === 1 ? "from-red-500/20 to-red-400/25 border-red-400/40" :      // 最高
    work.priority === 2 ? "from-orange-500/20 to-orange-400/25 border-orange-400/40" :  // 高
    work.priority === 3 ? "from-yellow-500/20 to-yellow-400/25 border-yellow-400/40" :  // 中高
    work.priority === 4 ? "from-green-500/20 to-green-400/25 border-green-400/40" :     // 中等
    work.priority === 5 ? "from-blue-500/20 to-blue-400/25 border-blue-400/40" :        // 普通
    "from-slate-500/20 to-slate-400/25 border-slate-400/40"                             // 低

  const completedStyle = work.isCompleted ? "opacity-60" : ""

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`group hover:shadow-lg transition-all duration-200 bg-gradient-to-r ${priorityColor} backdrop-blur border rounded-2xl overflow-hidden ${completedStyle}`}
    >
      <div className="flex items-center p-4">
        {/* 左側：拖拽手柄和狀態 */}
        <div className="flex items-center gap-3 mr-4">
          {/* 拖拽手柄 */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing text-white/40 hover:text-white/70 transition-colors p-1 rounded hover:bg-white/10"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* 完成狀態切換 */}
          <button
            onClick={() => onToggleComplete(work.id, !work.isCompleted)}
            className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          >
            {work.isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 中間：主要內容 */}
        <div className="flex-1 min-w-0">
          {/* 第一行：專案資訊和類型 */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${
                work.workType === 'URGENT' 
                  ? 'from-orange-500/20 to-red-500/20 text-orange-200 border border-orange-500/30' 
                  : 'from-blue-500/20 to-purple-500/20 text-blue-200 border border-blue-500/30'
              } ${work.isCompleted ? 'line-through opacity-60' : ''}`}>
                {work.projectCode}
              </span>
              <span className={`text-white font-semibold truncate ${work.isCompleted ? 'line-through opacity-60' : ''}`}>
                {work.projectName}
              </span>
            </div>
            
            <div className={`text-xs px-2 py-1 rounded-full ${
              work.workType === 'URGENT' 
                ? 'bg-orange-500/30 text-orange-200' 
                : 'bg-blue-500/30 text-blue-200'
            }`}>
              {work.workType === 'URGENT' ? '🔥 臨時' : '📅 預定'}
            </div>
          </div>

          {/* 第二行：工作內容 */}
          <div className={`text-white/80 text-sm mb-2 ${work.isCompleted ? 'line-through opacity-60' : ''}`} 
               style={{ 
                 display: '-webkit-box',
                 WebkitLineClamp: 2,
                 WebkitBoxOrient: 'vertical',
                 overflow: 'hidden'
               }}>
            {work.content}
          </div>

          {/* 第三行：分類和時間 */}
          <div className="flex items-center gap-4 text-xs text-white/60">
            <div className="flex items-center gap-2">
              {(() => {
                const category = getWorkCategoryByContent(work.category)
                if (category) {
                  return (
                    <>
                      <span className={category.color.text}>{category.icon || ''} {category.title}</span>
                    </>
                  )
                }
                return (
                  <>
                    <span className="text-white/60">{work.category}</span>
                  </>
                )
              })()}
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{format(parseISO(work.scheduledStartDate), "MM/dd")} - {format(parseISO(work.scheduledEndDate), "MM/dd")}</span>
            </div>
          </div>
        </div>

        {/* 右側：操作按鈕 */}
        <div className="flex items-center gap-2 ml-4">
          {!work.isCompleted && (
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-200 border border-green-500/30 hover:from-green-500/30 hover:to-blue-500/30 px-3 py-2 text-xs rounded-lg transition-all"
              onClick={() => onStartWork(work)}
            >
              <Play className="w-3 h-3 mr-1" />
              開始
            </Button>
          )}
          {work.isCompleted && onCopy && (
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-200 border border-purple-500/30 hover:from-purple-500/30 hover:to-blue-500/30 px-3 py-2 text-xs rounded-lg transition-all"
              onClick={() => onCopy(work)}
            >
              <Copy className="w-3 h-3 mr-1" />
              複製
            </Button>
          )}
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-200 border border-yellow-500/30 hover:from-yellow-500/30 hover:to-orange-500/30 px-3 py-2 text-xs rounded-lg transition-all"
            onClick={() => onEdit(work)}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            className="bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-200 border border-red-500/30 hover:from-red-500/30 hover:to-pink-500/30 px-3 py-2 text-xs rounded-lg transition-all"
            onClick={() => onDelete(work.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default function ScheduledWorkList({ 
  onRefresh, 
  onEdit, 
  onWorksLoaded,
  onStartWork,
  onCopy,
  mode = 'all',
  currentWeek
}: ScheduledWorkListProps) {
  const { data: session } = useSession()
  const [works, setWorks] = useState<ScheduledWork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'SCHEDULED' | 'URGENT'>('ALL')

  // 設置 dnd-kit 傳感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 確保在客戶端才初始化
  useEffect(() => {
    setIsClient(true)
  }, [])

  const loadScheduledWorks = useCallback(async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      // 獲取所有預定工作
      const response = await fetch('/api/scheduled-work')

      if (!response.ok) {
        throw new Error('獲取預定工作失敗')
      }

      const allWorks = await response.json()
      
      let filteredWorks = allWorks
      
      // 根據模式篩選數據
      if (mode === 'week' && currentWeek) {
        // 計算週範圍
        const weekStart = new Date(currentWeek)
        weekStart.setDate(currentWeek.getDate() - currentWeek.getDay() + 1) // 週一
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // 週日
        
        // 篩選本週相關的工作
        filteredWorks = allWorks.filter((work: ScheduledWork) => {
          const workStartDate = new Date(work.scheduledStartDate)
          const workEndDate = new Date(work.scheduledEndDate)
          
          // 檢查工作的時間範圍是否與本週有重疊
          return isWithinInterval(workStartDate, { start: weekStart, end: weekEnd }) ||
                 isWithinInterval(workEndDate, { start: weekStart, end: weekEnd }) ||
                 (workStartDate <= weekStart && workEndDate >= weekEnd)
              })
      }
        
      setWorks(filteredWorks)
      if (onWorksLoaded) {
        onWorksLoaded(filteredWorks)
      }
    } catch (error) {
      console.error('獲取預定工作失敗:', error)
      setError(error instanceof Error ? error.message : '獲取預定工作失敗')
      setWorks([])
    } finally {
      setLoading(false)
    }
  }, [session, mode, currentWeek, onWorksLoaded])

  useEffect(() => {
    if (!session?.user || !isClient) {
      setLoading(false)
      return
    }

    loadScheduledWorks()
  }, [session, isClient, loadScheduledWorks])

  // 將 loadScheduledWorks 函數傳遞給父元件
  useEffect(() => {
    if (onRefresh) {
      onRefresh(loadScheduledWorks)
    }
  }, [onRefresh, loadScheduledWorks])

  // 處理拖拽結束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = works.findIndex((work) => work.id === active.id)
      const newIndex = works.findIndex((work) => work.id === over.id)

      const newWorks = arrayMove(works, oldIndex, newIndex)
      setWorks(newWorks)

      // 更新服務器端的排序
      try {
        const reorderData = newWorks.map((work, index) => ({
          id: work.id,
          priority: index,
        }))

        const response = await fetch('/api/scheduled-work', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'reorder',
            items: reorderData,
          }),
        })

        if (!response.ok) {
          throw new Error('更新排序失敗')
        }

        setMessage('排序已更新')
        setTimeout(() => setMessage(null), 2000)
      } catch (error) {
        console.error('更新排序失敗:', error)
        setError('更新排序失敗')
        setTimeout(() => setError(null), 3000)
        // 恢復原始順序
        setWorks(works)
      }
    }
  }

  // 切換完成狀態
  const handleToggleComplete = async (id: string, isCompleted: boolean) => {
    try {
      const response = await fetch('/api/scheduled-work', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isCompleted,
        }),
      })

      if (!response.ok) {
        throw new Error('更新狀態失敗')
      }

      // 更新本地狀態
      setWorks(prev => prev.map(work => 
        work.id === id ? { ...work, isCompleted } : work
      ))

      setMessage(isCompleted ? '已標記為完成' : '已標記為未完成')
      setTimeout(() => setMessage(null), 2000)
    } catch (error) {
      console.error('更新狀態失敗:', error)
      setError('更新狀態失敗')
      setTimeout(() => setError(null), 3000)
    }
  }

  // 刪除工作
  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個預定工作嗎？')) return

    try {
      const response = await fetch(`/api/scheduled-work?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('刪除失敗')
      }

      setWorks(prev => prev.filter(work => work.id !== id))
      setMessage('預定工作已刪除')
      setTimeout(() => setMessage(null), 2000)
    } catch (error) {
      console.error('刪除失敗:', error)
      setError('刪除失敗')
      setTimeout(() => setError(null), 3000)
    }
  }

  // 開始工作（轉換為工作記錄）
  const handleStartWork = (work: ScheduledWork) => {
    if (onStartWork) {
      onStartWork(work)
    }
  }

  const handleEdit = (work: ScheduledWork) => {
    if (onEdit) {
      onEdit(work)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/60">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">錯誤：{error}</div>
      </div>
    )
  }

  // 計算並格式化日期範圍（為空狀態使用）
  const getDateRangeTextForEmpty = () => {
    if (mode === 'week' && currentWeek) {
      const weekStart = new Date(currentWeek)
      weekStart.setDate(currentWeek.getDate() - currentWeek.getDay() + 1) // 週一
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // 週日
      return `${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`
    }
    return '所有時間'
  }

  if (works.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">📅 預定工作</h2>
            <p className="text-white/60 text-sm mt-1">顯示範圍：{getDateRangeTextForEmpty()}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm">0 項工作</span>
          </div>
        </div>

        {message && (
          <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-3 text-green-100 text-center">
            {message}
          </div>
        )}
        <div className="flex items-center justify-center py-8">
          <div className="text-white/60">此期間尚無預定工作</div>
        </div>
      </div>
    )
  }

  // 篩選工作
  const filteredWorks = works.filter(work => {
    if (filter === 'ALL') return true
    return work.workType === filter
  })

  const urgentCount = works.filter(w => w.workType === 'URGENT').length
  const scheduledCount = works.filter(w => w.workType === 'SCHEDULED').length

  // 計算並格式化日期範圍
  const getDateRangeText = () => {
    if (mode === 'week' && currentWeek) {
      const weekStart = new Date(currentWeek)
      weekStart.setDate(currentWeek.getDate() - currentWeek.getDay() + 1) // 週一
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // 週日
      return `${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`
    }
    return '所有時間'
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">📅 預定工作</h2>
          <p className="text-white/60 text-sm mt-1">顯示範圍：{getDateRangeText()}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">{works.length} 項工作</span>
        </div>
      </div>

      {message && (
        <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-3 text-green-100 text-center">
          {message}
        </div>
      )}

      {/* 篩選器 */}
      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'ALL' 
              ? 'bg-white/20 text-white' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          全部 ({works.length})
        </button>
        <button
          onClick={() => setFilter('URGENT')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            filter === 'URGENT' 
              ? 'bg-orange-500/30 text-orange-200' 
              : 'bg-white/5 text-white/60 hover:bg-orange-500/20'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-orange-400"></div>
          臨時工作 ({urgentCount})
        </button>
        <button
          onClick={() => setFilter('SCHEDULED')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            filter === 'SCHEDULED' 
              ? 'bg-blue-500/30 text-blue-200' 
              : 'bg-white/5 text-white/60 hover:bg-blue-500/20'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          預定工作 ({scheduledCount})
        </button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filteredWorks.map(w => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {filteredWorks.length === 0 ? (
              <div className="text-center text-white/60 py-8">
                {filter === 'ALL' ? '此期間尚無預定工作' : 
                 filter === 'URGENT' ? '此期間尚無臨時工作' : '此期間尚無預定工作'}
              </div>
            ) : (
              filteredWorks.map((work) => (
                <SortableWorkItem
                  key={work.id}
                  work={work}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                  onStartWork={handleStartWork}
                  onCopy={onCopy}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
} 