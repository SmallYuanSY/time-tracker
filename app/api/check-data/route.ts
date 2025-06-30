// API：檢查資料庫時間資料
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatTaiwanTime } from '@/lib/timezone'

export async function GET(req: NextRequest) {
  try {
    // 獲取最近的一些記錄來檢查
    const [recentClocks, recentWorkLogs, recentOvertimes] = await Promise.all([
      prisma.clock.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.workLog.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.overtime.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      })
    ])

    // 格式化時間資料
    const formattedData = {
      clocks: recentClocks.map(clock => ({
        id: clock.id,
        user: clock.user.name || clock.user.email,
        type: clock.type,
        rawTimestamp: clock.timestamp.toISOString(),
        taiwanTime: formatTaiwanTime(clock.timestamp, 'yyyy/MM/dd HH:mm:ss (E)'),
        isEdited: clock.isEdited
      })),
      workLogs: recentWorkLogs.map(log => ({
        id: log.id,
        user: log.user.name || log.user.email,
        projectCode: log.projectCode,
        rawStartTime: log.startTime.toISOString(),
        taiwanStartTime: formatTaiwanTime(log.startTime, 'yyyy/MM/dd HH:mm:ss'),
        rawEndTime: log.endTime?.toISOString() || null,
        taiwanEndTime: log.endTime ? formatTaiwanTime(log.endTime, 'yyyy/MM/dd HH:mm:ss') : '進行中'
      })),
      overtimes: recentOvertimes.map(overtime => ({
        id: overtime.id,
        user: overtime.user.name || overtime.user.email,
        reason: overtime.reason,
        rawStartTime: overtime.startTime.toISOString(),
        taiwanStartTime: formatTaiwanTime(overtime.startTime, 'yyyy/MM/dd HH:mm:ss'),
        rawEndTime: overtime.endTime?.toISOString() || null,
        taiwanEndTime: overtime.endTime ? formatTaiwanTime(overtime.endTime, 'yyyy/MM/dd HH:mm:ss') : '進行中'
      }))
    }

    return NextResponse.json({
      success: true,
      message: '資料檢查完成',
      data: formattedData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('檢查資料失敗:', error)
    return NextResponse.json({
      success: false,
      message: '檢查資料失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
} 