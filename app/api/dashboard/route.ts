import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { nowInTaiwan, getTaiwanDayRange } from '@/lib/timezone'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const date = searchParams.get('date')

    if (!userId || !date) {
      return new NextResponse('Missing required parameters', { status: 400 })
    }

    // 使用 Promise.all 平行處理所有查詢
    const [
      user,
      clockRecords,
      workLogs,
      scheduledWorks,
      holiday,
      settings,
      workTimeStats
    ] = await Promise.all([
      // 使用者資訊
      prisma.user.findUnique({
        where: { id: userId }
      }),
      
      // 打卡記錄
      prisma.clock.findMany({
        where: {
          userId,
          timestamp: {
            gte: new Date(date),
            lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
          }
        },
        orderBy: { timestamp: 'asc' }
      }),

      // 工作記錄
      prisma.workLog.findMany({
        where: {
          userId,
          startTime: {
            gte: new Date(date),
            lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
          }
        },
        orderBy: { startTime: 'asc' }
      }),

      // 預定工作
      prisma.scheduledWork.findMany({
        where: {
          userId,
          date: new Date(date)
        }
      }),

      // 假日資訊
      prisma.holiday.findUnique({
        where: { date: new Date(date) }
      }),

      // 使用者設定
      prisma.userSettings.findUnique({
        where: { userId }
      }),

      // 工時統計
      prisma.workTimeStats.findFirst({
        where: {
          userId,
          date: new Date(date)
        }
      })
    ])

    return NextResponse.json({
      user,
      clockRecords,
      workLogs,
      scheduledWorks,
      holiday,
      settings,
      workTimeStats
    })
  } catch (error) {
    console.error('[GET /api/dashboard]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 