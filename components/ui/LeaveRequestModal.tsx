"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './dialog'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Card, CardContent } from './card'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { User, FileText, CalendarIcon, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'WEB_ADMIN' | 'EMPLOYEE'
}

interface LeaveRequestModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function LeaveRequestModal({ open, onClose, onSuccess }: LeaveRequestModalProps) {
  const { data: session } = useSession()
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  // 日期選擇器定位設定
  const [datePickerPosition, setDatePickerPosition] = useState({
    startDateSide: 'bottom' as 'top' | 'bottom' | 'left' | 'right',
    startDateAlign: 'start' as 'start' | 'center' | 'end',
    endDateSide: 'bottom' as 'top' | 'bottom' | 'left' | 'right',
    endDateAlign: 'end' as 'start' | 'center' | 'end',
  })
  
  // 追蹤是否已經手動設定過位置
  const [manuallySet, setManuallySet] = useState({
    startDate: false,
    endDate: false,
  })
  
  const [formData, setFormData] = useState({
    agentId: '',
    reason: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  })

  // 載入代理人列表（排除 WEB_ADMIN 和當前用戶）
  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // 排除 WEB_ADMIN 和當前用戶
        const filteredUsers = data.filter((user: User) => 
          user.role !== 'WEB_ADMIN' && user.email !== session?.user?.email
        )
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('載入用戶失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadUsers()
      // 重置表單
      setFormData({
        agentId: '',
        reason: '',
        startDate: null,
        endDate: null,
      })
      setErrors([])
      // 重置手動設定狀態
      setManuallySet({
        startDate: false,
        endDate: false,
      })
      // 重置日期選擇器位置到預設值
      setDatePickerPosition({
        startDateSide: 'bottom',
        startDateAlign: 'start',
        endDateSide: 'bottom',
        endDateAlign: 'end',
      })
    }
  }, [open, session?.user?.email])

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.agentId) newErrors.push('請選擇代理人')
    if (!formData.reason.trim()) newErrors.push('請填寫請假原因')
    if (!formData.startDate) newErrors.push('請選擇開始時間')
    if (!formData.endDate) newErrors.push('請選擇結束時間')

    if (formData.startDate && formData.endDate) {
      const now = new Date()
      
      if (formData.startDate < now) {
        newErrors.push('開始時間不能早於現在')
      }
      
      if (formData.endDate <= formData.startDate) {
        newErrors.push('結束時間必須晚於開始時間')
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const submitData = {
        agentId: formData.agentId,
        reason: formData.reason,
        startDate: formData.startDate!.toISOString(),
        endDate: formData.endDate!.toISOString(),
      }

      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const errorText = await response.text()
        setErrors([errorText || '提交失敗，請稍後再試'])
      }
    } catch (error) {
      console.error('提交請假申請失敗:', error)
      setErrors(['提交失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAgent = users.find(user => user.id === formData.agentId)

  // 計算請假時長
  const calculateDuration = () => {
    if (!formData.startDate || !formData.endDate) return null
    
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    
    // 計算跨越的天數
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    const diffDays = Math.ceil((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    let totalWorkMinutes = 0
    
    // 逐日計算工作時間
    for (let d = 0; d < diffDays; d++) {
      const currentDay = new Date(startDay)
      currentDay.setDate(startDay.getDate() + d)
      
      // 當日的開始和結束時間
      let dayStart = new Date(currentDay)
      let dayEnd = new Date(currentDay)
      dayEnd.setHours(23, 59, 59, 999)
      
      // 如果是第一天，使用請假開始時間
      if (d === 0) {
        dayStart = new Date(start)
      }
      
      // 如果是最後一天，使用請假結束時間
      if (d === diffDays - 1) {
        dayEnd = new Date(end)
      }
      
      // 當日午休時間 12:30-13:30
      const lunchStart = new Date(currentDay)
      lunchStart.setHours(12, 30, 0, 0)
      const lunchEnd = new Date(currentDay)
      lunchEnd.setHours(13, 30, 0, 0)
      
      // 計算當日工作時間（分鐘）
      let dayWorkMinutes = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60)
      
      // 檢查是否需要扣除午休時間
      if (dayStart <= lunchStart && dayEnd >= lunchEnd) {
        // 完全包含午休時間，扣除整個1小時
        dayWorkMinutes -= 60
      } else if (dayStart < lunchEnd && dayEnd > lunchStart) {
        // 部分重疊午休時間
        const overlapStart = Math.max(dayStart.getTime(), lunchStart.getTime())
        const overlapEnd = Math.min(dayEnd.getTime(), lunchEnd.getTime())
        const overlapMinutes = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60))
        dayWorkMinutes -= overlapMinutes
      }
      
      totalWorkMinutes += Math.max(0, dayWorkMinutes)
    }
    
    const totalWorkHours = Math.round(totalWorkMinutes / 60 * 10) / 10
    
    return { days: diffDays, hours: totalWorkHours }
  }

  const duration = calculateDuration()

  // 智能檢測最佳位置的函數
  const detectBestPosition = (buttonElement: HTMLElement, preference: 'start' | 'end' = 'start') => {
    const rect = buttonElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // 檢測水平空間
    const leftSpace = rect.left
    const rightSpace = viewportWidth - rect.right
    const centerSpace = Math.min(leftSpace, rightSpace)
    
    // 檢測垂直空間
    const topSpace = rect.top
    const bottomSpace = viewportHeight - rect.bottom
    
    // 決定水平對齊
    let align: 'start' | 'center' | 'end' = preference
    if (preference === 'start' && leftSpace < 300) {
      align = rightSpace > 300 ? 'end' : 'center'
    } else if (preference === 'end' && rightSpace < 300) {
      align = leftSpace > 300 ? 'start' : 'center'
    }
    
    // 決定垂直位置
    const side: 'top' | 'bottom' = bottomSpace > 350 ? 'bottom' : 'top'
    
    return { side, align }
  }

  // 手動切換位置的函數
  const toggleDatePickerPosition = (type: 'start' | 'end', event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    // 標記為手動設定
    setManuallySet(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: true
    }))
    
    setDatePickerPosition(prev => {
      if (type === 'start') {
        const newAlign = prev.startDateAlign === 'start' ? 'center' : 
                        prev.startDateAlign === 'center' ? 'end' : 'start'
        return { ...prev, startDateAlign: newAlign }
      } else {
        const newAlign = prev.endDateAlign === 'start' ? 'center' : 
                        prev.endDateAlign === 'center' ? 'end' : 'start'
        return { ...prev, endDateAlign: newAlign }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent ref={contentRef} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            申請請假
          </DialogTitle>
          <DialogDescription>
            填寫請假申請表單，選擇代理人和請假時間範圍
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {errors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-red-800">
                  <div className="font-medium mb-1">請修正以下問題：</div>
                  <ul className="text-sm space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            {/* 代理人選擇 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                代理人 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Select 
                  value={formData.agentId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, agentId: value }))}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loading ? "載入中..." : "請選擇代理人"} />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper" 
                    side="bottom" 
                    align="start"
                    container={contentRef.current}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>{user.name}</span>
                          <span className="text-sm text-gray-500">({user.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedAgent && (
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  已選擇：{selectedAgent.name} ({selectedAgent.email})
                </div>
              )}
            </div>

            {/* 請假時間 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 開始時間 */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  開始時間 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* 開始日期 */}
                  <div className="relative">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onClick={(e) => {
                            // 只有在未手動設定時才進行智能檢測
                            if (!manuallySet.startDate) {
                              const bestPosition = detectBestPosition(e.currentTarget, 'start')
                              setDatePickerPosition(prev => ({
                                ...prev,
                                startDateSide: bestPosition.side,
                                startDateAlign: bestPosition.align
                              }))
                            }
                          }}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? format(formData.startDate, "yyyy/MM/dd", { locale: zhTW }) : "選擇日期"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 max-w-none" 
                        align={datePickerPosition.startDateAlign}
                        side={datePickerPosition.startDateSide}
                        avoidCollisions={false}
                        collisionPadding={16}
                        sideOffset={8}
                      >
                        <Calendar
                          mode="single"
                          locale={zhTW}
                          selected={formData.startDate || undefined}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date)
                              if (formData.startDate) {
                                newDate.setHours(formData.startDate.getHours())
                                newDate.setMinutes(formData.startDate.getMinutes())
                              } else {
                                newDate.setHours(9, 0) // 預設上午9點
                              }
                              setFormData(prev => ({ ...prev, startDate: newDate }))
                            }
                          }}
                          initialFocus
                          className="w-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {/* 位置切換按鈕 */}
                    <button
                      type="button"
                      onClick={(e) => toggleDatePickerPosition('start', e)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 text-white text-xs rounded-full hover:bg-blue-600 flex items-center justify-center z-10 shadow-md"
                      title="切換日期選擇器位置"
                    >
                      📍
                    </button>
                  </div>
                  
                  {/* 開始時間 */}
                  <input
                    type="time"
                    value={formData.startDate ? format(formData.startDate, "HH:mm") : "09:00"}
                    onChange={(e) => {
                      const timeParts = e.target.value.split(':')
                      if (timeParts.length >= 2) {
                        const hours = parseInt(timeParts[0], 10)
                        const minutes = parseInt(timeParts[1], 10)
                        if (!isNaN(hours) && !isNaN(minutes)) {
                          const newDate = formData.startDate ? new Date(formData.startDate) : new Date()
                          newDate.setHours(hours, minutes)
                          setFormData(prev => ({ ...prev, startDate: newDate }))
                        }
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              
              {/* 結束時間 */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  結束時間 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* 結束日期 */}
                  <div className="relative">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onClick={(e) => {
                            // 只有在未手動設定時才進行智能檢測
                            if (!manuallySet.endDate) {
                              const bestPosition = detectBestPosition(e.currentTarget, 'end')
                              setDatePickerPosition(prev => ({
                                ...prev,
                                endDateSide: bestPosition.side,
                                endDateAlign: bestPosition.align
                              }))
                            }
                          }}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? format(formData.endDate, "yyyy/MM/dd", { locale: zhTW }) : "選擇日期"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 max-w-none" 
                        align={datePickerPosition.endDateAlign}
                        side={datePickerPosition.endDateSide}
                        avoidCollisions={false}
                        collisionPadding={16}
                        sideOffset={8}
                      >
                        <Calendar
                          mode="single"
                          locale={zhTW}
                          selected={formData.endDate || undefined}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date)
                              if (formData.endDate) {
                                newDate.setHours(formData.endDate.getHours())
                                newDate.setMinutes(formData.endDate.getMinutes())
                              } else {
                                newDate.setHours(18, 0) // 預設下午6點
                              }
                              setFormData(prev => ({ ...prev, endDate: newDate }))
                            }
                          }}
                          initialFocus
                          className="w-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {/* 位置切換按鈕 */}
                    <button
                      type="button"
                      onClick={(e) => toggleDatePickerPosition('end', e)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 text-white text-xs rounded-full hover:bg-blue-600 flex items-center justify-center z-10 shadow-md"
                      title="切換日期選擇器位置"
                    >
                      📍
                    </button>
                  </div>
                  
                  {/* 結束時間 */}
                  <input
                    type="time"
                    value={formData.endDate ? format(formData.endDate, "HH:mm") : "18:00"}
                    onChange={(e) => {
                      const timeParts = e.target.value.split(':')
                      if (timeParts.length >= 2) {
                        const hours = parseInt(timeParts[0], 10)
                        const minutes = parseInt(timeParts[1], 10)
                        if (!isNaN(hours) && !isNaN(minutes)) {
                          const newDate = formData.endDate ? new Date(formData.endDate) : new Date()
                          newDate.setHours(hours, minutes)
                          setFormData(prev => ({ ...prev, endDate: newDate }))
                        }
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* 時長顯示 */}
            {duration && (
              <Card className="border-blue-500/30 bg-blue-500/10 dark:border-blue-400/30 dark:bg-blue-400/10">
                <CardContent className="px-4" style={{ paddingTop: '5px', paddingBottom: '5px' }}>
                  <div className="flex items-center gap-2 text-gray-200">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">請假時長：</span>
                    <span className="font-semibold">{duration.days} 天 ({duration.hours} 小時)</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 請假原因 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                請假原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="請詳細說明請假原因..."
                className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>
          </div>

          {/* 按鈕區域 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.agentId || !formData.reason.trim() || !formData.startDate || !formData.endDate}
              className="min-w-[100px]"
            >
              {isSubmitting ? '提交中...' : '提交申請'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 