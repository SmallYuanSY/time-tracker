import { Button } from "@/components/ui/button"
import { Portal } from "@/components/ui/portal"
import { useEffect, useState } from "react"
import { format } from "date-fns"

interface OngoingWorkLog {
  id: string
  projectCode: string
  projectName: string
  category: string
  startTime: Date
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOngoingWorkLogs = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const response = await fetch(`/api/worklog?userId=${userId}&from=${today.toISOString()}&to=${tomorrow.toISOString()}&ongoingOnly=true`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('獲取的進行中工作記錄:', data)
          setOngoingWorkLogs(data)
        } else {
          console.error('API 請求失敗:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('獲取進行中工作記錄失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchOngoingWorkLogs()
    }
  }, [userId])

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
          <h2 className="text-lg font-semibold mb-4 text-white">🏁 下班確認</h2>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="text-white/60">載入中...</div>
            </div>
          ) : (
            <>
              {ongoingWorkLogs.length > 0 ? (
                <>
                  <p className="text-sm text-amber-200 mb-3">
                    ⚠️ 系統將自動結算以下 {ongoingWorkLogs.length} 個進行中的工作記錄：
                  </p>
                  <div className="bg-amber-900/30 border border-amber-600/40 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto backdrop-blur-sm">
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
                  <p className="text-xs text-white/60 mb-4">
                    ✅ 結束時間將設定為下班打卡的時間
                  </p>
                </>
              ) : (
                <div className="bg-green-900/30 border border-green-600/40 rounded-lg p-3 mb-4 backdrop-blur-sm">
                  <p className="text-sm text-green-200">
                    ✅ 沒有進行中的工作記錄需要結算
                  </p>
                </div>
              )}
            </>
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
              onClick={onConfirm}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg"
            >
              {ongoingWorkLogs.length > 0 ? '確認下班並結算' : '確認下班'}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
