"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Calendar, Target, FileText } from 'lucide-react'
import { useSession } from 'next-auth/react'
import ProjectSelector from '@/components/ui/ProjectSelector'
import CategorySelector from '@/components/ui/CategorySelector'
import { Project } from '@/lib/hooks/useProjectSelection'
import { WorkCategory } from '@/lib/data/workCategories'
import { extraTasks } from '@/lib/data/extraTasks'

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
}

interface WorkTemplate {
  title: string
  description: string
  content: string
  category: string
  priority: number
  tags: { text: string; color: string }[]
}

const workTemplates: WorkTemplate[] = [
  {
    title: '每週進度報告',
    description: '週報撰寫與提交，包含工作進度、問題與計畫',
    content: '1. 本週完成工作項目回顧\n2. 遇到的問題與解決方案\n3. 下週工作計畫\n4. 需要協助的事項',
    category: '文書作業',
    priority: 4,
    tags: [
      { text: '週期性', color: 'blue' },
      { text: '文書', color: 'green' }
    ]
  },
  {
    title: '系統維護檢查',
    description: '定期系統檢查、效能監控與維護工作',
    content: '1. 系統效能檢查\n2. 資料庫效能監控\n3. 系統日誌分析\n4. 安全性更新檢查\n5. 效能調校建議',
    category: '系統維護',
    priority: 3,
    tags: [
      { text: '週期性', color: 'blue' },
      { text: '維護', color: 'purple' }
    ]
  },
  {
    title: '資料備份',
    description: '系統資料庫與檔案的定期備份作業',
    content: '1. 資料庫完整備份\n2. 檔案系統備份\n3. 備份檔案完整性驗證\n4. 備份記錄文件製作',
    category: '系統維護',
    priority: 2,
    tags: [
      { text: '週期性', color: 'blue' },
      { text: '資料', color: 'yellow' }
    ]
  }
]

interface ScheduledWorkModalProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  editData?: ScheduledWork | null
}

export default function ScheduledWorkModal({
  open,
  onClose,
  onSave,
  editData = null
}: ScheduledWorkModalProps) {
  const { data: session } = useSession()
  // 使用 session 來避免 ESLint 警告
  //console.log('Session loaded:', !!session)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([])
  const [selectedExtraTasks, setSelectedExtraTasks] = useState<string[]>([])

  // 表單狀態
  const [formData, setFormData] = useState({
    projectCode: '',
    projectName: '',
    category: '',
    content: '',
    scheduledStartDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD 格式
    scheduledEndDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD 格式
    priority: 5, // 預設中等優先級
    workType: 'SCHEDULED' as 'SCHEDULED' | 'URGENT', // 預設為預定工作
  })

  // 自動判斷工作類型的函數
  const determineWorkType = (startDate: string): 'SCHEDULED' | 'URGENT' => {
    const start = new Date(startDate)
    const today = new Date()
    
    // 獲取本週的開始（週一）和結束（週日）
    const currentWeekStart = new Date(today)
    const dayOfWeek = currentWeekStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday)
    currentWeekStart.setHours(0, 0, 0, 0)
    
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6)
    currentWeekEnd.setHours(23, 59, 59, 999)
    
    // 如果預定開始日期在本週內，則為臨時工作
    if (start >= currentWeekStart && start <= currentWeekEnd) {
      return 'URGENT'
    } else {
      return 'SCHEDULED'
    }
  }

  // 重設表單
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      projectCode: '',
      projectName: '',
      category: '',
      content: '',
      scheduledStartDate: today,
      scheduledEndDate: today,
      priority: 5,
      workType: determineWorkType(today),
    })
    setErrors([])
  }

  // 初始化選中的專案
  useEffect(() => {
    if (editData) {
      setSelectedProjects([{
        projectCode: editData.projectCode,
        projectName: editData.projectName,
        category: editData.category,
      }])
    } else {
      setSelectedProjects([])
    }
  }, [editData, open])

  // 編輯模式初始化
  useEffect(() => {
    if (editData) {
      setFormData({
        projectCode: editData.projectCode,
        projectName: editData.projectName,
        category: editData.category,
        content: editData.content,
        scheduledStartDate: editData.scheduledStartDate.split('T')[0], // 只取日期部分
        scheduledEndDate: editData.scheduledEndDate.split('T')[0], // 只取日期部分
        priority: editData.priority,
        workType: editData.workType,
      })
    } else {
      resetForm()
    }
  }, [editData, open])

  // 處理專案選擇
  const handleProjectSelect = (project: Project) => {
    setSelectedProjects([project])
    setFormData(prev => ({
      ...prev,
      projectCode: project.projectCode,
      projectName: project.projectName,
      category: project.category || prev.category, // 如果專案有分類則使用，否則保持當前分類
    }))
  }

  // 處理專案移除
  const handleProjectRemove = (code: string) => {
    setSelectedProjects([])
    setFormData(prev => ({
      ...prev,
      projectCode: '',
      projectName: '',
      category: '',
    }))
  }

  // 處理新專案
  const handleNewProject = (code: string, name: string) => {
    const newProject: Project = {
      projectCode: code,
      projectName: name,
      category: formData.category,
    }
    setSelectedProjects([newProject])
    setFormData(prev => ({
      ...prev,
      projectCode: code,
      projectName: name,
    }))
  }

  // 處理分類選擇
  const handleCategorySelect = (category: WorkCategory) => {
    setFormData(prev => ({
      ...prev,
      category: category.content,
    }))
  }

  // 處理開始日期變更，自動更新工作類型
  const handleStartDateChange = (date: string) => {
    const workType = determineWorkType(date)
    setFormData(prev => ({
      ...prev,
      scheduledStartDate: date,
      workType: workType,
    }))
  }

  // 表單驗證
  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.projectCode.trim()) {
      newErrors.push('請輸入專案代碼')
    }
    if (!formData.projectName.trim()) {
      newErrors.push('請輸入專案名稱')
    }
    if (!formData.category.trim()) {
      newErrors.push('請輸入工作分類')
    }
    if (!formData.content.trim()) {
      newErrors.push('請輸入工作內容')
    }
    if (!formData.scheduledStartDate) {
      newErrors.push('請選擇預定開始日期')
    }
    if (!formData.scheduledEndDate) {
      newErrors.push('請選擇預定結束日期')
    }
    if (formData.scheduledStartDate && formData.scheduledEndDate && 
        new Date(formData.scheduledEndDate) < new Date(formData.scheduledStartDate)) {
      newErrors.push('結束日期不能早於開始日期')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  // 提交表單
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const submitData = {
        projectCode: formData.projectCode.trim(),
        projectName: formData.projectName.trim(),
        category: formData.category.trim(),
        content: formData.content.trim(),
        scheduledStartDate: new Date(formData.scheduledStartDate).toISOString(),
        scheduledEndDate: new Date(formData.scheduledEndDate).toISOString(),
        priority: formData.priority,
        workType: formData.workType,
      }

      const url = editData ? '/api/scheduled-work' : '/api/scheduled-work'
      const method = editData ? 'PUT' : 'POST'
      
      if (editData) {
        // 編輯模式需要傳送 ID
        (submitData as any).id = editData.id
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        onSave()
        onClose()
        resetForm()
      } else {
        const errorText = await response.text()
        setErrors([errorText || '提交失敗，請稍後再試'])
      }
    } catch (error) {
      console.error('提交預定工作失敗:', error)
      setErrors(['提交失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  // 在 ScheduledWorkModal 組件內添加處理函數
  const handleTemplateClick = (template: WorkTemplate) => {
    setFormData(prev => ({
      ...prev,
      category: template.category,
      content: template.content,
      priority: template.priority
    }))
  }

  const priorityOptions = [
    { value: 1, label: '🔴 最高', color: 'text-red-400' },
    { value: 2, label: '🟠 高', color: 'text-orange-400' },
    { value: 3, label: '🟡 中高', color: 'text-yellow-400' },
    { value: 4, label: '🟢 中等', color: 'text-green-400' },
    { value: 5, label: '🔵 普通', color: 'text-blue-400' },
    { value: 6, label: '⚪ 低', color: 'text-gray-400' },
  ]

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-y-auto bg-gray-900/95 backdrop-blur-lg border border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            {editData ? '編輯預定工作' : '新增預定工作'}
          </DialogTitle>
          <DialogDescription>
            請填寫以下表單來{editData ? '編輯' : '新增'}預定工作的詳細資訊
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          {/* 主要表單區域 */}
          <div className="flex-1 space-y-6 py-4">
            {/* 錯誤訊息 */}
            {errors.length > 0 && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                <ul className="text-red-100 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 工作類型指示器 */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${formData.workType === 'URGENT' ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                <span className="text-sm font-medium text-white">
                  {formData.workType === 'URGENT' ? '🔥 臨時工作' : '📅 預定工作'}
                </span>
                <span className="text-xs text-white/60 ml-auto">
                  {formData.workType === 'URGENT' ? '本週執行' : '下週或以後執行'}
                </span>
              </div>
            </div>

            {/* 專案選擇器 */}
            <ProjectSelector
              selectedProjects={selectedProjects}
              onProjectSelect={handleProjectSelect}
              onProjectRemove={handleProjectRemove}
              onNewProject={handleNewProject}
              projectCode={formData.projectCode}
              projectName={formData.projectName}
              onProjectCodeInputChange={(code) => setFormData(prev => ({ ...prev, projectCode: code }))}
              onProjectNameChange={(name) => setFormData(prev => ({ ...prev, projectName: name }))}
              onProjectCodeChange={(code, project) => {
                if (project) {
                  handleProjectSelect(project)
                }
              }}
              showRecentProjects={true}
              showExtraTasks={true}
              disabled={isSubmitting}
              className="bg-white/5 rounded-lg p-4 border border-white/20"
            />

            {/* 工作分類選擇器 */}
            <CategorySelector
              value={formData.category}
              onChange={handleCategorySelect}
              required={true}
              className="bg-white/5 rounded-lg p-4 border border-white/20"
            />

            {/* 日期和優先級 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  預定開始日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.scheduledStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  預定結束日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.scheduledEndDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledEndDate: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  優先級
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full p-3 border border-gray-300 rounded-md bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 工作內容 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                工作內容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="請詳細描述預定要執行的工作內容..."
                className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[100px] bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>

            {/* 按鈕區域 */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                取消
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.projectCode.trim() || !formData.projectName.trim() || !formData.category.trim() || !formData.content.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold min-w-[100px]"
              >
                {isSubmitting ? '提交中...' : editData ? '更新' : '新增'}
              </Button>
            </div>
          </div>

          {/* 其他工作側邊欄 */}
          <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl w-64 flex-shrink-0 flex flex-col max-h-full">
            <div className="p-6 pb-4 flex-shrink-0">
              <div className="text-white font-bold text-lg mb-4 text-center">其他工作</div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pb-4 workmodal-scroll">
              <div className="space-y-3">
                {extraTasks.map(task => (
                  <label key={task.projectCode} className="flex items-center gap-3 text-white/90 hover:text-white transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedExtraTasks.includes(task.projectCode)}
                      onChange={() => {
                        if (selectedExtraTasks.includes(task.projectCode)) {
                          setSelectedExtraTasks(prev => prev.filter(code => code !== task.projectCode))
                        } else {
                          setSelectedExtraTasks(prev => [...prev, task.projectCode])
                          // 當選中額外工作時,自動填入相關資訊
                          setFormData(prev => ({
                            ...prev,
                            projectCode: task.projectCode,
                            projectName: task.projectName,
                            category: task.category || prev.category
                          }))
                        }
                      }}
                      className="w-4 h-4 rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-500/50"
                    />
                    <div className="flex-1 group-hover:translate-x-1 transition-transform">
                      <div className="font-medium text-sm">{task.projectCode}</div>
                      <div className="text-xs text-white/70">{task.projectName}</div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="mt-6 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white/80 text-xs text-center">
                  💡 選擇適用的其他工作類型
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 