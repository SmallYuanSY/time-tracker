"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SimpleTimePicker } from '@/components/ui/simple-time-picker'
import { Portal } from '@/components/ui/portal'
import ConflictConfirmModal from '@/components/ui/ConflictConfirmModal'
import CategorySelector from '@/components/ui/CategorySelector'
import { WorkCategory } from '@/lib/data/workCategories'

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
  onSave?: (clockEditReason?: string) => void
  onNext?: () => void
  showNext?: boolean
  initialMode?: 'start' | 'full' | 'end' | 'quick'
  editData?: WorkLog | null
  copyData?: WorkLog | null // 複製模式，只複製基本資訊，不複製時間
}

export default function WorkLogModal({ onClose, onSave, onNext, showNext = false, initialMode = 'full', editData, copyData }: WorkLogModalProps) {
  const { data: session } = useSession()
  const [useFullTimeMode, setUseFullTimeMode] = useState(false) // 完整時間模式切換
  
  // 記錄原始時間（用於檢測是否修改時間）
  const originalStartTime = initialMode === 'start' ? new Date().toTimeString().slice(0, 5) : '09:00'
  
  const [formData, setFormData] = useState({
    projectCode: editData?.projectCode || '',
    projectName: editData?.projectName || '',
    category: editData?.category || copyData?.category || '', // 只保留分類，因為這是重要的預設值
    content: editData?.content || '', // copyData 模式下不預填內容
    startTime: editData
      ? new Date(editData.startTime).toTimeString().slice(0, 5)
      : initialMode === 'quick'
        ? ''
        : initialMode === 'start'
          ? originalStartTime // 使用當前時間
          : '09:00',
    endTime: editData?.endTime ? new Date(editData.endTime).toTimeString().slice(0, 5) : '',
    editReason: '', // 編輯原因
  })
  
  // 檢查是否修改了時間（只在打卡模式下檢查）
  const [timeModified, setTimeModified] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictData, setConflictData] = useState<any>(null)
  const [pendingSubmissionData, setPendingSubmissionData] = useState<any>(null)
  
  // 案件選擇相關狀態
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [isNewProject, setIsNewProject] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<Project[]>(
    editData
      ? [{ projectCode: editData.projectCode, projectName: editData.projectName, category: editData.category }]
      : copyData
        ? [{ projectCode: copyData.projectCode, projectName: copyData.projectName, category: copyData.category }]
        : []
  )

  const extraTasks: Project[] = [
    { projectCode: '01', projectName: '非特定工作', category: '' },
    { projectCode: '09', projectName: '公司內務', category: '' },
  ]

  // 載入系統中所有案件列表
  useEffect(() => {
    const loadProjects = async () => {
      if (!session?.user) return

      try {
        // 載入所有系統案件，不限用戶
        const response = await fetch(`/api/projects?includeContacts=true`)
        if (response.ok) {
          const allProjects = await response.json()
          // 轉換格式
          const convertedProjects = allProjects.map((p: any) => ({
            projectCode: p.projectCode,
            projectName: p.projectName,
            category: p.category || ''
          }))
          setProjects(convertedProjects)
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('載入案件列表失敗:', error)
        }
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
      
      // 搜尋現有案件（精確匹配開頭）
      const matchingProjects = projects.filter(p => 
        p.projectCode.toLowerCase().startsWith(code.toLowerCase())
      )
      
      console.log('輸入的編號:', code, '已載入案件數量:', projects.length, '匹配案件:', matchingProjects)
      
      setFilteredProjects(matchingProjects)
      
      if (matchingProjects.length > 0) {
        // 如果有完全匹配的案件，自動帶入案件名稱
        const exactMatch = matchingProjects.find(p =>
          p.projectCode.toLowerCase() === code.toLowerCase()
        )
        if (exactMatch) {
          // 完全匹配，自動帶入案件名稱
          setFormData({
            ...formData,
            projectCode: exactMatch.projectCode,
            projectName: exactMatch.projectName
          })
          setShowProjectDropdown(false)
          setIsNewProject(false)
        } else {
          // 部分匹配，顯示下拉選單讓用戶選擇（即使只有一個匹配也要顯示）
          setShowProjectDropdown(true)
          setIsNewProject(false)
        }
      } else if (code.length >= 2) {
        // 沒有找到現有案件，顯示新建案件模式
        console.log('沒有找到匹配案件，顯示新建模式')
        setIsNewProject(true)
        setShowProjectDropdown(false)
        setFormData({
          ...formData,
          projectCode: code,
          projectName: ''
        })
      } else {
        // 輸入長度不足，清空所有狀態
        setIsNewProject(false)
        setShowProjectDropdown(false)
      }
      
    } else {
      setShowProjectDropdown(false)
      setIsNewProject(false)
      
      // 清空案件名稱（如果不是編輯模式）
      if (!editData) {
        setFormData({
          ...formData,
          projectCode: code,
          projectName: ''
        })
      }
    }
  }

  // 選擇現有案件
  const selectProject = (project: Project) => {
    setSelectedProjects(prev => {
      if (prev.find(p => p.projectCode === project.projectCode)) return prev
      return [...prev, project]
    })
    // 清空表單中的案件輸入欄位，因為已經加入到已選擇列表
    setFormData({ ...formData, projectCode: '', projectName: '' })
    setShowProjectDropdown(false)
    setIsNewProject(false)
  }

  const removeProject = (code: string) => {
    setSelectedProjects(prev => prev.filter(p => p.projectCode !== code))
  }

  const toggleExtraTask = (task: Project) => {
    if (selectedProjects.find(p => p.projectCode === task.projectCode)) {
      removeProject(task.projectCode)
    } else {
      setSelectedProjects(prev => [...prev, task])
    }
  }

  // 處理衝突確認
  const handleConfirmConflicts = async () => {
    if (!pendingSubmissionData || !session?.user) return

    setShowConflictModal(false)
    setIsSubmitting(true)

    try {
      const { useQuickApi, selectedProjects, formData, proceedNext } = pendingSubmissionData

      const requests = [] as Promise<Response>[]

      for (const proj of selectedProjects) {
        let payload: any

        if (useQuickApi) {
          // 快速記錄模式不會有衝突
          payload = {
            userId: (session.user as any).id,
            projectCode: proj.projectCode,
            projectName: proj.projectName,
            category: formData.category,
            content: formData.content,
          }
        } else {
          const today = new Date().toISOString().split('T')[0]
          const startTime = formData.startTime || '09:00'
          const fullStart = `${today}T${startTime}:00`
          
          let fullEnd = null as string | null
          if (initialMode === 'full' || initialMode === 'end' || editData || ((initialMode === 'quick' || copyData) && !useQuickApi)) {
            const endTime = formData.endTime
            if (endTime) {
              fullEnd = `${today}T${endTime}:00`
            }
          }

          payload = {
            userId: (session.user as any).id,
            projectCode: proj.projectCode,
            projectName: proj.projectName,
            category: formData.category,
            content: formData.content,
            startTime: fullStart,
            ...(fullEnd && { endTime: fullEnd }),
            ...(editData && { editReason: formData.editReason }),
          }
        }

        // 在打卡模式下添加相關參數（處理衝突時）
        if (formData.isClockMode) {
          payload.isClockMode = true
          if (formData.timeModified && formData.editReason) {
            payload.clockEditReason = formData.editReason
          }
        }

        const url = editData ? `/api/worklog/${editData.id}/confirm-conflicts` : '/api/worklog/confirm-conflicts'
        const method = editData ? 'PUT' : 'POST'
        
        requests.push(
          fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        )
      }

      const responses = await Promise.all(requests)

      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(errorData || `處理衝突失敗 (${response.status})`)
        }
      }

      // 成功後的處理
      if (proceedNext && onNext) {
        setFormData({
          projectCode: '',
          projectName: '',
          category: '',
          content: '',
          startTime: useQuickApi ? '' : formData.endTime || '17:00',
          endTime: '',
          editReason: '',
        })
        onNext()
      } else if (onSave) {
        onSave()
      } else {
        onClose()
      }
    } catch (error) {
      console.error('處理衝突失敗:', error)
      setErrors([error instanceof Error ? error.message : '處理衝突失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
      setPendingSubmissionData(null)
      setConflictData(null)
    }
  }

  const handleCancelConflicts = () => {
    setShowConflictModal(false)
    setConflictData(null)
    setPendingSubmissionData(null)
    setIsSubmitting(false)
  }

  // 確認新增案件為選項
  const handleConfirmNewProject = () => {
    if (!formData.projectCode || !formData.projectName) return

    const newProject: Project = {
      projectCode: formData.projectCode,
      projectName: formData.projectName,
      category: '', // 分類不屬於案件，保持為空
    }

    // 加入到已選擇的案件列表
    setSelectedProjects(prev => {
      if (prev.find(p => p.projectCode === newProject.projectCode)) return prev
      return [...prev, newProject]
    })

    // 重設案件欄位，保留分類
    setFormData({
      ...formData,
      projectCode: '',
      projectName: '',
    })

    // 重設新案件狀態
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

    if (selectedProjects.length === 0) newErrors.push('請至少選擇一個案件')
    if (!formData.category.trim()) newErrors.push('工作分類為必填欄位')
    if (!formData.content.trim()) newErrors.push('工作內容為必填欄位')
    
    // 編輯模式下，編輯原因為必填
    if (editData && !formData.editReason.trim()) newErrors.push('編輯原因為必填欄位')
    
    // 檢查打卡模式下是否修改了時間
    const isClockMode = initialMode === 'start'
    if (isClockMode && formData.startTime !== originalStartTime) {
      setTimeModified(true)
      if (!formData.editReason.trim()) {
        newErrors.push('修改打卡時間需要填寫修改原因')
      }
    } else if (isClockMode) {
      setTimeModified(false)
    }
    
    // 根據時間模式決定是否需要時間驗證
    const needTimeValidation = !(initialMode === 'quick' || copyData) || useFullTimeMode
    
    if (needTimeValidation && !formData.startTime) newErrors.push('開始時間為必填欄位')
    if (needTimeValidation && (initialMode === 'full' || initialMode === 'end' || useFullTimeMode)) {
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

    // 根據撥桿狀態決定是否使用快速記錄邏輯
    const useQuickApi = (initialMode === 'quick' || copyData) && !useFullTimeMode
    
    try {
      const baseUrl = useQuickApi ? '/api/worklog/quick' : '/api/worklog'

      const requests = [] as Promise<Response>[]

      for (const proj of editData ? selectedProjects.slice(0, 1) : selectedProjects) {
        let url = baseUrl
        let method: 'POST' | 'PUT' = editData ? 'PUT' : 'POST'
        let payload: any

        if (useQuickApi) {
          payload = {
            userId: (session.user as any).id,
            projectCode: proj.projectCode,
            projectName: proj.projectName,
            category: formData.category,
            content: formData.content,
          }
        } else {
          const today = new Date().toISOString().split('T')[0]
          const startTime = formData.startTime || '09:00'
          const fullStart = `${today}T${startTime}:00`

          let fullEnd = null as string | null
          if (initialMode === 'full' || initialMode === 'end' || editData || ((initialMode === 'quick' || copyData) && !useQuickApi)) {
            const endTime = formData.endTime
            if (endTime) {
              fullEnd = `${today}T${endTime}:00`
            }
          }

          payload = {
            userId: (session.user as any).id,
            projectCode: proj.projectCode,
            projectName: proj.projectName,
            category: formData.category,
            content: formData.content,
            startTime: fullStart,
            ...(fullEnd && { endTime: fullEnd }),
            ...(editData && { editReason: formData.editReason }),
          }
        }

        if (editData) {
          url = `/api/worklog/${editData.id}`
        }

        // 在打卡模式下添加相關參數
        if (initialMode === 'start') {
          payload.isClockMode = true
          if (timeModified && formData.editReason) {
            payload.clockEditReason = formData.editReason
          }
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('[提交工作紀錄]', payload)
        }

        requests.push(
          fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        )
      }

      const responses = await Promise.all(requests)

      for (const response of responses) {
        if (response.status === 409) {
          // 時間衝突，顯示確認彈窗
          const conflictInfo = await response.json()
          setConflictData(conflictInfo.conflicts)
          setPendingSubmissionData({
            useQuickApi,
            selectedProjects: editData ? selectedProjects.slice(0, 1) : selectedProjects,
            formData: {
              ...formData,
              // 保存打卡模式相關信息
              isClockMode: initialMode === 'start',
              timeModified: timeModified,
            },
            proceedNext
          })
          setShowConflictModal(true)
          setIsSubmitting(false)
          return
        } else if (!response.ok) {
          const errorData = await response.text()
          if (process.env.NODE_ENV !== 'production') {
            console.error('API 錯誤回應:', errorData)
          }
          throw new Error(errorData || `提交失敗 (${response.status})`)
        }
      }

      if (proceedNext && onNext) {
        setFormData({
          projectCode: '',
          projectName: '',
          category: '',
          content: '',
          startTime: useQuickApi ? '' : formData.endTime || '17:00',
          endTime: '',
          editReason: '',
        })
        onNext()
      } else if (onSave) {
        // 如果是打卡模式且修改了時間，傳遞修改原因
        const clockEditReason = (initialMode === 'start' && timeModified) ? formData.editReason : undefined
        onSave(clockEditReason)
      } else {
        onClose()
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('提交工作紀錄失敗:', error)
      }
      setErrors([error instanceof Error ? error.message : '提交失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4">
        <div className="flex items-start gap-4 w-full max-w-6xl">
          {/* 左側空白區域（保持平衡） */}
          <div className="w-64 flex-shrink-0"></div>
          
          {/* 主要工作紀錄表單 */}
          <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 ring-1 ring-white/10 rounded-3xl shadow-xl p-8 flex-1 max-w-2xl mx-auto">
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

            {/* 案件名稱 */}
            <div className="relative">
              <input
                name="projectName"
                placeholder={isNewProject ? "案件名稱" : "請先輸入案件編號"}
                value={formData.projectName}
                onChange={handleChange}
                disabled={!isNewProject && !formData.projectCode}
                className={`w-full rounded-xl border px-4 py-2 text-white placeholder:text-white/60 focus:outline-none ${
                  !isNewProject && !formData.projectCode 
                    ? 'bg-white/10 border-white/20 cursor-not-allowed text-white/50' 
                    : 'bg-white/20 border-white/30'
                }`}
              />
            </div>

            {/* 現有案件確認按鈕 */}
            {!isNewProject && formData.projectCode && formData.projectName && (
              <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-3 text-green-100 text-sm">
                <div className="flex items-center justify-between">
                  <span>✅ 找到現有案件，點擊加入到工作記錄</span>
                  <button
                    type="button"
                    onClick={() => {
                      const project: Project = {
                        projectCode: formData.projectCode,
                        projectName: formData.projectName,
                        category: ''
                      }
                      selectProject(project)
                    }}
                    className="ml-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors font-medium"
                  >
                    ✓ 加入案件
                  </button>
                </div>
              </div>
            )}

             {/* 新案件提示與確認按鈕 */}
             {isNewProject && (
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-3 text-blue-100 text-sm">
                <div className="flex items-center justify-between">
                  <span>💡 這是新案件，請填寫案件名稱</span>
                  {formData.projectCode && formData.projectName && (
                    <button
                      type="button"
                      onClick={handleConfirmNewProject}
                      className="ml-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors font-medium"
                    >
                      ✓ 確認新增
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedProjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedProjects.map(p => (
                  <span key={p.projectCode} className="bg-blue-500/20 text-white text-sm px-2 py-1 rounded-full flex items-center gap-1">
                    {p.projectCode} {p.projectName}
                    <button type="button" onClick={() => removeProject(p.projectCode)} className="ml-1">✕</button>
                  </span>
                ))}
              </div>
            )}
            
            {/* 工作分類 */}
            <CategorySelector
              value={formData.category}
              onChange={(category: WorkCategory) => {
                setFormData({ ...formData, category: category.content })
              }}
              required={true}
            />
            
           
            <textarea name="content" placeholder="工作內容" rows={3} value={formData.content} onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none" />
            
            {/* 編輯原因（僅在編輯模式下顯示） */}
            {editData && (
              <div className="space-y-2">
                <label className="text-sm text-white font-medium block">
                  編輯原因 <span className="text-red-400">*</span>
                </label>
                <textarea 
                  name="editReason" 
                  placeholder="請說明編輯此工作記錄的原因..." 
                  rows={2} 
                  value={formData.editReason} 
                  onChange={handleChange}
                  className="w-full rounded-xl bg-orange-500/20 border border-orange-400/50 px-4 py-2 text-white placeholder:text-orange-200/60 focus:outline-none focus:border-orange-400" 
                />
                <p className="text-xs text-orange-200/80">
                  ⚠️ 編輯原因將記錄您的IP地址，供管理員審核使用
                </p>
              </div>
            )}
            
            {/* 快速記錄模式的時間切換撥桿 */}
            {(initialMode === 'quick' || copyData) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/80 text-sm">完整時間模式</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFullTimeMode}
                    onChange={(e) => setUseFullTimeMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            )}

            {(initialMode === 'quick' || copyData) && !useFullTimeMode ? (
              <div className="text-white/60 text-sm">開始與結束時間將自動填入</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <SimpleTimePicker label="開始時間" value={formData.startTime} onChange={(time: string) => setFormData({ ...formData, startTime: time })} />
                {(initialMode === 'full' || initialMode === 'end' || editData || ((initialMode === 'quick' || copyData) && useFullTimeMode)) && (
                  <SimpleTimePicker label="結束時間" value={formData.endTime} onChange={(time: string) => setFormData({ ...formData, endTime: time })} />
                )}
              </div>
            )}
            
            {/* 打卡時間修改原因（僅在打卡模式且修改時間時顯示） */}
            {initialMode === 'start' && formData.startTime !== originalStartTime && (
              <div className="space-y-2">
                <label className="text-sm text-white font-medium block">
                  時間修改原因 <span className="text-red-400">*</span>
                </label>
                <textarea 
                  name="editReason" 
                  placeholder="請說明修改打卡時間的原因..." 
                  rows={2} 
                  value={formData.editReason} 
                  onChange={handleChange}
                  className="w-full rounded-xl bg-yellow-500/20 border border-yellow-400/50 px-4 py-2 text-white placeholder:text-yellow-200/60 focus:outline-none focus:border-yellow-400" 
                />
                <p className="text-xs text-yellow-200/80">
                  ⚠️ 修改原因將同時記錄到打卡記錄和工作記錄中，供管理員審核使用
                </p>
              </div>
            )}
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

          {/* 其他工作側邊欄 */}
          <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 ring-1 ring-white/10 rounded-3xl shadow-xl p-6 w-64 flex-shrink-0">
            <div className="text-white font-bold text-lg mb-4 text-center">其他工作</div>
            <div className="space-y-3">
              {extraTasks.map(task => (
                <label key={task.projectCode} className="flex items-center gap-3 text-white/90 hover:text-white transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!selectedProjects.find(p => p.projectCode === task.projectCode)}
                    onChange={() => toggleExtraTask(task)}
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

            <div className="absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-white/10 border border-white/10" />
          </div>
        </div>
      </div>

      {showConflictModal && conflictData && (
        <ConflictConfirmModal
          conflicts={conflictData}
          onConfirm={handleConfirmConflicts}
          onCancel={handleCancelConflicts}
        />
      )}
    </Portal>
  )
}
