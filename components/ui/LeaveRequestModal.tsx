"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleTimePicker } from '@/components/ui/simple-time-picker'
import { CalendarIcon, User, FileText } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
}

interface LeaveRequestModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function LeaveRequestModal({ open, onClose, onSuccess }: LeaveRequestModalProps) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    agentId: '',
    reason: '',
    startDate: undefined as Date | undefined,
    startTime: '09:00',
    endDate: undefined as Date | undefined,
    endTime: '18:00',
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadUsers()
      // 重置表單
      setFormData({
        agentId: '',
        reason: '',
        startDate: undefined,
        startTime: '09:00',
        endDate: undefined,
        endTime: '18:00',
      })
      setErrors([])
    }
  }, [open])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // 過濾掉當前用戶和 WEB_ADMIN（WEB_ADMIN 不參與業務流程）
        const filteredUsers = data.filter((user: any) => 
          user.email !== session?.user?.email && user.role !== 'WEB_ADMIN'
        )
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('載入用戶失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.agentId) newErrors.push('請選擇代理人')
    if (!formData.reason.trim()) newErrors.push('請填寫請假原因')
    if (!formData.startDate) newErrors.push('請選擇開始日期')
    if (!formData.endDate) newErrors.push('請選擇結束日期')

    if (formData.startDate && formData.endDate) {
      // 合併日期和時間
      const [startHour, startMinute] = formData.startTime.split(':').map(Number)
      const [endHour, endMinute] = formData.endTime.split(':').map(Number)
      
      const startDateTime = new Date(formData.startDate)
      startDateTime.setHours(startHour, startMinute, 0, 0)
      
      const endDateTime = new Date(formData.endDate)
      endDateTime.setHours(endHour, endMinute, 0, 0)
      
      if (startDateTime >= endDateTime) {
        newErrors.push('結束時間必須晚於開始時間')
      }
      
      if (startDateTime.getTime() < new Date().getTime()) {
        newErrors.push('開始時間不能早於現在')
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // 合併日期和時間
      const [startHour, startMinute] = formData.startTime.split(':').map(Number)
      const [endHour, endMinute] = formData.endTime.split(':').map(Number)
      
      const startDateTime = new Date(formData.startDate!)
      startDateTime.setHours(startHour, startMinute, 0, 0)
      
      const endDateTime = new Date(formData.endDate!)
      endDateTime.setHours(endHour, endMinute, 0, 0)

      const submitData = {
        agentId: formData.agentId,
        reason: formData.reason,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📝 申請請假
          </DialogTitle>
        </DialogHeader>

        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30">
            <ul className="text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          {/* 代理人選擇 */}
          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              代理人 *
            </label>
            <Select value={formData.agentId} onValueChange={(value) => handleChange('agentId', value)}>
              <SelectTrigger className="w-full min-h-[2.5rem]">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-white/60 flex-shrink-0" />
                  <SelectValue 
                    placeholder={loading ? "載入中..." : "請選擇代理人"}
                    className="flex-1"
                  />
                </div>
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs text-blue-300">
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name || '未設定姓名'}</div>
                        <div className="text-xs text-white/60">{user.email}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAgent && (
              <div className="mt-2 p-2 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                <div className="text-sm text-blue-200">
                  已選擇：{selectedAgent.name || '未設定姓名'} ({selectedAgent.email})
                </div>
              </div>
            )}
          </div>

          {/* 請假原因 */}
          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              請假原因 *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-white/60" />
              <textarea
                placeholder="請說明請假原因..."
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                rows={3}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 resize-none"
              />
            </div>
          </div>

          {/* 開始日期和時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/80 font-medium block mb-2">
                開始日期 *
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                <input
                  type="date"
                  value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>
            
            <div>
              <SimpleTimePicker
                label="開始時間 *"
                value={formData.startTime}
                onChange={(time) => handleChange('startTime', time)}
              />
            </div>
          </div>

          {/* 結束日期和時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/80 font-medium block mb-2">
                結束日期 *
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                <input
                  type="date"
                  value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                  min={formData.startDate ? formData.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>
            
            <div>
              <SimpleTimePicker
                label="結束時間 *"
                value={formData.endTime}
                onChange={(time) => handleChange('endTime', time)}
              />
            </div>
          </div>

          {/* 請假時數計算 */}
          {formData.startDate && formData.endDate && (
            <div className="p-3 bg-green-500/10 border border-green-400/20 rounded-lg">
              <div className="text-sm text-green-200">
                {(() => {
                  const [startHour, startMinute] = formData.startTime.split(':').map(Number)
                  const [endHour, endMinute] = formData.endTime.split(':').map(Number)
                  
                  const startDateTime = new Date(formData.startDate)
                  startDateTime.setHours(startHour, startMinute, 0, 0)
                  
                  const endDateTime = new Date(formData.endDate)
                  endDateTime.setHours(endHour, endMinute, 0, 0)
                  
                  const diffMs = endDateTime.getTime() - startDateTime.getTime()
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                  const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10
                  
                  return (
                    <>
                      📅 請假天數：{diffDays} 天
                      <br />
                      ⏰ 請假時數：{diffHours} 小時
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
            className="px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '提交中...' : '提交申請'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 