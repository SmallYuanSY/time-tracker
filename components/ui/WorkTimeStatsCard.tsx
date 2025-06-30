"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { Clock, AlertTriangle, CheckCircle, XCircle, Calendar, Timer } from 'lucide-react'

interface WorkTimeStatsProps {
  userId: string
  timeRange: 'week' | 'month'
  currentDate: Date
}

interface WorkTimeStats {
  weekdayRegularHours: number
  weekdayOvertime1Hours: number
  weekdayOvertime1ActualHours: number
  weekdayOvertime2Hours: number
  weekdayOvertime2ActualHours: number
  weekdayTotalOvertimeHours: number
  weekdayExceedHours: number
  weekdayExceedActualHours: number
  weekdayTotalHours: number
  weekendOvertime1Hours: number
  weekendOvertime1ActualHours: number
  weekendOvertime2Hours: number
  weekendOvertime2ActualHours: number
  weekendTotalOvertimeHours: number
  weekendExceedHours: number
  weekendExceedActualHours: number
  weekendTotalHours: number
  totalRegularHours: number
  totalOvertime1Hours: number
  totalOvertime1ActualHours: number
  totalOvertime2Hours: number
  totalOvertime2ActualHours: number
  totalOvertimeHours: number
  totalExceedHours: number
  totalExceedActualHours: number
  totalWorkHours: number
  violations: string[]
  timeRange: string
  periodStart: string
  periodEnd: string
}

function formatHours(hours: number): string {
  if (!hours || hours === 0 || isNaN(hours)) return '0小時'
  
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  
  if (minutes === 0) {
    return `${wholeHours}小時`
  } else {
    return `${wholeHours}小時${minutes}分`
  }
}

function formatHoursWithActual(legalHours: number, actualHours: number): string {
  // 處理 NaN 或無效值
  const safeLegalHours = !legalHours || isNaN(legalHours) ? 0 : legalHours
  const safeActualHours = !actualHours || isNaN(actualHours) ? 0 : actualHours
  
  if (safeLegalHours === 0 && safeActualHours === 0) return '0小時'
  
  const legalFormatted = formatHours(safeLegalHours)
  const actualFormatted = formatHours(safeActualHours)
  
  // 如果法定時間和實際時間相同，只顯示一個
  if (Math.abs(safeLegalHours - safeActualHours) < 0.01) {
    return legalFormatted
  }
  
  // 否則顯示 "法定時間（實際時間）"
  return `${legalFormatted}（實際${actualFormatted}）`
}

function getComplianceIcon(hours: number, limit: number) {
  if (hours > limit) {
    return <XCircle className="w-4 h-4 text-red-400" />
  } else if (hours > limit * 0.8) {
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />
  } else {
    return <CheckCircle className="w-4 h-4 text-green-400" />
  }
}

function getComplianceColor(hours: number, limit: number): string {
  if (hours > limit) {
    return 'text-red-400'
  } else if (hours > limit * 0.8) {
    return 'text-yellow-400'
  } else {
    return 'text-green-400'
  }
}

export default function WorkTimeStatsCard({ userId, timeRange, currentDate }: WorkTimeStatsProps) {
  const [stats, setStats] = useState<WorkTimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams({
          userId,
          timeRange,
          date: currentDate.toISOString()
        })
        
        const response = await fetch(`/api/work-time-stats?${params}`)
        
        if (!response.ok) {
          throw new Error('獲取工作時間統計失敗')
        }
        
        const data = await response.json()
        setStats(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知錯誤')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId, timeRange, currentDate])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white/60">載入工作時間統計中...</div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-red-400 text-center">
            {error || '無法載入工作時間統計'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 font-sarasa">
      {/* 標題 */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">
          📊 {timeRange === 'week' ? '當週' : '當月'}工作時間統計
        </h3>
        <p className="text-white/60 text-base">
          {format(new Date(stats.periodStart), 'yyyy/MM/dd')} - {format(new Date(stats.periodEnd), 'yyyy/MM/dd')}
        </p>
      </div>

      {/* 統計卡片網格 */}
      <div className="space-y-2">
        {/* 第一行：正常工時 */}
        <div className="grid grid-cols-1 gap-1">
          <Card className="bg-blue-500/10 border-blue-500/20 backdrop-blur-sm">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-full bg-blue-500/20">
                    <Timer className="w-3 h-3 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white/60 text-sm">正常工時</div>
                    <div className={`font-semibold text-base ${getComplianceColor(stats.weekdayRegularHours, 40)}`}>
                      {formatHours(stats.weekdayRegularHours)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {getComplianceIcon(stats.weekdayRegularHours, 40)}
                  <div className="text-white/40 text-sm mt-1">≤40h/週</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 第二行：平日加班 */}
        <div>
          <h4 className="text-white/80 text-base font-medium mb-1 px-1">平日加班</h4>
          <div className="grid grid-cols-3 gap-1">
            {/* 平日加班前段 */}
            <Card className="bg-orange-500/10 border-orange-500/20 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 rounded-full bg-orange-500/20">
                      <Clock className="w-2.5 h-2.5 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">前段</div>
                      <div className={`font-semibold text-sm ${getComplianceColor(stats.weekdayOvertime1Hours, timeRange === 'month' ? 23 : 6)}`}>
                        {formatHoursWithActual(stats.weekdayOvertime1Hours, stats.weekdayOvertime1ActualHours)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getComplianceIcon(stats.weekdayOvertime1Hours, timeRange === 'month' ? 23 : 6)}
                  </div>
                </div>
                <div className="text-white/40 text-sm mt-1">+1/3薪資</div>
              </CardContent>
            </Card>

            {/* 平日加班後段 */}
            <Card className="bg-red-600/10 border-red-600/20 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 rounded-full bg-red-600/20">
                      <Clock className="w-2.5 h-2.5 text-red-400" />
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">後段</div>
                      <div className={`font-semibold text-sm ${getComplianceColor(stats.weekdayOvertime2Hours, timeRange === 'month' ? 23 : 6)}`}>
                        {formatHoursWithActual(stats.weekdayOvertime2Hours, stats.weekdayOvertime2ActualHours)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getComplianceIcon(stats.weekdayOvertime2Hours, timeRange === 'month' ? 23 : 6)}
                  </div>
                </div>
                <div className="text-white/40 text-sm mt-1">+2/3薪資</div>
              </CardContent>
            </Card>

            {/* 平日加班超時 */}
            <Card className="bg-red-800/20 border-red-800/40 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 rounded-full bg-red-800/30">
                      <AlertTriangle className="w-2.5 h-2.5 text-red-300" />
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">超時</div>
                      <div className="font-semibold text-sm text-red-300">
                        {formatHoursWithActual(stats.weekdayExceedHours, stats.weekdayExceedActualHours)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {stats.weekdayExceedHours > 0 ? <XCircle className="w-2.5 h-2.5 text-red-400" /> : <CheckCircle className="w-2.5 h-2.5 text-green-400" />}
                  </div>
                </div>
                <div className="text-white/40 text-sm mt-1">超過12h</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 第三行：假日加班 */}
        <div>
          <h4 className="text-white/80 text-base font-medium mb-1 px-1">假日加班</h4>
          <div className="grid grid-cols-3 gap-1">
            {/* 假日加班前段 */}
            <Card className="bg-cyan-500/10 border-cyan-500/20 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 rounded-full bg-cyan-500/20">
                      <Clock className="w-2.5 h-2.5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">前段</div>
                      <div className="font-semibold text-sm text-cyan-400">
                        {formatHoursWithActual(stats.weekendOvertime1Hours, stats.weekendOvertime1ActualHours)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <CheckCircle className="w-2.5 h-2.5 text-green-400" />
                  </div>
                </div>
                <div className="text-white/40 text-sm mt-1">+1/3薪資</div>
              </CardContent>
            </Card>

            {/* 假日加班後段 */}
            <Card className="bg-pink-500/10 border-pink-500/20 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 rounded-full bg-pink-500/20">
                      <Clock className="w-2.5 h-2.5 text-pink-400" />
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">後段</div>
                      <div className="font-semibold text-sm text-pink-400">
                        {formatHoursWithActual(stats.weekendOvertime2Hours, stats.weekendOvertime2ActualHours)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <CheckCircle className="w-2.5 h-2.5 text-green-400" />
                  </div>
                </div>
                <div className="text-white/40 text-sm mt-1">+2/3薪資</div>
              </CardContent>
            </Card>

            {/* 假日加班超時 */}
            <Card className="bg-purple-800/20 border-purple-800/40 backdrop-blur-sm">
              <CardContent className="p-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 rounded-full bg-purple-800/30">
                      <AlertTriangle className="w-2.5 h-2.5 text-purple-300" />
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">超時</div>
                      <div className="font-semibold text-sm text-purple-300">
                        {formatHours(stats.weekendExceedHours)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {stats.weekendExceedHours > 0 ? <XCircle className="w-2.5 h-2.5 text-red-400" /> : <CheckCircle className="w-2.5 h-2.5 text-green-400" />}
                  </div>
                </div>
                <div className="text-white/40 text-sm mt-1">超過12h</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 法規提醒 */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            勞基法規定提醒
          </h4>
          <div className="space-y-2 text-base text-white/70">
            <p>• 每日正常工作時間不得超過8小時，每週不得超過40小時</p>
            <p>• 延長工作時間連同正常工作時間，一日不得超過12小時</p>
            <p>• 一個月延長工作時間不得超過46小時</p>
            <p>• 延長工作時間在2小時以內：平日工資加給1/3以上</p>
            <p>• 再延長工作時間在2小時以內：平日工資加給2/3以上</p>
            <p>• 假日工作：全部時間皆為加班，前2小時加給1/3，其餘時間加給2/3</p>
          </div>
        </CardContent>
      </Card>

      {/* 違規警告 */}
      {stats.violations.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <h4 className="text-red-400 font-medium mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              法規違反警告
            </h4>
            <div className="space-y-1">
              {stats.violations.map((violation, index) => (
                <p key={index} className="text-red-300 text-base">
                  ⚠️ {violation}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 超時工作說明 */}
      {stats.totalExceedHours > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <h4 className="text-yellow-400 font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              超時工作提醒
            </h4>
            <div className="space-y-2 text-base text-yellow-200">
              <p>• 檢測到總計 {formatHours(stats.totalExceedHours)} 的超時工作</p>
              <p>• 超過法定12小時上限的工作時間需要特殊管理和補償</p>
              <p>• 建議與管理層討論工作安排，避免長期超時工作</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 