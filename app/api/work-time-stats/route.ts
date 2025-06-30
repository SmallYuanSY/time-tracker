import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, parseISO, isWeekend, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

// 將實際工時轉換為法定計算工時（以半小時為單位向下取整）
function calculateLegalHours(actualHours: number): number {
  if (!actualHours || actualHours === 0 || isNaN(actualHours)) return 0
  // 以半小時為單位向下取整
  return Math.floor(actualHours * 2) / 2
}

interface ClockRecord {
  id: string
  userId: string
  type: 'IN' | 'OUT'
  timestamp: string
}

interface DayWorkStats {
  date: string
  isWeekend: boolean
  regularHours: number
  overtime1Hours: number
  overtime1ActualHours: number
  overtime2Hours: number
  overtime2ActualHours: number
  totalOvertimeHours: number
  exceedHours: number
  exceedActualHours: number
  totalWorkHours: number
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
  dailyStats: DayWorkStats[]
}

function analyzeDayWorkTime(dayRecords: ClockRecord[], isWeekendDay: boolean): DayWorkStats {
  const dateStr = dayRecords.length > 0 ? format(parseISO(dayRecords[0].timestamp), 'yyyy-MM-dd') : ''
  
  if (dayRecords.length === 0) {
    return { 
      date: dateStr,
      isWeekend: isWeekendDay,
      regularHours: 0, 
      overtime1Hours: 0, 
      overtime1ActualHours: 0,
      overtime2Hours: 0, 
      overtime2ActualHours: 0,
      totalOvertimeHours: 0, 
      exceedHours: 0, 
      exceedActualHours: 0,
      totalWorkHours: 0 
    }
  }

  // 按時間排序
  const sortedRecords = [...dayRecords].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  let totalWorkMinutes = 0
  let isWorking = false
  let lastInTime: Date | null = null

  // 計算總工作時間（包含所有IN/OUT配對，但排除午休時間）
  for (const record of sortedRecords) {
    if (record.type === 'IN') {
      lastInTime = new Date(record.timestamp)
      isWorking = true
    } else if (record.type === 'OUT' && lastInTime && isWorking) {
      const outTime = new Date(record.timestamp)
      let workMinutes = (outTime.getTime() - lastInTime.getTime()) / (1000 * 60)
      
      // 確保計算結果是有效數值
      if (isNaN(workMinutes) || workMinutes < 0) {
        workMinutes = 0
      }
      
      // 檢查是否跨越午休時間（12:30-13:30）
      const inDate = new Date(lastInTime)
      const outDate = new Date(outTime)
      
      // 設定午休時間（當天的12:30-13:30）
      const lunchStart = new Date(inDate)
      lunchStart.setHours(12, 30, 0, 0)
      const lunchEnd = new Date(inDate)
      lunchEnd.setHours(13, 30, 0, 0)
      
      // 如果工作時間跨越午休時間，則扣除午休時間
      if (inDate < lunchEnd && outDate > lunchStart) {
        const overlapStart = new Date(Math.max(inDate.getTime(), lunchStart.getTime()))
        const overlapEnd = new Date(Math.min(outDate.getTime(), lunchEnd.getTime()))
        
        if (overlapStart < overlapEnd) {
          const lunchMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
          if (!isNaN(lunchMinutes) && lunchMinutes > 0) {
            workMinutes -= lunchMinutes
          }
        }
      }
      
      totalWorkMinutes += Math.max(0, workMinutes) // 確保不會是負數
      isWorking = false
      lastInTime = null
    }
  }

  const totalWorkHours = totalWorkMinutes > 0 ? totalWorkMinutes / 60 : 0

  if (isWeekendDay) {
    // 假日工時：全部都算加班
    const overtime1ActualHours = Math.min(totalWorkHours, 2) // 假日前2小時（實際）
    const overtime2ActualHours = Math.min(Math.max(0, totalWorkHours - 2), 10) // 假日第3-12小時（實際）
    const exceedActualHours = Math.max(0, totalWorkHours - 12) // 超過12小時的部分（實際）
    
    // 法定計算（以半小時為單位）
    const overtime1Hours = calculateLegalHours(overtime1ActualHours)
    const overtime2Hours = calculateLegalHours(overtime2ActualHours)
    const exceedHours = calculateLegalHours(exceedActualHours)
    const totalOvertimeHours = overtime1Hours + overtime2Hours
    
    return { 
      date: dateStr,
      isWeekend: isWeekendDay,
      regularHours: 0, 
      overtime1Hours, 
      overtime1ActualHours,
      overtime2Hours, 
      overtime2ActualHours,
      totalOvertimeHours,
      exceedHours,
      exceedActualHours,
      totalWorkHours
    }
  } else {
    // 平日工時
    const regularHours = Math.min(totalWorkHours, 8) // 每日正常工作時間最多8小時
    const overtimeActualHours = Math.max(0, totalWorkHours - 8) // 超過8小時的部分為加班（實際）
    
    // 分段計算加班時間（實際）
    const overtime1ActualHours = Math.min(overtimeActualHours, 2) // 前2小時加班（實際）
    const overtime2ActualHours = Math.min(Math.max(0, overtimeActualHours - 2), 2) // 後2小時加班（實際）
    const exceedActualHours = Math.max(0, totalWorkHours - 12) // 超過12小時的部分（實際）
    
    // 法定計算（以半小時為單位向下取整）
    const overtime1Hours = calculateLegalHours(overtime1ActualHours)
    const overtime2Hours = calculateLegalHours(overtime2ActualHours)
    const exceedHours = calculateLegalHours(exceedActualHours)
    const totalOvertimeHours = overtime1Hours + overtime2Hours

    return { 
      date: dateStr,
      isWeekend: isWeekendDay,
      regularHours, 
      overtime1Hours, 
      overtime1ActualHours,
      overtime2Hours, 
      overtime2ActualHours,
      totalOvertimeHours,
      exceedHours,
      exceedActualHours,
      totalWorkHours
    }
  }
}

function calculateWorkTimeStats(records: ClockRecord[], periodStart: Date, periodEnd: Date): WorkTimeStats {
  // 按日期分組記錄
  const recordsByDate: { [key: string]: ClockRecord[] } = {}
  
  records.forEach(record => {
    const date = format(parseISO(record.timestamp), 'yyyy-MM-dd')
    if (!recordsByDate[date]) {
      recordsByDate[date] = []
    }
    recordsByDate[date].push(record)
  })

  // 計算每日工作時間
  const dailyStats: DayWorkStats[] = []
  
  Object.entries(recordsByDate).forEach(([dateStr, dayRecords]) => {
    const date = new Date(dateStr)
    const stats = analyzeDayWorkTime(dayRecords, isWeekend(date))
    dailyStats.push(stats)
  })

  // 分別計算平日和假日時間
  const weekdayStats = dailyStats.filter(day => !day.isWeekend)
  const weekendStats = dailyStats.filter(day => day.isWeekend)

  const weekdayRegularHours = weekdayStats.reduce((sum, day) => sum + (day.regularHours || 0), 0)
  const weekdayOvertime1Hours = weekdayStats.reduce((sum, day) => sum + (day.overtime1Hours || 0), 0)
  const weekdayOvertime1ActualHours = weekdayStats.reduce((sum, day) => sum + (day.overtime1ActualHours || 0), 0)
  const weekdayOvertime2Hours = weekdayStats.reduce((sum, day) => sum + (day.overtime2Hours || 0), 0)
  const weekdayOvertime2ActualHours = weekdayStats.reduce((sum, day) => sum + (day.overtime2ActualHours || 0), 0)
  const weekdayTotalOvertimeHours = weekdayStats.reduce((sum, day) => sum + (day.totalOvertimeHours || 0), 0)
  const weekdayExceedHours = weekdayStats.reduce((sum, day) => sum + (day.exceedHours || 0), 0)
  const weekdayExceedActualHours = weekdayStats.reduce((sum, day) => sum + (day.exceedActualHours || 0), 0)
  const weekdayTotalHours = weekdayStats.reduce((sum, day) => sum + (day.totalWorkHours || 0), 0)

  const weekendOvertime1Hours = weekendStats.reduce((sum, day) => sum + (day.overtime1Hours || 0), 0)
  const weekendOvertime1ActualHours = weekendStats.reduce((sum, day) => sum + (day.overtime1ActualHours || 0), 0)
  const weekendOvertime2Hours = weekendStats.reduce((sum, day) => sum + (day.overtime2Hours || 0), 0)
  const weekendOvertime2ActualHours = weekendStats.reduce((sum, day) => sum + (day.overtime2ActualHours || 0), 0)
  const weekendTotalOvertimeHours = weekendStats.reduce((sum, day) => sum + (day.totalOvertimeHours || 0), 0)
  const weekendExceedHours = weekendStats.reduce((sum, day) => sum + (day.exceedHours || 0), 0)
  const weekendExceedActualHours = weekendStats.reduce((sum, day) => sum + (day.exceedActualHours || 0), 0)
  const weekendTotalHours = weekendStats.reduce((sum, day) => sum + (day.totalWorkHours || 0), 0)

  const totalRegularHours = weekdayRegularHours
  const totalOvertime1Hours = weekdayOvertime1Hours + weekendOvertime1Hours
  const totalOvertime1ActualHours = weekdayOvertime1ActualHours + weekendOvertime1ActualHours
  const totalOvertime2Hours = weekdayOvertime2Hours + weekendOvertime2Hours
  const totalOvertime2ActualHours = weekdayOvertime2ActualHours + weekendOvertime2ActualHours
  const totalOvertimeHours = weekdayTotalOvertimeHours + weekendTotalOvertimeHours
  const totalExceedHours = weekdayExceedHours + weekendExceedHours
  const totalExceedActualHours = weekdayExceedActualHours + weekendExceedActualHours
  const totalWorkHours = weekdayTotalHours + weekendTotalHours

  // 檢查法規違反
  const violations: string[] = []
  
  // 檢查每日工作時間
  dailyStats.forEach(day => {
    if (day.totalWorkHours > 12) {
      violations.push(`${day.date}: 當日工作時間${day.totalWorkHours.toFixed(1)}小時，超過法定上限12小時`)
    }
  })

  // 檢查週工作時間（僅計算平日）
  if (weekdayTotalHours > 40) {
    violations.push(`平日工作時間${weekdayTotalHours.toFixed(1)}小時，超過法定週40小時`)
  }

  // 檢查月加班時間
  if (totalOvertimeHours > 46) {
    violations.push(`當期加班時間${totalOvertimeHours.toFixed(1)}小時，超過法定月46小時`)
  }

  return {
    weekdayRegularHours,
    weekdayOvertime1Hours,
    weekdayOvertime1ActualHours,
    weekdayOvertime2Hours,
    weekdayOvertime2ActualHours,
    weekdayTotalOvertimeHours,
    weekdayExceedHours,
    weekdayExceedActualHours,
    weekdayTotalHours,
    weekendOvertime1Hours,
    weekendOvertime1ActualHours,
    weekendOvertime2Hours,
    weekendOvertime2ActualHours,
    weekendTotalOvertimeHours,
    weekendExceedHours,
    weekendExceedActualHours,
    weekendTotalHours,
    totalRegularHours,
    totalOvertime1Hours,
    totalOvertime1ActualHours,
    totalOvertime2Hours,
    totalOvertime2ActualHours,
    totalOvertimeHours,
    totalExceedHours,
    totalExceedActualHours,
    totalWorkHours,
    violations,
    dailyStats
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || (session.user as any).id
    const timeRange = searchParams.get('timeRange') || 'week' // 'week' | 'month'
    const currentDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()

    // 計算時間範圍
    let rangeStart: Date, rangeEnd: Date
    
    if (timeRange === 'month') {
      rangeStart = startOfMonth(currentDate)
      rangeEnd = endOfMonth(currentDate)
    } else {
      rangeStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      rangeEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    }

    // 獲取打卡記錄
    const clockRecords = await prisma.clock.findMany({
      where: {
        userId,
        timestamp: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // 轉換為所需格式
    const formattedRecords: ClockRecord[] = clockRecords.map((record: any) => ({
      id: record.id,
      userId: record.userId,
      type: record.type as 'IN' | 'OUT',
      timestamp: record.timestamp.toISOString(),
    }))

    // 計算統計數據
    const stats = calculateWorkTimeStats(formattedRecords, rangeStart, rangeEnd)

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        timeRange,
        periodStart: rangeStart.toISOString(),
        periodEnd: rangeEnd.toISOString(),
      }
    })

  } catch (error) {
    console.error('計算工作時間統計失敗:', error)
    return NextResponse.json(
      { error: '計算工作時間統計失敗' },
      { status: 500 }
    )
  }
} 