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
import { GripVertical, Clock, CheckCircle, Circle, Edit, Trash2, Play } from "lucide-react"
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
}

// 可排序的工作項目組件
function SortableWorkItem({ 
  work, 
  onEdit, 
  onDelete, 
  onToggleComplete,
  onStartWork 
}: { 
  work: ScheduledWork
  onEdit: (work: ScheduledWork) => void
  onDelete: (id: string) => void
  onToggleComplete: (id: string, isCompleted: boolean) => void
  onStartWork: (work: ScheduledWork) => void
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

  const priorityColor = work.priority <= 2 ? "bg-red-100/10 border-red-300/30" :
                       work.priority <= 5 ? "bg-yellow-100/10 border-yellow-300/30" :
                       "bg-green-100/10 border-green-300/30"

  const completedStyle = work.isCompleted ? "opacity-60" : ""

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${priorityColor} ${completedStyle}`}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing text-white/50 hover:text-white/80 transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 完成狀態切換 */}
      <button
        onClick={() => onToggleComplete(work.id, !work.isCompleted)}
        className="text-white/70 hover:text-white transition-colors"
      >
        {work.isCompleted ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </button>

      {/* 工作類型指示器 */}
      <div className={`w-3 h-3 rounded-full ${work.workType === 'URGENT' ? 'bg-orange-400' : 'bg-blue-400'}`}></div>

      {/* 工作內容 */}
      <div className="flex-1 grid grid-cols-5 gap-2">
        <div className={`px-2 py-1 rounded bg-white/20 text-white text-center text-sm ${work.isCompleted ? 'line-through' : ''}`}>
          {work.projectCode}
        </div>
        <div className={`px-2 py-1 rounded bg-white/20 text-white text-center text-sm ${work.isCompleted ? 'line-through' : ''}`}>
          {work.projectName}
        </div>
        <div className={`px-2 py-1 rounded text-center text-sm flex items-center justify-center gap-1 ${work.isCompleted ? 'line-through' : ''}`}>
          {(() => {
            const category = getWorkCategoryByContent(work.category)
            if (category) {
              return (
                <>
                  <div className={`w-2 h-2 rounded-full ${category.color.accent}`}></div>
                  <span className={category.color.text}>{category.icon || ''} {category.title}</span>
                </>
              )
            }
            return <span className="text-white">{work.category}</span>
          })()}
        </div>
        <div className="px-2 py-1 rounded bg-white/20 text-white text-center text-sm flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" />
          {format(parseISO(work.scheduledStartDate), "MM/dd")} - {format(parseISO(work.scheduledEndDate), "MM/dd")}
        </div>
        <div className={`px-2 py-1 rounded text-center text-xs ${work.workType === 'URGENT' ? 'bg-orange-500/30 text-orange-200' : 'bg-blue-500/30 text-blue-200'}`}>
          {work.workType === 'URGENT' ? '🔥 臨時' : '📅 預定'}
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2">
        {!work.isCompleted && (
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-blue-100 text-black px-3 py-1 text-xs rounded hover:bg-blue-200"
            onClick={() => onStartWork(work)}
          >
            <Play className="w-3 h-3 mr-1" />
            開始
          </Button>
        )}
        <Button 
          variant="secondary" 
          size="sm"
          className="bg-yellow-100 text-black px-3 py-1 text-xs rounded hover:bg-yellow-200"
          onClick={() => onEdit(work)}
        >
          <Edit className="w-3 h-3" />
        </Button>
        <Button 
          variant="destructive" 
          size="sm"
          className="px-3 py-1 text-xs rounded bg-red-500 hover:bg-red-600 text-white"
          onClick={() => onDelete(work.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  )
}

export default function ScheduledWorkList({ 
  onRefresh, 
  onEdit, 
  onWorksLoaded,
  onStartWork 
}: ScheduledWorkListProps) {
  const { data: session } = useSession()
  const [works, setWorks] = useState<ScheduledWork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [today, setToday] = useState<string>("")
  const [isClient, setIsClient] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'SCHEDULED' | 'URGENT'>('ALL')

  // 設置 dnd-kit 傳感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 確保在客戶端才初始化日期
  useEffect(() => {
    setIsClient(true)
    setToday(new Date().toISOString().split("T")[0])
  }, [])

  const loadScheduledWorks = useCallback(async () => {
    if (!session?.user || !today) return

    try {
      setLoading(true)
      setError(null)

      // 獲取所有預定工作，然後在本地篩選前後一週
      const response = await fetch('/api/scheduled-work')

      if (!response.ok) {
        throw new Error('獲取預定工作失敗')
      }

      const allWorks = await response.json()
      
      // 計算前後一週的日期範圍
      const todayDate = new Date(today)
      const oneWeekBefore = subDays(todayDate, 7)
      const oneWeekAfter = addDays(todayDate, 7)
      
      // 篩選前後一週的工作
      const filteredWorks = allWorks.filter((work: ScheduledWork) => {
        const workStartDate = new Date(work.scheduledStartDate)
        const workEndDate = new Date(work.scheduledEndDate)
        
        // 檢查工作的時間範圍是否與前後一週有重疊
        return isWithinInterval(workStartDate, { start: oneWeekBefore, end: oneWeekAfter }) ||
               isWithinInterval(workEndDate, { start: oneWeekBefore, end: oneWeekAfter }) ||
               (workStartDate <= oneWeekBefore && workEndDate >= oneWeekAfter)
      })
      
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
  }, [session, today, onWorksLoaded])

  useEffect(() => {
    if (!session?.user || !isClient || !today) {
      setLoading(false)
      return
    }

    loadScheduledWorks()
  }, [session, today, isClient])

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
    if (!today) return ''
    const todayDate = new Date(today)
    const oneWeekBefore = subDays(todayDate, 7)
    const oneWeekAfter = addDays(todayDate, 7)
    return `${format(oneWeekBefore, 'MM/dd')} - ${format(oneWeekAfter, 'MM/dd')}`
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
    if (!today) return ''
    const todayDate = new Date(today)
    const oneWeekBefore = subDays(todayDate, 7)
    const oneWeekAfter = addDays(todayDate, 7)
    return `${format(oneWeekBefore, 'MM/dd')} - ${format(oneWeekAfter, 'MM/dd')}`
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
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
} 