import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

    const today = format(new Date(), 'yyyy-MM-dd')

    // 使用 Promise.all 平行處理所有查詢
    const [holiday, clockStatus, ongoingOvertime] = await Promise.all([
      // 假日資訊
      prisma.holiday.findUnique({
        where: { date: new Date(today) }
      }),

      // 打卡狀態
      prisma.clock.findMany({
        where: {
          userId,
          timestamp: {
            gte: new Date(today),
            lt: new Date(new Date(today).setDate(new Date(today).getDate() + 1))
          }
        },
        orderBy: { timestamp: 'desc' }
      }),

      // 進行中的加班記錄
      prisma.workLog.findMany({
        where: {
          userId,
          isOvertime: true,
          endTime: null
        }
      })
    ])

    // 處理打卡狀態
    const lastClockIn = clockStatus.find(c => c.type === 'IN')
    const lastClockOut = clockStatus.find(c => c.type === 'OUT')
    const clockedIn = lastClockIn && (!lastClockOut || lastClockIn.timestamp > lastClockOut.timestamp)

    return NextResponse.json({
      holiday,
      clockedIn,
      lastClockIn,
      lastClockOut,
      ongoingOvertime
    })
  } catch (error) {
    console.error('[GET /api/punch-status]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 