"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { SimpleTimePicker } from '@/components/ui/simple-time-picker'
import { Portal } from '@/components/ui/portal'

interface WorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  startTime: string
  endTime: string | null
}

interface WorkLogModalProps {
  onClose: () => void
  onSave?: () => void
  onNext?: () => void
  showNext?: boolean
  initialMode?: 'start' | 'full' | 'end'
  editData?: WorkLog | null
  copyData?: WorkLog | null // 複製模式，只複製基本資訊，不複製時間
}

export default function WorkLogModal({ onClose, onSave, onNext, showNext = false, initialMode = 'full', editData, copyData }: WorkLogModalProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    projectCode: editData?.projectCode || copyData?.projectCode || '',
    projectName: editData?.projectName || copyData?.projectName || '',
    category: editData?.category || copyData?.category || '',
    content: editData?.content || copyData?.content || '',
    startTime: editData ? new Date(editData.startTime).toTimeString().slice(0, 5) : '09:00',
    endTime: editData?.endTime ? new Date(editData.endTime).toTimeString().slice(0, 5) : '',
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.projectCode.trim()) newErrors.push('案件編號為必填欄位')
    if (!formData.projectName.trim()) newErrors.push('案件名稱為必填欄位')
    if (!formData.category.trim()) newErrors.push('分類為必填欄位')
    if (!formData.content.trim()) newErrors.push('工作內容為必填欄位')
    if (!formData.startTime) newErrors.push('開始時間為必填欄位')
    if (initialMode === 'full' || initialMode === 'end') {
      if (!formData.endTime) newErrors.push('結束時間為必填欄位')

      if (formData.startTime && formData.endTime) {
        const start = new Date(`2000-01-01T${formData.startTime}:00`)
        const end = new Date(`2000-01-01T${formData.endTime}:00`)
        if (end <= start) {
          newErrors.push('結束時間必須晚於開始時間')
        }
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (proceedNext = false) => {
    if (!validateForm()) return

    if (!session?.user) {
      setErrors(['請先登入'])
      return
    }

    setIsSubmitting(true)
    setErrors([])

    try {
      const today = new Date().toISOString().split('T')[0]
      const startTime = formData.startTime || '09:00'
      const fullStart = `${today}T${startTime}:00`
      
      // 只有在 full 或 end 模式，或是編輯模式時才處理結束時間
      let fullEnd = null
      if (initialMode === 'full' || initialMode === 'end' || editData) {
        const endTime = formData.endTime
        if (endTime) {
          fullEnd = `${today}T${endTime}:00`
        }
      }

      const data = {
        ...formData,
        userId: (session.user as any).id,
        startTime: fullStart,
        ...(fullEnd && { endTime: fullEnd }),
      }

      console.log('[提交工作紀錄]', data)
      
      let response;
      if (editData) {
        // 編輯模式 - 使用 PUT 請求
        response = await fetch(`/api/worklog/${editData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        // 新增模式 - 使用 POST 請求
        response = await fetch('/api/worklog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API 錯誤回應:', errorData)
        throw new Error(errorData || `提交失敗 (${response.status})`)
      }

      if (proceedNext && onNext) {
        setFormData({
          projectCode: '',
          projectName: '',
          category: '',
          content: '',
          startTime: formData.endTime || '17:00',
          endTime: '',
        })
        onNext()
      } else if (onSave) {
        onSave()
      } else {
        onClose()
      }
    } catch (error) {
      console.error('提交工作紀錄失敗:', error)
      setErrors([error instanceof Error ? error.message : '提交失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
        <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 ring-1 ring-white/10 rounded-3xl shadow-xl p-8 w-full max-w-md">
          <h2 className="text-white text-xl font-bold mb-4">
            {editData ? '編輯工作紀錄' : copyData ? '複製並新增工作紀錄' : '新增工作紀錄'}
          </h2>

          {errors.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30">
              <ul className="text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <input name="projectCode" placeholder="案件編號" value={formData.projectCode} onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            <input name="projectName" placeholder="案件名稱" value={formData.projectName} onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            <input name="category" placeholder="分類" value={formData.category} onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            <textarea name="content" placeholder="工作內容" rows={3} value={formData.content} onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <SimpleTimePicker label="開始時間" value={formData.startTime} onChange={(time: string) => setFormData({ ...formData, startTime: time })} />
              {(initialMode === 'full' || initialMode === 'end') ? (
                <SimpleTimePicker label="結束時間" value={formData.endTime} onChange={(time: string) => setFormData({ ...formData, endTime: time })} />
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-white font-medium block">結束時間</div>
                  <div className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white/60 text-center">
                    {initialMode === 'start' ? '下班時填寫' : '請選擇結束時間'}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition">
              取消
            </button>
            <div className="flex gap-2">
              {showNext && (
                <button 
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '處理中...' : '儲存並新增'}
                </button>
              )}
              <button 
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white font-semibold shadow-md hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? '處理中...' : (editData ? '儲存修改' : '完成新增')}
              </button>
            </div>
          </div>

          <div className="absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-white/10 border border-white/10" />
        </div>
      </div>
    </Portal>
  )
}
