"use client"

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import DashboardLayout from '@/components/layouts/DashboardLayout'
import WorkTimeSettings from './WorkTimeSettings'

interface Holiday {
  id: string
  date: string
  name: string
  type: string
  isHoliday: boolean
  description?: string | null
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function HolidaysPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const { toast } = useToast()

  // 載入指定月份的假日資料
  const loadHolidays = async (date: Date) => {
    try {
      setLoading(true)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const response = await fetch(`/api/admin/holidays?year=${year}&month=${month}`)
      if (response.ok) {
        const data = await response.json()
        setHolidays(data)
      }
    } catch (error) {
      console.error('載入假日資料失敗:', error)
      toast({
        title: "錯誤",
        description: "載入假日資料失敗",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 初始載入
  useEffect(() => {
    loadHolidays(currentDate)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 處理月份變更
  const handlePrevMonth = () => {
    const newDate = subMonths(currentDate, 1)
    setCurrentDate(newDate)
    loadHolidays(newDate)
  }

  const handleNextMonth = () => {
    const newDate = addMonths(currentDate, 1)
    setCurrentDate(newDate)
    loadHolidays(newDate)
  }

  // 處理日期點擊
  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const holiday = holidays.find(h => h.date === dateStr)
    setEditingHoliday(holiday || {
      id: '',
      date: dateStr,
      name: '',
      type: 'REGULAR',
      isHoliday: true,
      description: ''
    })
    setShowDialog(true)
  }

  // 儲存假日資料
  const handleSaveHoliday = async (formData: FormData) => {
    try {
      setLoading(true)
      const data = {
        date: formData.get('date'),
        name: formData.get('name'),
        type: formData.get('type'),
        isHoliday: formData.get('isHoliday') === 'true',
        description: formData.get('description')
      }

      const response = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "假日資料已儲存"
        })
        setShowDialog(false)
        loadHolidays(currentDate)
      } else {
        throw new Error('儲存失敗')
      }
    } catch (error) {
      console.error('儲存假日資料失敗:', error)
      toast({
        title: "錯誤",
        description: "儲存假日資料失敗",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 刪除假日
  const handleDeleteHoliday = async (date: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/holidays?date=${date}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "假日已刪除"
        })
        setShowDialog(false)
        loadHolidays(currentDate)
      } else {
        throw new Error('刪除失敗')
      }
    } catch (error) {
      console.error('刪除假日失敗:', error)
      toast({
        title: "錯誤",
        description: "刪除假日失敗",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 計算日曆資料
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // 計算日曆網格需要的前後填充天數
  const startWeekday = monthStart.getDay()
  const endWeekday = monthEnd.getDay()
  const prefixDays = Array(startWeekday).fill(null)
  const suffixDays = Array(6 - endWeekday).fill(null)

  // 獲取日期的樣式
  const getDateStyles = (date: Date) => {
    const holiday = holidays.find(h => isSameDay(parseISO(h.date), date))
    
    let className = "h-32 p-3 border border-white/10 transition-colors relative group hover:bg-white/5"
    
    if (!isSameMonth(date, currentDate)) {
      className += " opacity-50"
    }
    
    if (isToday(date)) {
      className += " bg-blue-500/20"
    }
    
    if (holiday) {
      if (holiday.type === 'WEEKEND') {
        className += " bg-purple-500/20 hover:bg-purple-500/30"  // 週末假日是紫色
      } else if (holiday.isHoliday) {
        className += " bg-red-500/20 hover:bg-red-500/30"  // 一般假日是紅色
      } else {
        className += " bg-yellow-500/20 hover:bg-yellow-500/30"  // 補班日是黃色
      }
    }
    
    return className
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <WorkTimeSettings />
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <CalendarIcon className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl font-semibold text-white">假日管理</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    setLoading(true)
                    const response = await fetch('/api/admin/holidays/import-tw', {
                      method: 'POST'
                    })
                    if (response.ok) {
                      const data = await response.json()
                      toast({
                        title: "成功",
                        description: `已匯入 ${data.count} 筆台灣假日資料`
                      })
                      loadHolidays(currentDate)
                    } else {
                      throw new Error('匯入失敗')
                    }
                  } catch (error) {
                    console.error('匯入台灣假日失敗:', error)
                    toast({
                      title: "錯誤",
                      description: "匯入台灣假日失敗",
                      variant: "destructive"
                    })
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                匯入台灣假日
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-lg font-medium min-w-[120px] text-center">
                {format(currentDate, 'yyyy年M月', { locale: zhTW })}
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-6">
            <div className="space-y-6">
              <div className="grid grid-cols-7 gap-px bg-white/10 rounded-lg overflow-hidden">
                {/* 星期標題 */}
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={day}
                    className={`p-2 text-center font-medium bg-white/5 ${
                      i === 0 || i === 6 ? 'text-red-400' : 'text-white/80'
                    }`}
                  >
                    {day}
                  </div>
                ))}
                
                {/* 日期網格 */}
                {[...prefixDays, ...monthDays, ...suffixDays].map((date, i) => {
                  if (!date) {
                    return <div key={`empty-${i}`} className="h-32 bg-white/5" />
                  }

                  const holiday = holidays.find(h => isSameDay(parseISO(h.date), date))

                  return (
                    <div
                      key={date.toISOString()}
                      className={getDateStyles(date)}
                      onClick={() => handleDateClick(date)}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-sm ${isToday(date) ? 'font-bold text-blue-400' : ''}`}>
                          {format(date, 'd')}
                        </span>
                      </div>
                      {holiday && (
                        <div className="mt-2">
                          <div className="text-sm font-medium">{holiday.name}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-6">
                <div className="text-sm text-white/60">圖例：</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-500/20" />
                    <span className="text-sm text-white/80">週末</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500/20" />
                    <span className="text-sm text-white/80">國定假日</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500/20" />
                    <span className="text-sm text-white/80">補班日</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 側邊欄 */}
            <div className="space-y-4">
              <div className="rounded-lg bg-white/5 p-4">
                <h2 className="text-lg font-medium mb-4">本月假日一覽</h2>
                <div className="space-y-4">
                  {holidays
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(holiday => (
                      <div
                        key={holiday.date}
                        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => {
                          setEditingHoliday(holiday)
                          setShowDialog(true)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{format(parseISO(holiday.date), 'M/d')}</div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            holiday.type === 'WEEKEND'
                              ? 'bg-purple-500/20 text-purple-200'
                              : holiday.isHoliday
                              ? 'bg-red-500/20 text-red-200'
                              : 'bg-yellow-500/20 text-yellow-200'
                          }`}>
                            {holiday.type === 'WEEKEND' ? '週末' : holiday.isHoliday ? '假日' : '補班'}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-sm font-medium">{holiday.name}</div>
                          {holiday.description && (
                            <div className="text-xs text-white/60 mt-1">{holiday.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  {holidays.length === 0 && (
                    <div className="text-sm text-white/60 text-center py-4">
                      本月尚無假日資料
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday?.id ? '編輯假日' : '新增假日'}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSaveHoliday} className="space-y-4">
            <input type="hidden" name="date" value={editingHoliday?.date} />
            
            <div className="space-y-2">
              <label className="text-sm text-white/60">名稱</label>
              <Input
                name="name"
                defaultValue={editingHoliday?.name}
                placeholder="例：元旦"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60">類型</label>
              <Select name="type" defaultValue={editingHoliday?.type || 'REGULAR'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">一般假日</SelectItem>
                  <SelectItem value="WEEKEND">週末</SelectItem>
                  <SelectItem value="SPECIAL">特殊假日</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60">是否放假</label>
              <Select name="isHoliday" defaultValue={editingHoliday?.isHoliday ? 'true' : 'false'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">是</SelectItem>
                  <SelectItem value="false">否（補班日）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60">描述</label>
              <Textarea
                name="description"
                defaultValue={editingHoliday?.description || ''}
                placeholder="輸入假日描述..."
              />
            </div>

            <div className="flex justify-end gap-2">
              {editingHoliday?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteHoliday(editingHoliday.date)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '刪除'}
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '儲存'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
} 