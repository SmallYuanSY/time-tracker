"use client"

import { useState, useEffect } from 'react'
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

interface Project {
  projectCode: string
  projectName: string
  category: string
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
  
  // 案件選擇相關狀態
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [isNewProject, setIsNewProject] = useState(false)
  const [loadingProject, setLoadingProject] = useState(false)

  // 載入用戶的案件列表
  useEffect(() => {
    const loadProjects = async () => {
      if (!session?.user) return

      try {
        const userId = (session.user as any).id
        const response = await fetch(`/api/projects?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setProjects(data)
        }
      } catch (error) {
        console.error('載入案件列表失敗:', error)
      }
    }

    loadProjects()
  }, [session])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // 處理案件編號輸入
  const handleProjectCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value
    setFormData({ ...formData, projectCode: code })

    // 當輸入兩位數或更多時，嘗試搜尋案件
    if (code.length >= 2) {
      setLoadingProject(true)
      
      // 搜尋現有案件（精確匹配開頭）
      const matchingProjects = projects.filter(p => 
        p.projectCode.toLowerCase().startsWith(code.toLowerCase())
      )
      
      setFilteredProjects(matchingProjects)
      
      if (matchingProjects.length > 0) {
        setShowProjectDropdown(true)
        setIsNewProject(false)
        
        // 如果只有一個完全匹配的案件，自動選擇
        const exactMatch = matchingProjects.find(p => 
          p.projectCode.toLowerCase() === code.toLowerCase()
        )
        if (exactMatch) {
          selectProject(exactMatch)
        }
      } else {
        // 沒有找到現有案件，顯示新建案件模式
        setIsNewProject(true)
        setShowProjectDropdown(false)
        setFormData({
          ...formData,
          projectCode: code,
          projectName: '',
          category: ''
        })
      }
      
      setLoadingProject(false)
    } else {
      setShowProjectDropdown(false)
      setIsNewProject(false)
      
      // 清空案件名稱和分類（如果不是編輯模式）
      if (!editData) {
        setFormData({
          ...formData,
          projectCode: code,
          projectName: '',
          category: ''
        })
      }
    }
  }

  // 選擇現有案件
  const selectProject = (project: Project) => {
    setFormData({
      ...formData,
      projectCode: project.projectCode,
      projectName: project.projectName,
      category: project.category
    })
    setShowProjectDropdown(false)
    setIsNewProject(false)
  }

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.project-dropdown-container')) {
        setShowProjectDropdown(false)
      }
    }

    if (showProjectDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectDropdown])

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
            {/* 智能案件選擇 */}
            <div className="relative project-dropdown-container">
              <input 
                name="projectCode" 
                placeholder="案件編號 (輸入2位數自動搜尋)" 
                value={formData.projectCode} 
                onChange={handleProjectCodeChange}
                className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none"
              />
              
              {/* 載入指示器 */}
              {loadingProject && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                </div>
              )}
              
              {/* 案件下拉選單 */}
              {showProjectDropdown && filteredProjects.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur border border-white/30 rounded-xl max-h-40 overflow-y-auto z-10 shadow-lg">
                  <div className="px-4 py-2 bg-blue-500/20 text-blue-800 text-xs font-medium border-b border-white/20">
                    找到 {filteredProjects.length} 個相關案件
                  </div>
                  {filteredProjects.map((project, index) => (
                    <div
                      key={index}
                      onClick={() => selectProject(project)}
                      className="px-4 py-3 hover:bg-blue-500/20 cursor-pointer border-b border-white/20 last:border-b-0 transition-colors"
                    >
                      <div className="text-gray-800 font-bold text-sm">{project.projectCode}</div>
                      <div className="text-gray-700 text-sm font-medium">{project.projectName}</div>
                      <div className="text-gray-500 text-xs mt-1 bg-gray-100 px-2 py-1 rounded inline-block">{project.category}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 案件名稱 - 根據是否為新案件決定是否可編輯 */}
            <div className="relative">
              <input 
                name="projectName" 
                placeholder="案件名稱" 
                value={formData.projectName} 
                onChange={handleChange}
                disabled={!isNewProject && formData.projectName !== ''}
                className={`w-full rounded-xl border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none ${
                  !isNewProject && formData.projectName !== '' 
                    ? 'bg-white/10 cursor-not-allowed' 
                    : 'bg-white/20'
                }`}
              />
              {!isNewProject && formData.projectName !== '' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
                  🔒
                </div>
              )}
            </div>
            
            {/* 分類 - 根據是否為新案件決定是否可編輯 */}
            <div className="relative">
              <input 
                name="category" 
                placeholder="分類" 
                value={formData.category} 
                onChange={handleChange}
                disabled={!isNewProject && formData.category !== ''}
                className={`w-full rounded-xl border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none ${
                  !isNewProject && formData.category !== '' 
                    ? 'bg-white/10 cursor-not-allowed' 
                    : 'bg-white/20'
                }`}
              />
              {!isNewProject && formData.category !== '' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
                  🔒
                </div>
              )}
            </div>
            
            {/* 新案件提示 */}
            {isNewProject && (
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-3 text-blue-100 text-sm">
                💡 這是新案件，請填寫案件名稱和分類
              </div>
            )}
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
