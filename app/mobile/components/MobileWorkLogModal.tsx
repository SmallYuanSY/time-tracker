'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { 
  X, ArrowLeft, ArrowRight, Clock, Calendar, 
  Briefcase, FileText, Check, Target, Plus,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

interface Project {
  projectCode: string
  projectName: string
  category: string
}

interface MobileWorkLogModalProps {
  open: boolean
  onClose: () => void
  onSave?: () => void
  initialMode?: 'start' | 'full' | 'end' | 'quick'
  editData?: WorkLog | null
  copyData?: WorkLog | null
  isOvertimeMode?: boolean
  defaultProjectCode?: string
}

const WORK_CATEGORIES = [
  { id: 'development', name: '程式開發', icon: '💻', color: 'bg-blue-500' },
  { id: 'design', name: '設計規劃', icon: '🎨', color: 'bg-purple-500' },
  { id: 'meeting', name: '會議討論', icon: '👥', color: 'bg-green-500' },
  { id: 'testing', name: '測試除錯', icon: '🐛', color: 'bg-red-500' },
  { id: 'documentation', name: '文件撰寫', icon: '📝', color: 'bg-orange-500' },
  { id: 'maintenance', name: '系統維護', icon: '🔧', color: 'bg-gray-500' },
  { id: 'training', name: '學習訓練', icon: '📚', color: 'bg-indigo-500' },
  { id: 'other', name: '其他工作', icon: '📋', color: 'bg-pink-500' },
]

export default function MobileWorkLogModal({
  open,
  onClose,
  onSave,
  initialMode = 'full',
  editData,
  copyData,
  isOvertimeMode = false,
  defaultProjectCode
}: MobileWorkLogModalProps) {
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  // 表單資料
  const [formData, setFormData] = useState({
    projectCode: editData?.projectCode || copyData?.projectCode || defaultProjectCode || '',
    projectName: editData?.projectName || copyData?.projectName || '',
    category: editData?.category || copyData?.category || '',
    content: editData?.content || copyData?.content || '',
    startTime: editData
      ? new Date(editData.startTime).toTimeString().slice(0, 5)
      : '09:00', // 避免 hydration 問題，初始化為固定值
    endTime: editData?.endTime ? new Date(editData.endTime).toTimeString().slice(0, 5) : '',
    editReason: '',
  })

  // 避免 hydration 問題的日期狀態
  const [currentDate, setCurrentDate] = useState<string>('')

  // 客戶端載入後設定當前時間（避免 hydration 問題）
  useEffect(() => {
    const now = new Date()
    setCurrentDate(format(now, 'yyyy年MM月dd日 EEEE', { locale: zhTW }))
    
    if (initialMode === 'start' && !editData) {
      const currentTime = now.toTimeString().slice(0, 5)
      setFormData(prev => ({ ...prev, startTime: currentTime }))
    }
  }, [initialMode, editData])

  // 專案列表
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [searchProject, setSearchProject] = useState('')

  // 載入專案列表
  useEffect(() => {
    const loadProjects = async () => {
      if (!session?.user) return

      try {
        const response = await fetch('/api/projects?includeContacts=true')
        if (response.ok) {
          const allProjects = await response.json()
          const convertedProjects = allProjects.map((p: any) => ({
            projectCode: p.code || p.projectCode,
            projectName: p.name || p.projectName,
            category: '' // 不再使用 project.category
          }))
          setProjects(convertedProjects)
        }
      } catch (error) {
        console.error('載入專案列表失敗:', error)
      }
    }

    if (open) {
      loadProjects()
    }
  }, [session, open])

  // 重置表單
  const resetForm = () => {
    setFormData({
      projectCode: '',
      projectName: '',
      category: '',
      content: '',
      startTime: '09:00', // 避免 hydration 問題
      endTime: '',
      editReason: '',
    })
    setCurrentStep(1)
    setErrors([])
  }

  // 關閉模態框
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // 下一步
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1)
    }
  }

  // 上一步
  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1)
  }

  // 驗證當前步驟
  const validateCurrentStep = () => {
    const newErrors: string[] = []

    switch (currentStep) {
      case 1: // 專案選擇
        if (!formData.projectCode) {
          newErrors.push('請選擇專案')
        }
        break
      case 2: // 分類選擇
        if (!formData.category) {
          newErrors.push('請選擇工作分類')
        }
        break
      case 3: // 工作內容
        if (!formData.content.trim()) {
          newErrors.push('請輸入工作內容')
        }
        break
      case 4: // 時間設定
        if (!formData.startTime) {
          newErrors.push('請輸入開始時間')
        }
        if ((initialMode === 'full' || initialMode === 'end' || editData) && !formData.endTime) {
          newErrors.push('請輸入結束時間')
        }
        break
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  // 選擇專案 - 不再從 project.category 取得預設分類
  const handleProjectSelect = (project: Project) => {
    setFormData(prev => ({
      ...prev,
      projectCode: project.projectCode,
      projectName: project.projectName
      // category 保持不變，讓用戶手動選擇工作分類
    }))
    setShowProjectSelector(false)
  }

  // 選擇分類
  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      category: categoryId
    }))
  }

  // 提交表單
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return
    if (!session?.user) {
      setErrors(['請先登入'])
      return
    }

    setIsSubmitting(true)
    setErrors([])

    try {
      const today = new Date().toISOString().split('T')[0]
      const fullStart = `${today}T${formData.startTime}:00`
      const fullEnd = formData.endTime ? `${today}T${formData.endTime}:00` : null

      const payload = {
        userId: (session.user as any).id,
        projectCode: formData.projectCode,
        projectName: formData.projectName,
        category: formData.category,
        content: formData.content,
        startTime: fullStart,
        date: today,
        ...(fullEnd && { endTime: fullEnd }),
        ...(editData && { editReason: formData.editReason }),
        ...(isOvertimeMode && { isOvertime: true }),
      }

      const url = editData ? `/api/worklog/${editData.id}` : '/api/worklog'
      const method = editData ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || `提交失敗 (${response.status})`)
      }

      onSave?.()
      handleClose()
    } catch (error) {
      console.error('提交工作紀錄失敗:', error)
      setErrors([error instanceof Error ? error.message : '提交失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  // 過濾專案列表
  const filteredProjects = projects.filter(project =>
    project.projectName.toLowerCase().includes(searchProject.toLowerCase()) ||
    project.projectCode.toLowerCase().includes(searchProject.toLowerCase())
  )

  if (!open) return null

  const totalSteps = (initialMode === 'quick' || copyData) && !editData ? 3 : 4

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-t-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 頂部控制欄 */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <div className="flex items-center gap-3">
                {currentStep > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevStep}
                    className="text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                ) : (
                  <div className="w-9 h-9" />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {editData ? '編輯工作記錄' : isOvertimeMode ? '加班記錄' : '新增工作記錄'}
                  </h2>
                  <p className="text-sm text-white/70">
                    步驟 {currentStep} / {totalSteps}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 進度條 */}
            <div className="px-4 py-2">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* 內容區域 */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* 步驟 1: 專案選擇 */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-4"
                  >
                    <div className="text-center text-white mb-6">
                      <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-80" />
                      <h3 className="text-xl font-semibold">選擇專案</h3>
                      <p className="text-sm opacity-70">請選擇要記錄的專案</p>
                    </div>

                    {/* 當前選中的專案 */}
                    {formData.projectCode && (
                      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4 mb-4">
                        <div className="flex items-center justify-between text-white">
                          <div>
                            <div className="font-medium">{formData.projectName}</div>
                            <div className="text-sm opacity-70">{formData.projectCode}</div>
                          </div>
                          <Check className="w-5 h-5 text-green-400" />
                        </div>
                      </Card>
                    )}

                    {/* 專案選擇器 */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                      <Button
                        variant="ghost"
                        className="w-full h-auto p-4 text-white hover:bg-white/10 justify-between"
                        onClick={() => setShowProjectSelector(!showProjectSelector)}
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          <span>{formData.projectCode ? '更換專案' : '選擇專案'}</span>
                        </div>
                        {showProjectSelector ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </Button>

                      {showProjectSelector && (
                        <div className="border-t border-white/20 p-4 space-y-3 max-h-64 overflow-y-auto">
                          {/* 搜尋框 */}
                          <input
                            type="text"
                            placeholder="搜尋專案..."
                            value={searchProject}
                            onChange={(e) => setSearchProject(e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                          />

                          {/* 專案列表 */}
                          {filteredProjects.map((project) => (
                            <Button
                              key={project.projectCode}
                              variant="ghost"
                              className="w-full justify-start p-3 text-white hover:bg-white/10 h-auto"
                              onClick={() => handleProjectSelect(project)}
                            >
                              <div className="text-left">
                                <div className="font-medium">{project.projectName}</div>
                                <div className="text-sm opacity-70">{project.projectCode}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}

                {/* 步驟 2: 分類選擇 */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-4"
                  >
                    <div className="text-center text-white mb-6">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-80" />
                      <h3 className="text-xl font-semibold">工作分類</h3>
                      <p className="text-sm opacity-70">請選擇工作類型</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {WORK_CATEGORIES.map((category) => (
                        <Button
                          key={category.id}
                          variant="outline"
                          className={`h-20 flex flex-col gap-2 border-white/20 text-white transition-all ${
                            formData.category === category.id
                              ? 'bg-white/20 border-white/40 scale-105'
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                          onClick={() => handleCategorySelect(category.id)}
                        >
                          <div className="text-2xl">{category.icon}</div>
                          <span className="text-xs text-center">{category.name}</span>
                          {formData.category === category.id && (
                            <Check className="w-4 h-4 text-green-400 absolute top-1 right-1" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 步驟 3: 工作內容 */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-4"
                  >
                    <div className="text-center text-white mb-6">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-80" />
                      <h3 className="text-xl font-semibold">工作內容</h3>
                      <p className="text-sm opacity-70">請描述具體的工作內容</p>
                    </div>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="請輸入工作內容詳細描述..."
                        rows={6}
                        className="w-full bg-transparent border border-white/20 rounded-lg p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                      />
                      <div className="text-right text-white/60 text-sm mt-2">
                        {formData.content.length} 字
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* 步驟 4: 時間設定 */}
                {currentStep === 4 && (initialMode !== 'quick' && !copyData) && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-4"
                  >
                    <div className="text-center text-white mb-6">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-80" />
                      <h3 className="text-xl font-semibold">時間設定</h3>
                      <p className="text-sm opacity-70">設定工作開始和結束時間</p>
                    </div>

                    <div className="space-y-4">
                      {/* 開始時間 */}
                      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
                        <label className="block text-white font-medium mb-2">開始時間</label>
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                          className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-lg"
                        />
                      </Card>

                      {/* 結束時間 */}
                      {(initialMode === 'full' || initialMode === 'end' || editData) && (
                        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
                          <label className="block text-white font-medium mb-2">結束時間</label>
                          <input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                            className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-lg"
                          />
                        </Card>
                      )}

                      {/* 當前日期顯示 */}
                      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
                        <div className="flex items-center gap-2 text-white">
                          <Calendar className="w-5 h-5" />
                          <span className="font-medium">日期：</span>
                          <span>{currentDate || '載入中...'}</span>
                        </div>
                      </Card>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 錯誤訊息 */}
              {errors.length > 0 && (
                <Card className="bg-red-500/20 border-red-400/30 p-4 mt-4">
                  <div className="text-red-100">
                    {errors.map((error, index) => (
                      <div key={index} className="text-sm">• {error}</div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* 底部按鈕 */}
            <div className="p-4 border-t border-white/20">
              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNextStep}
                  className="w-full h-12 bg-white text-purple-600 hover:bg-white/90 font-semibold text-lg touch-manipulation"
                  disabled={!formData.projectCode && currentStep === 1}
                >
                  下一步
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-white text-purple-600 hover:bg-white/90 font-semibold text-lg touch-manipulation"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600/30 border-t-purple-600" />
                      提交中...
                    </div>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      {editData ? '更新記錄' : '新增記錄'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  )
} 