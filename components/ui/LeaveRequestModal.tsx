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
import { DateTimePicker } from './date-time-picker'
import { User, FileText, Calendar, Clock } from 'lucide-react'

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
    
    const start = formData.startDate
    const end = formData.endDate
    const diffMs = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10
    
    return { days: diffDays, hours: diffHours }
  }

  const duration = calculateDuration()

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
                  <SelectContent position="popper" side="bottom" align="start" container={contentRef.current}>
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
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  開始時間 <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  value={formData.startDate || undefined}
                  onChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                  container={contentRef.current}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  結束時間 <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  value={formData.endDate || undefined}
                  onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                  container={contentRef.current}
                />
              </div>
            </div>

            {/* 時長顯示 */}
            {duration && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">請假時長：</span>
                    <span>{duration.days} 天 ({duration.hours} 小時)</span>
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