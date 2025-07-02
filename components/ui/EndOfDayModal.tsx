import { Button } from "@/components/ui/button"
import { Portal } from "@/components/ui/portal"
import { useEffect, useState } from "react"
import { format, differenceInMinutes, parse } from "date-fns"

interface OngoingWorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  startTime: Date
}

interface ScheduledWork {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  isCompleted: boolean
  scheduledStartDate: Date
  scheduledEndDate: Date
}

interface WorkTimeInfo {
  firstClockIn: Date | null
  totalWorkMinutes: number
  isAfter6PM: boolean
  hasEnoughWorkTime: boolean
}

export function EndOfDayModal({
  onClose,
  onConfirm,
  userId,
}: {
  onClose: () => void
  onConfirm: () => void
  userId: string
  }) {
  const [ongoingWorkLogs, setOngoingWorkLogs] = useState<OngoingWorkLog[]>([])
  const [incompleteScheduledWorks, setIncompleteScheduledWorks] = useState<ScheduledWork[]>([])
  const [workTimeInfo, setWorkTimeInfo] = useState<WorkTimeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1) // 1: 第一層檢查, 2: 第二層檢查

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // 1. 獲取進行中的工作記錄
        const ongoingResponse = await fetch(`/api/worklog?userId=${userId}&ongoing=true`)
        if (ongoingResponse.ok) {
          const ongoingData = await ongoingResponse.json()
          setOngoingWorkLogs(ongoingData)
        }

        // 2. 獲取今天的預定工作
        const todayStr = format(today, 'yyyy-MM-dd')
        const scheduledResponse = await fetch(`/api/scheduled-work?date=${todayStr}`)
        if (scheduledResponse.ok) {
          const scheduledData = await scheduledResponse.json()
          const incompleteWorks = scheduledData.filter((work: ScheduledWork) => !work.isCompleted)
          setIncompleteScheduledWorks(incompleteWorks)
        }

        // 3. 獲取今天的打卡記錄計算工時
        const clockResponse = await fetch(`/api/clock/history?userId=${userId}&from=${today.toISOString()}&to=${tomorrow.toISOString()}`)
        
        if (clockResponse.ok) {
          const clockData = await clockResponse.json()
          const workTimeInfo = calculateWorkTime(clockData)
          setWorkTimeInfo(workTimeInfo)
        } else {
          // 如果API失敗，設置默認值來觸發檢查
          const defaultWorkTimeInfo = {
            firstClockIn: null,
            totalWorkMinutes: 0,
            isAfter6PM: new Date().getHours() >= 18,
            hasEnoughWorkTime: false
          }
          setWorkTimeInfo(defaultWorkTimeInfo)
        }

      } catch (error) {
        console.error('獲取數據失敗:', error)
        // 發生錯誤時也設置默認值
        const defaultWorkTimeInfo = {
          firstClockIn: null,
          totalWorkMinutes: 0,
          isAfter6PM: new Date().getHours() >= 18,
          hasEnoughWorkTime: false
        }
        setWorkTimeInfo(defaultWorkTimeInfo)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId])

  const calculateWorkTime = (clockRecords: any[]): WorkTimeInfo => {
    const now = new Date()
    const currentTime = format(now, 'HH:mm')
    const isAfter6PM = now.getHours() >= 18

    let firstClockIn: Date | null = null
    let totalWorkMinutes = 0

    // 找出第一次上班打卡時間
    const clockInRecords = clockRecords.filter(record => record.type === 'IN')
    if (clockInRecords.length > 0) {
      firstClockIn = new Date(clockInRecords[0].timestamp)
    }

    // 計算總工作時間（配對上下班打卡）
    const inRecords = clockRecords.filter(r => r.type === 'IN').map(r => new Date(r.timestamp))
    const outRecords = clockRecords.filter(r => r.type === 'OUT').map(r => new Date(r.timestamp))

    // 計算已完成的工作時段
    const completedPairs = Math.min(inRecords.length, outRecords.length)
    for (let i = 0; i < completedPairs; i++) {
      totalWorkMinutes += differenceInMinutes(outRecords[i], inRecords[i])
    }

    // 如果還有未配對的上班打卡（正在工作中），計算到現在的時間
    if (inRecords.length > outRecords.length) {
      totalWorkMinutes += differenceInMinutes(now, inRecords[inRecords.length - 1])
    }

    // 扣除午休時間（假設12:00-13:00，如果工作時間跨越此區間）
    if (firstClockIn && firstClockIn.getHours() < 13) {
      const lunchStart = parse('12:00', 'HH:mm', new Date())
      const lunchEnd = parse('13:00', 'HH:mm', new Date())
      
      // 檢查是否有跨越午休時間的工作
      const hasLunchBreak = inRecords.some(inTime => 
        outRecords.some(outTime => 
          inTime <= lunchStart && outTime >= lunchEnd
        )
      ) || (inRecords.length > outRecords.length && inRecords[inRecords.length - 1] <= lunchStart && now >= lunchEnd)

      if (hasLunchBreak) {
        totalWorkMinutes -= 60 // 扣除1小時午休
      }
    }

    const hasEnoughWorkTime = totalWorkMinutes >= 480 // 8小時 = 480分鐘

    return {
      firstClockIn,
      totalWorkMinutes,
      isAfter6PM,
      hasEnoughWorkTime
    }
  }

  const formatWorkTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小時${mins}分鐘`
  }

  const handleFirstStepConfirm = () => {
    // 檢查工時和時間
    if (workTimeInfo && (!workTimeInfo.isAfter6PM || !workTimeInfo.hasEnoughWorkTime)) {
      setCurrentStep(2) // 進入第二層檢查
    } else {
      onConfirm() // 直接確認下班
    }
  }

  const handleSecondStepConfirm = () => {
    onConfirm() // 強制確認下班
  }

  if (loading) {
    return (
      <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="text-center py-4">
              <div className="text-white/60">載入中...</div>
            </div>
          </div>
        </div>
      </Portal>
    )
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
          {currentStep === 1 ? (
            <>
              <h2 className="text-lg font-semibold mb-4 text-white">🏁 下班確認</h2>
              
              {/* 進行中的工作記錄 */}
              {ongoingWorkLogs.length > 0 && (
                <>
                  <p className="text-sm text-amber-200 mb-3">
                    ⚠️ 系統將自動結算以下 {ongoingWorkLogs.length} 個進行中的工作記錄：
                  </p>
                  <div className="bg-amber-900/30 border border-amber-600/40 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto backdrop-blur-sm">
                    {ongoingWorkLogs.map((log) => (
                      <div key={log.id} className="flex justify-between items-center py-2 border-b border-amber-600/30 last:border-b-0">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-white">
                            {log.projectCode} - {log.projectName}
                          </div>
                          <div className="text-xs text-amber-200/80">
                            {log.category} | 開始時間：{format(new Date(log.startTime), "HH:mm")}
                          </div>
                        </div>
                        <div className="text-xs text-red-400 font-medium bg-red-900/30 px-2 py-1 rounded-full">
                          進行中
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 未完成的預定工作 */}
              {incompleteScheduledWorks.length > 0 && (
                <>
                  <p className="text-sm text-orange-200 mb-3">
                    📋 今日還有 {incompleteScheduledWorks.length} 項預定工作未完成：
                  </p>
                  <div className="bg-orange-900/30 border border-orange-600/40 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto backdrop-blur-sm">
                    {incompleteScheduledWorks.map((work) => (
                      <div key={work.id} className="py-2 border-b border-orange-600/30 last:border-b-0">
                        <div className="font-medium text-sm text-white">
                          {work.projectCode} - {work.projectName}
                        </div>
                        <div className="text-xs text-orange-200/80">
                          {work.category} | {work.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {ongoingWorkLogs.length === 0 && incompleteScheduledWorks.length === 0 && (
                <div className="bg-green-900/30 border border-green-600/40 rounded-lg p-3 mb-4 backdrop-blur-sm">
                  <p className="text-sm text-green-200">
                    ✅ 沒有進行中的工作記錄和未完成的預定工作
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="text-white/80 hover:text-white hover:bg-white/10 border-white/20"
                >
                  取消
                </Button>
                <Button 
                  onClick={handleFirstStepConfirm}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg"
                >
                  確認下班
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4 text-white">⚠️ 工時檢查</h2>
              
              <div className="bg-red-900/30 border border-red-600/40 rounded-lg p-4 mb-4 backdrop-blur-sm">
                <p className="text-sm text-red-200 mb-3 font-medium">
                  🚨 檢測到以下工時問題：
                </p>
                
                {workTimeInfo && (
                  <div className="space-y-2">
                    {!workTimeInfo.isAfter6PM && (
                      <div className="text-sm text-red-200">
                        • 下班時間未滿18:00（目前：{format(new Date(), 'HH:mm')}）
                      </div>
                    )}
                    {!workTimeInfo.hasEnoughWorkTime && (
                      <div className="text-sm text-red-200">
                        • 工作時間不足8小時（已工作：{formatWorkTime(workTimeInfo.totalWorkMinutes)}）
                      </div>
                    )}
                    {workTimeInfo.firstClockIn && (
                      <div className="text-xs text-red-200/70 mt-2">
                        今日首次上班：{format(workTimeInfo.firstClockIn, 'HH:mm')}
                        <br />
                        計算已扣除1小時午休時間
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm text-white/80 mb-4">
                是否確定要在此時下班？
              </p>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentStep(1)}
                  className="text-white/80 hover:text-white hover:bg-white/10 border-white/20"
                >
                  返回
                </Button>
                <Button 
                  onClick={handleSecondStepConfirm}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg"
                >
                  強制下班
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
