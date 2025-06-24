// app/worklog/WorkLogModal.tsx
'use client'

import { useState } from 'react'
import { SimpleTimePicker } from '@/components/ui/simple-time-picker'
import { Portal } from '@/components/ui/portal'

export default function WorkLogModal({ onClose, onSave }: { onClose: () => void, onSave?: () => void }) {
  const [formData, setFormData] = useState({
    projectCode: '',
    projectName: '',
    category: '',
    content: '',
    startTime: '09:00',
    endTime: '17:00',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    const today = new Date().toISOString().split('T')[0]
    // 確保時間格式正確，如果沒有時間則使用預設值
    const startTime = formData.startTime || '09:00'
    const endTime = formData.endTime || '17:00'
    const fullStart = `${today}T${startTime}:00`
    const fullEnd = `${today}T${endTime}:00`
    const data = {
      ...formData,
      userId: 'user123', // 暫時使用固定 userId
      startTime: fullStart,
      endTime: fullEnd,
    }
    console.log(data)
    await fetch('/api/worklog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    // 如果有 onSave callback，執行它（用於打卡）
    if (onSave) {
      onSave()
    } else {
      onClose()
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
        <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 ring-1 ring-white/10 rounded-3xl shadow-xl p-8 w-full max-w-md">
          <h2 className="text-white text-xl font-bold mb-4">新增工作紀錄</h2>

          <div className="space-y-3">
            <input name="projectCode" placeholder="案件編號" onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            <input name="projectName" placeholder="案件名稱" onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            <input name="category" placeholder="分類" onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            <textarea name="content" placeholder="工作內容" rows={3} onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            {/* 時間選擇器 - 橫向排列 */}
            <div className="grid grid-cols-2 gap-4">
              <SimpleTimePicker label="開始時間" value={formData.startTime} onChange={(time: string) => setFormData({ ...formData, startTime: time })} />
              <SimpleTimePicker label="結束時間" value={formData.endTime} onChange={(time: string) => setFormData({ ...formData, endTime: time })} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition">
              取消
            </button>
            <button onClick={handleSubmit}
              className="px-4 py-2 text-sm rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white font-semibold shadow-md hover:scale-105 transition">
              儲存
            </button>
          </div>

          <div className="absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-white/10 border border-white/10" />
        </div>
      </div>
    </Portal>
  )
}
