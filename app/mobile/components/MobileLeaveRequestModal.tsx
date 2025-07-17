'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/ui/portal'
import { 
  X, Calendar, Clock, User, FileText, ChevronDown, 
  CheckCircle, AlertCircle 
} from 'lucide-react'
import { format, differenceInHours, isWeekend } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'WEB_ADMIN' | 'EMPLOYEE'
}

interface MobileLeaveRequestModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// 請假類型選項
const LEAVE_TYPES = [
  { value: 'PERSONAL', label: '事假', color: 'bg-blue-500' },
  { value: 'SICK', label: '病假', color: 'bg-red-500' },
  { value: 'ANNUAL', label: '特休', color: 'bg-green-500' },
  { value: 'OFFICIAL', label: '公假', color: 'bg-purple-500' },
  { value: 'FUNERAL', label: '喪假', color: 'bg-gray-500' },
  { value: 'MARRIAGE', label: '婚假', color: 'bg-pink-500' },
  { value: 'MATERNITY', label: '產假', color: 'bg-yellow-500' },
  { value: 'PATERNITY', label: '陪產假', color: 'bg-indigo-500' },
  { value: 'OTHER', label: '其他', color: 'bg-orange-500' }
]

// 時間選項（每30分鐘）
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
})

export default function MobileLeaveRequestModal({ 
  open, 
  onClose, 
  onSuccess 
}: MobileLeaveRequestModalProps) {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  
  // Refs for dropdown positioning
  const leaveTypeButtonRef = useRef<HTMLButtonElement>(null)
  const agentButtonRef = useRef<HTMLButtonElement>(null)
  const startTimeButtonRef = useRef<HTMLButtonElement>(null)
  const endTimeButtonRef = useRef<HTMLButtonElement>(null)
  
  
  const [users, setUsers] = useState<User[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    agentId: '',
    leaveType: 'PERSONAL',
    reason: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '18:00',
  })

  const [showDropdowns, setShowDropdowns] = useState({
    leaveType: false,
    agent: false,
    startTime: false,
    endTime: false,
  })

  // 確保 hydration 一致性
  useEffect(() => {
    setMounted(true)
  }, [])

  // 載入代理人列表
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        const filteredUsers = data.filter((user: User) => 
          user.role !== 'WEB_ADMIN' && user.email !== session?.user?.email
        )
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('載入用戶失敗:', error)
    }
  }

  useEffect(() => {
    if (open) {
      loadUsers()
      // 重置表單
      setFormData({
        agentId: '',
        leaveType: 'PERSONAL',
        reason: '',
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '18:00',
      })
      setErrors([])
    }
  }, [open])

  // 計算請假時數
  const calculateTotalHours = () => {
    if (!formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
      return 0
    }

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
      
      if (endDateTime <= startDateTime) return 0
      
      return Math.max(0, differenceInHours(endDateTime, startDateTime))
    } catch {
      return 0
    }
  }

  // 表單驗證
  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.agentId) newErrors.push('請選擇代理人')
    if (!formData.reason.trim()) newErrors.push('請填寫請假原因')
    if (!formData.startDate) newErrors.push('請選擇開始日期')
    if (!formData.endDate) newErrors.push('請選擇結束日期')

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (endDate < startDate) {
        newErrors.push('結束日期不能早於開始日期')
      }
      
      if (isWeekend(startDate) || isWeekend(endDate)) {
        newErrors.push('請假日期不能包含週末')
      }
    }

    const totalHours = calculateTotalHours()
    if (totalHours <= 0) {
      newErrors.push('請假時數必須大於 0')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  // 提交表單
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const totalHours = calculateTotalHours()
      
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          totalHours,
        }),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const errorData = await response.text()
        setErrors([errorData || '提交失敗，請稍後再試'])
      }
    } catch (error) {
      console.error('提交請假申請失敗:', error)
      setErrors(['提交失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  // 獲取今天的日期字串（用於 min 屬性）
  const getTodayString = () => {
    if (!mounted) return ''
    return format(new Date(), 'yyyy-MM-dd')
  }

  // 關閉所有下拉選單
  const closeAllDropdowns = () => {
    setShowDropdowns({
      leaveType: false,
      agent: false,
      startTime: false,
      endTime: false,
    })
  }

  const selectedLeaveType = LEAVE_TYPES.find(type => type.value === formData.leaveType)
  const selectedAgent = users.find(user => user.id === formData.agentId)

  // 檢查是否有任何下拉選單展開
  const hasOpenDropdown = Object.values(showDropdowns).some(isOpen => isOpen)

  // 創建 Portal 下拉選單的通用函數
  const createPortalDropdown = (
    isOpen: boolean,
    buttonRef: React.RefObject<HTMLButtonElement | null>,
    onClose: () => void,
    children: React.ReactNode
  ) => {
    if (!isOpen || !mounted || !buttonRef.current) return null
    
    const rect = buttonRef.current.getBoundingClientRect()
    
    return (
      <Portal>
        <div 
          className="fixed inset-0 z-[99999]"
          onClick={onClose}
        >
          <div 
            className="absolute bg-white/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            style={{
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX,
              width: rect.width,
              maxHeight: Math.min(240, window.innerHeight - rect.bottom - 20)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </Portal>
    )
  }

  // 防止 hydration 錯誤
  if (!mounted || !open) return null

  return (
    <div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80"
            onClick={() => {
              closeAllDropdowns()
              onClose()
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 rounded-t-3xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 標題欄 */}
              <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-lg border-b border-white/20">
                <h2 className="text-xl font-semibold text-white">申請請假</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* 表單內容 */}
              <div className={`p-4 max-h-[calc(90vh-80px)] space-y-4 ${hasOpenDropdown ? 'overflow-visible' : 'overflow-y-auto'}`}>
                {/* 錯誤訊息 */}
                {errors.length > 0 && (
                  <Card className="bg-red-500/20 border-red-400/30 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-200 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        {errors.map((error, index) => (
                          <div key={index} className="text-red-200 text-sm">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                {/* 請假類型 */}
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4 overflow-visible">
                  <label className="text-white font-medium mb-2 block">請假類型</label>
                  <div className="relative">
                    <button
                      ref={leaveTypeButtonRef}
                      type="button"
                      onClick={() => {
                        closeAllDropdowns()
                        setShowDropdowns(prev => ({ ...prev, leaveType: !prev.leaveType }))
                      }}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white flex items-center justify-between touch-manipulation"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${selectedLeaveType?.color || 'bg-gray-500'}`} />
                        <span>{selectedLeaveType?.label || '請選擇'}</span>
                      </div>
                      <ChevronDown className="w-5 h-5" />
                    </button>
                    
                  </div>
                </Card>

                {/* 代理人 */}
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4 overflow-visible">
                  <label className="text-white font-medium mb-2 block">代理人</label>
                  <div className="relative">
                    <button
                      ref={agentButtonRef}
                      type="button"
                      onClick={() => {
                        closeAllDropdowns()
                        setShowDropdowns(prev => ({ ...prev, agent: !prev.agent }))
                      }}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white flex items-center justify-between touch-manipulation"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4" />
                        <span>{selectedAgent?.name || selectedAgent?.email || '請選擇代理人'}</span>
                      </div>
                      <ChevronDown className="w-5 h-5" />
                    </button>
                    
                  </div>
                </Card>

                {/* 開始日期和時間 */}
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
                  <label className="text-white font-medium mb-3 block">開始日期和時間</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 開始日期 */}
                    <div className="relative">
                      <label className="text-white/80 text-sm mb-1 block">日期</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        min={getTodayString()}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 [color-scheme:dark] touch-manipulation text-sm"
                      />
                      <Calendar className="absolute right-2 top-[30px] w-4 h-4 text-white/60 pointer-events-none" />
                    </div>
                    
                    {/* 開始時間 */}
                    <div className="relative overflow-visible">
                      <label className="text-white/80 text-sm mb-1 block">時間</label>
                      <button
                        ref={startTimeButtonRef}
                        type="button"
                        onClick={() => {
                          closeAllDropdowns()
                          setShowDropdowns(prev => ({ ...prev, startTime: !prev.startTime }))
                        }}
                        className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg text-white flex items-center justify-between touch-manipulation text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formData.startTime}</span>
                        </div>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>

                {/* 結束日期和時間 */}
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
                  <label className="text-white font-medium mb-3 block">結束日期和時間</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 結束日期 */}
                    <div className="relative">
                      <label className="text-white/80 text-sm mb-1 block">日期</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        min={formData.startDate || getTodayString()}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 [color-scheme:dark] touch-manipulation text-sm"
                      />
                      <Calendar className="absolute right-2 top-[30px] w-4 h-4 text-white/60 pointer-events-none" />
                    </div>
                    
                    {/* 結束時間 */}
                    <div className="relative overflow-visible">
                      <label className="text-white/80 text-sm mb-1 block">時間</label>
                      <button
                        ref={endTimeButtonRef}
                        type="button"
                        onClick={() => {
                          closeAllDropdowns()
                          setShowDropdowns(prev => ({ ...prev, endTime: !prev.endTime }))
                        }}
                        className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg text-white flex items-center justify-between touch-manipulation text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formData.endTime}</span>
                        </div>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>

                {/* 請假時數顯示 */}
                {calculateTotalHours() > 0 && (
                  <Card className="bg-blue-500/20 border-blue-400/30 p-3">
                    <div className="flex items-center gap-2 text-blue-200">
                      <Clock className="w-5 h-5" />
                      <span className="font-medium">
                        預計請假時數：{calculateTotalHours()} 小時
                      </span>
                    </div>
                  </Card>
                )}

                {/* 請假原因 */}
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
                  <label className="text-white font-medium mb-2 block">請假原因</label>
                  <div className="relative">
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="請詳細說明請假原因..."
                      rows={3}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none touch-manipulation"
                    />
                    <FileText className="absolute right-3 top-3 w-5 h-5 text-white/60 pointer-events-none" />
                  </div>
                </Card>

                {/* 提交按鈕 */}
                <div className="sticky bottom-0 bg-gradient-to-t from-orange-600 via-red-600 to-transparent pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full h-14 bg-white text-orange-600 hover:bg-white/90 font-semibold text-lg touch-manipulation disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-600/30 border-t-orange-600" />
                        <span>提交中...</span>
                      </div>
                    ) : (
                      '提交請假申請'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal 下拉選單 */}
      {createPortalDropdown(
        showDropdowns.leaveType,
        leaveTypeButtonRef,
        () => setShowDropdowns(prev => ({ ...prev, leaveType: false })),
        <>
          {LEAVE_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, leaveType: type.value }))
                setShowDropdowns(prev => ({ ...prev, leaveType: false }))
              }}
              className="w-full p-3 text-left hover:bg-black/10 flex items-center gap-3 touch-manipulation"
            >
              <div className={`w-4 h-4 rounded-full ${type.color}`} />
              <span className="text-gray-900">{type.label}</span>
              {formData.leaveType === type.value && (
                <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
              )}
            </button>
          ))}
        </>
      )}

      {createPortalDropdown(
        showDropdowns.agent,
        agentButtonRef,
        () => setShowDropdowns(prev => ({ ...prev, agent: false })),
        <>
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, agentId: user.id }))
                setShowDropdowns(prev => ({ ...prev, agent: false }))
              }}
              className="w-full p-3 text-left hover:bg-black/10 flex items-center gap-3 touch-manipulation"
            >
              <User className="w-4 h-4 text-gray-600" />
              <div>
                <div className="text-gray-900 font-medium">{user.name}</div>
                <div className="text-gray-600 text-sm">{user.email}</div>
              </div>
              {formData.agentId === user.id && (
                <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
              )}
            </button>
          ))}
        </>
      )}

      {createPortalDropdown(
        showDropdowns.startTime,
        startTimeButtonRef,
        () => setShowDropdowns(prev => ({ ...prev, startTime: false })),
        <>
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, startTime: time }))
                setShowDropdowns(prev => ({ ...prev, startTime: false }))
              }}
              className="w-full p-2 text-left hover:bg-black/10 text-gray-900 touch-manipulation"
            >
              {time}
              {formData.startTime === time && (
                <CheckCircle className="w-4 h-4 text-green-600 float-right mt-0.5" />
              )}
            </button>
          ))}
        </>
      )}

      {createPortalDropdown(
        showDropdowns.endTime,
        endTimeButtonRef,
        () => setShowDropdowns(prev => ({ ...prev, endTime: false })),
        <>
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, endTime: time }))
                setShowDropdowns(prev => ({ ...prev, endTime: false }))
              }}
              className="w-full p-2 text-left hover:bg-black/10 text-gray-900 touch-manipulation"
            >
              {time}
              {formData.endTime === time && (
                <CheckCircle className="w-4 h-4 text-green-600 float-right mt-0.5" />
              )}
            </button>
          ))}
        </>
      )}
    </div>
  )
}