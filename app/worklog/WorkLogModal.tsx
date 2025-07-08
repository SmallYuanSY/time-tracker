"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SimpleTimePicker } from '@/components/ui/simple-time-picker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Calendar, Target, FileText, Clock, Briefcase, CalendarIcon } from 'lucide-react'
import ConflictConfirmModal from '@/components/ui/ConflictConfirmModal'
import CategorySelector from '@/components/ui/CategorySelector'
import ProjectSelector from '@/components/ui/ProjectSelector'
import { WorkCategory } from '@/lib/data/workCategories'
import { extraTasks } from '@/lib/data/extraTasks'
import { Project } from '@/lib/hooks/useProjectSelection'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

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
  open: boolean
  onClose: () => void
  onSave?: (clockEditReason?: string) => void
  onNext?: () => void
  showNext?: boolean
  initialMode?: 'start' | 'full' | 'end' | 'quick'
  editData?: WorkLog | null
  copyData?: WorkLog | null // 複製模式，只複製基本資訊，不複製時間
  isOvertimeMode?: boolean // 是否為加班模式
  defaultProjectCode?: string // 預設專案代碼
}

export default function WorkLogModal({ 
  open, 
  onClose, 
  onSave, 
  onNext, 
  showNext = false, 
  initialMode = 'full', 
  editData, 
  copyData, 
  isOvertimeMode = false,
  defaultProjectCode
}: WorkLogModalProps) {
  const { data: session } = useSession()
  const [useFullTimeMode, setUseFullTimeMode] = useState(false) // 完整時間模式切換
  
  // 記錄原始時間（用於檢測是否修改時間）- 固定在組件初始化時
  const [originalStartTime] = useState(() => 
    initialMode === 'start' ? new Date().toTimeString().slice(0, 5) : '09:00'
  )

  // 計算時間差（分鐘）
  const calculateTimeDifferenceInMinutes = (originalTime: string, modifiedTime: string): number => {
    const [originalHour, originalMinute] = originalTime.split(':').map(Number)
    const [modifiedHour, modifiedMinute] = modifiedTime.split(':').map(Number)
    
    const originalTotalMinutes = originalHour * 60 + originalMinute
    const modifiedTotalMinutes = modifiedHour * 60 + modifiedMinute
    
    return Math.abs(modifiedTotalMinutes - originalTotalMinutes)
  }

  // 檢查是否需要填寫修改原因（超過5分鐘才需要）
  const needsEditReason = () => {
    if (initialMode !== 'start' || formData.startTime === originalStartTime) {
      return false
    }
    
    const timeDiff = calculateTimeDifferenceInMinutes(originalStartTime, formData.startTime)
    return timeDiff > 5 // 超過5分鐘才需要原因
  }
  
  const [formData, setFormData] = useState({
    projectCode: editData?.projectCode || copyData?.projectCode || defaultProjectCode || '',
    projectName: editData?.projectName || copyData?.projectName || '',
    category: editData?.category || copyData?.category || '', // 保留分類
    content: editData?.content || copyData?.content || '', // 在複製模式下也保留工作內容
    date: editData
      ? new Date(editData.startTime).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0], // 編輯模式使用原始日期，新增模式使用今天
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
  const [selectedProjects, setSelectedProjects] = useState<Project[]>(
    editData
      ? [{ projectCode: editData.projectCode, projectName: editData.projectName, category: editData.category }]
      : copyData
        ? [{ projectCode: copyData.projectCode, projectName: copyData.projectName, category: copyData.category }]
        : []
  )
  const [selectedExtraTasks, setSelectedExtraTasks] = useState<string[]>([])

  // 載入系統中所有案件列表
  useEffect(() => {
    const loadProjects = async () => {
      if (!session?.user) return

      try {
        // 載入所有系統案件，不限用戶
        const response = await fetch(`/api/projects?includeContacts=true`)
        if (response.ok) {
          const allProjects = await response.json()
          console.log('API 返回的原始資料:', allProjects)
          // 轉換格式
          const convertedProjects = allProjects.map((p: any) => ({
            projectCode: p.code || p.projectCode,
            projectName: p.name || p.projectName,
            category: p.category || ''
          }))
          console.log('轉換後的專案資料:', convertedProjects)
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

  // 初始化選中的專案
  useEffect(() => {
    if (editData) {
      setSelectedProjects([{
        projectCode: editData.projectCode,
        projectName: editData.projectName,
        category: editData.category,
      }])
    } else if (copyData) {
      setSelectedProjects([{
        projectCode: copyData.projectCode,
        projectName: copyData.projectName,
        category: copyData.category,
      }])
    } else {
      setSelectedProjects([])
    }
  }, [editData, copyData, open])

  // 重設表單
  const resetForm = () => {
    setFormData({
      projectCode: '',
      projectName: '',
      category: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      startTime: initialMode === 'quick' ? '' : initialMode === 'start' ? originalStartTime : '09:00',
      endTime: '',
      editReason: '',
    })
    setSelectedProjects([])
    setSelectedExtraTasks([])
    setErrors([])
  }

  // 編輯模式初始化
  useEffect(() => {
    if (editData) {
      setFormData({
        projectCode: editData.projectCode,
        projectName: editData.projectName,
        category: editData.category,
        content: editData.content,
        date: new Date(editData.startTime).toISOString().split('T')[0],
        startTime: new Date(editData.startTime).toTimeString().slice(0, 5),
        endTime: editData.endTime ? new Date(editData.endTime).toTimeString().slice(0, 5) : '',
        editReason: '',
      })
    } else if (copyData) {
      setFormData({
        projectCode: copyData.projectCode,
        projectName: copyData.projectName,
        category: copyData.category,
        content: copyData.content,
        date: new Date().toISOString().split('T')[0],
        startTime: initialMode === 'quick' ? '' : initialMode === 'start' ? originalStartTime : '09:00',
        endTime: '',
        editReason: '',
      })
    } else {
      resetForm()
    }
  }, [editData, copyData, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // 處理專案選擇
  const handleProjectSelect = (project: Project) => {
    // 檢查是否已經選擇了這個專案
    const isAlreadySelected = selectedProjects.some(p => p.projectCode === project.projectCode)
    
    if (!isAlreadySelected) {
      // 如果是編輯模式，只允許選擇一個專案
      if (editData) {
        setSelectedProjects([project])
      } else {
        // 否則添加到現有選擇中
        setSelectedProjects(prev => [...prev, project])
      }
    }

    // 更新表單數據
    setFormData(prev => ({
      ...prev,
      projectCode: project.projectCode,
      projectName: project.projectName,
      category: project.category || prev.category,
    }))
  }

  // 處理專案移除
  const handleProjectRemove = (code: string) => {
    setSelectedProjects(prev => prev.filter(p => p.projectCode !== code))
    
    // 如果移除後沒有選中的專案，清空相關欄位
    if (selectedProjects.length <= 1) {
      setFormData(prev => ({
        ...prev,
        projectCode: '',
        projectName: '',
        category: '',
      }))
    }
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

  // 處理額外工作選擇
  const toggleExtraTask = (task: Project) => {
    if (selectedExtraTasks.includes(task.projectCode)) {
      setSelectedExtraTasks(prev => prev.filter(code => code !== task.projectCode))
    } else {
      setSelectedExtraTasks(prev => [...prev, task.projectCode])
      handleProjectSelect(task)
    }
  }

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
            confirmConflicts: true
          }
        } else {
          const targetDate = formData.date || new Date().toISOString().split('T')[0]
          const startTime = formData.startTime || '09:00'
          const fullStart = `${targetDate}T${startTime}:00`
          
          let fullEnd = null as string | null
          if (initialMode === 'full' || initialMode === 'end' || editData || ((initialMode === 'quick' || copyData) && !useQuickApi)) {
            const endTime = formData.endTime
            if (endTime) {
              fullEnd = `${targetDate}T${endTime}:00`
            }
          }

          payload = {
            userId: (session.user as any).id,
            projectCode: proj.projectCode,
            projectName: proj.projectName,
            category: formData.category,
            content: formData.content,
            startTime: fullStart,
            date: targetDate,
            ...(fullEnd && { endTime: fullEnd }),
            ...(editData && { editReason: formData.editReason }),
            confirmConflicts: true
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
          date: new Date().toISOString().split('T')[0],
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

  // 表單驗證
  const validateForm = () => {
    const newErrors: string[] = []

    // 檢查是否至少選擇了一個專案
    if (selectedProjects.length === 0) {
      newErrors.push('請至少選擇一個專案')
    }

    if (!formData.category.trim()) {
      newErrors.push('請選擇工作分類')
    }
    if (!formData.content.trim()) {
      newErrors.push('請輸入工作內容')
    }
    if (!useFullTimeMode && (initialMode === 'quick' || copyData)) {
      // 快速模式不需要驗證時間
    } else {
      if (!formData.startTime) {
        newErrors.push('請輸入開始時間')
      }
      if ((initialMode === 'full' || initialMode === 'end' || editData) && !formData.endTime) {
        newErrors.push('請輸入結束時間')
      }
    }

    // 編輯模式需要填寫編輯原因
    if (editData && !formData.editReason.trim()) {
      newErrors.push('請填寫編輯原因')
    }

    // 打卡模式修改時間超過5分鐘需要填寫原因
    if (needsEditReason() && !formData.editReason.trim()) {
      newErrors.push('修改時間超過5分鐘，請填寫修改原因')
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
          const targetDate = formData.date || new Date().toISOString().split('T')[0]
          const startTime = formData.startTime || '09:00'
          const fullStart = `${targetDate}T${startTime}:00`

          let fullEnd = null as string | null
          if (initialMode === 'full' || initialMode === 'end' || editData || ((initialMode === 'quick' || copyData) && !useQuickApi)) {
            const endTime = formData.endTime
            if (endTime) {
              fullEnd = `${targetDate}T${endTime}:00`
            }
          }

          payload = {
            userId: (session.user as any).id,
            projectCode: proj.projectCode,
            projectName: proj.projectName,
            category: formData.category,
            content: formData.content,
            startTime: fullStart,
            date: targetDate,
            ...(fullEnd && { endTime: fullEnd }),
            ...(editData && { editReason: formData.editReason }),
          }
        }

        if (editData) {
          url = `/api/worklog/${editData.id}`
        }

        // 在打卡模式下添加相關參數（但加班模式除外）
        if (initialMode === 'start' && !isOvertimeMode) {
          payload.isClockMode = true
          // 只有在需要修改原因且有填寫時才傳遞
          if (timeModified && needsEditReason() && formData.editReason) {
            payload.clockEditReason = formData.editReason
          }
        }

        // 在加班模式下標記為加班記錄
        if (isOvertimeMode) {
          payload.isOvertime = true
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
          date: new Date().toISOString().split('T')[0],
          startTime: useQuickApi ? '' : formData.endTime || '17:00',
          endTime: '',
          editReason: '',
        })
        onNext()
      } else if (onSave) {
        // 如果是打卡模式且修改了時間超過5分鐘，傳遞修改原因
        const clockEditReason = (initialMode === 'start' && timeModified && needsEditReason()) ? formData.editReason : undefined
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

  if (!open) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[1200px] w-[1200px] h-[90vh] max-h-[90vh] bg-gray-900/95 backdrop-blur-lg border border-white/20 text-white flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {editData ? '編輯工作紀錄' : copyData ? '複製並新增工作紀錄' : isOvertimeMode ? '⏱ 新增加班紀錄' : '新增工作紀錄'}
            </DialogTitle>
            <DialogDescription>
              請填寫以下表單來{editData ? '編輯' : '新增'}工作紀錄的詳細資訊
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 flex-1 min-h-0">
            {/* 主要表單區域 */}
            <div className="flex-1 space-y-6 py-4 overflow-y-auto workmodal-scroll">
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

              {/* 加班模式指示器 */}
              {isOvertimeMode && (
                <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <span className="text-sm font-medium text-white">
                      🔥 加班模式
                    </span>
                    <span className="text-xs text-white/60 ml-auto">
                      此記錄將標記為加班工作
                    </span>
                  </div>
                </div>
              )}

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

              {/* 工作內容 */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  工作內容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="請詳細描述工作內容..."
                  className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[100px] bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              {/* 編輯原因（僅在編輯模式下顯示） */}
              {editData && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    編輯原因 <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    name="editReason" 
                    placeholder="請說明編輯此工作記錄的原因..." 
                    rows={2} 
                    value={formData.editReason} 
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md bg-orange-500/10 text-white placeholder-orange-200/60 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  />
                  <p className="text-xs text-orange-200/80">
                    ⚠️ 編輯原因將記錄您的IP地址，供管理員審核使用
                  </p>
                </div>
              )}

              {/* 快速記錄模式的時間切換撥桿 */}
              {(initialMode === 'quick' || copyData) && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                  <span className={`text-sm transition-all duration-300 ${useFullTimeMode ? 'text-blue-300 font-medium' : 'text-white/80'} group-hover:text-white`}>
                    完整時間模式
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer group-hover:scale-105 transition-transform duration-200">
                    <input
                      type="checkbox"
                      checked={useFullTimeMode}
                      onChange={(e) => setUseFullTimeMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 after:shadow-sm peer-checked:after:shadow-md transition-all duration-300 ${useFullTimeMode ? 'bg-blue-600 shadow-md shadow-blue-500/30' : 'bg-white/20 hover:bg-white/30'}`}></div>
                  </label>
                </div>
              )}

              {/* 日期與時間選擇器 */}
              <div className="space-y-4">
                {/* 日期選擇器（僅在編輯模式下顯示） */}
                {editData && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      工作日期 <span className="text-red-500">*</span>
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white focus:ring-2 focus:ring-blue-400"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(new Date(formData.date), 'yyyy年MM月dd日', { locale: zhTW }) : '選擇日期'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 bg-white/10 backdrop-blur border border-white/20 rounded-xl"
                        align="start"
                      >
                        <CalendarComponent
                          mode="single"
                          locale={zhTW}
                          selected={formData.date ? new Date(formData.date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, date: date.toISOString().split('T')[0] })
                            }
                          }}
                          initialFocus
                          className="bg-transparent text-white [&_.rdp-button]:text-white [&_.rdp-button]:hover:bg-white/20 [&_.rdp-button[data-selected=true]]:bg-blue-500 [&_.rdp-button[data-selected=true]]:text-white"
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-white/60">
                      💡 編輯工作記錄時可以修改日期，請謹慎操作
                    </p>
                  </div>
                )}

                {/* 時間選擇器 */}
                {(initialMode === 'quick' || copyData) && !useFullTimeMode ? (
                  <div className="text-white/60 text-sm p-3 bg-white/5 rounded-lg border border-white/10">
                    開始與結束時間將自動填入
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        開始時間 <span className="text-red-500">*</span>
                      </label>
                      <SimpleTimePicker 
                        label="" 
                        value={formData.startTime} 
                        onChange={(time: string) => setFormData({ ...formData, startTime: time })} 
                      />
                    </div>
                    {(initialMode === 'full' || initialMode === 'end' || editData || ((initialMode === 'quick' || copyData) && useFullTimeMode)) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          結束時間
                        </label>
                        <SimpleTimePicker 
                          label="" 
                          value={formData.endTime} 
                          onChange={(time: string) => setFormData({ ...formData, endTime: time })} 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 打卡時間修改原因（僅在打卡模式且修改時間超過5分鐘時顯示） */}
              {needsEditReason() && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    時間修改原因 <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    name="editReason" 
                    placeholder="請說明修改打卡時間的原因..." 
                    rows={2} 
                    value={formData.editReason} 
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md bg-yellow-500/10 text-white placeholder-yellow-200/60 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                  />
                  <p className="text-xs text-yellow-200/80">
                    ⚠️ 修改時間超過5分鐘需要說明原因，將記錄到打卡記錄中供管理員審核
                  </p>
                </div>
              )}

              {/* 時間修改提示（5分鐘內的小幅修改） */}
              {initialMode === 'start' && formData.startTime !== originalStartTime && !needsEditReason() && (
                <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3 text-green-100 text-sm">
                  <div className="flex items-center gap-2">
                    <span>✅ 時間修改在5分鐘內，無需填寫原因</span>
                  </div>
                </div>
              )}

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
                {showNext && (
                  <Button 
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                  >
                    {isSubmitting ? '處理中...' : '儲存並新增'}
                  </Button>
                )}
                <Button 
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold min-w-[100px]"
                >
                  {isSubmitting ? '處理中...' : (editData ? '儲存修改' : '完成新增')}
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
              </div>
              
              <div className="p-6 pt-4 flex-shrink-0 border-t border-white/10">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-white/80 text-xs text-center">
                    💡 選擇適用的其他工作類型
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 衝突確認對話框 */}
      <ConflictConfirmModal
        conflicts={conflictData || []}
        onConfirm={handleConfirmConflicts}
        onCancel={handleCancelConflicts}
        open={showConflictModal}
      />
    </>
  )
}
