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
import { Calendar, User, FileText } from 'lucide-react'

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
    startDate: '',
    endDate: '',
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
        startDate: '',
        endDate: '',
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
        // 過濾掉當前用戶
        const filteredUsers = data.filter((user: User) => user.email !== session?.user?.email)
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('載入用戶失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.agentId) newErrors.push('請選擇代理人')
    if (!formData.reason.trim()) newErrors.push('請填寫請假原因')
    if (!formData.startDate) newErrors.push('請選擇開始日期')
    if (!formData.endDate) newErrors.push('請選擇結束日期')

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (start > end) {
        newErrors.push('結束日期不能早於開始日期')
      }
      if (start.getTime() < new Date().setHours(0, 0, 0, 0)) {
        newErrors.push('開始日期不能早於今天')
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
      <DialogContent className="w-full max-w-md">
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

          {/* 開始日期 */}
          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              開始日期 *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          </div>

          {/* 結束日期 */}
          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              結束日期 *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          </div>

          {/* 請假天數計算 */}
          {formData.startDate && formData.endDate && (
            <div className="p-3 bg-green-500/10 border border-green-400/20 rounded-lg">
              <div className="text-sm text-green-200">
                📅 請假天數：{
                  Math.ceil(
                    (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) 
                    / (1000 * 60 * 60 * 24)
                  ) + 1
                } 天
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