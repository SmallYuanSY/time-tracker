// app/api/clock/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function POST(req: NextRequest) {
  try {
    const { userId, type } = await req.json()

    if (!userId || !type) {
      return new NextResponse('Missing userId or type', { status: 400 })
    }

    const session = await getServerSession()
    if (!session?.user?.id || session.user.id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 如果是下班打卡，需要先結算所有進行中的工作記錄
    if (type === 'OUT') {
      // 獲取今日日期範圍
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 查找今日所有沒有結束時間的工作記錄
      const ongoingWorkLogs = await prisma.workLog.findMany({
        where: {
          userId,
          startTime: {
            gte: today,
            lt: tomorrow,
          },
          endTime: null, // 沒有結束時間的記錄
        },
      })

      // 取得當前時間作為結束時間
      const now = new Date()

      // 批量更新所有進行中的工作記錄，設定結束時間
      if (ongoingWorkLogs.length > 0) {
        await prisma.workLog.updateMany({
          where: {
            id: {
              in: ongoingWorkLogs.map(log => log.id)
            }
          },
          data: {
            endTime: now
          }
        })

        console.log(`下班打卡：自動結算了 ${ongoingWorkLogs.length} 個進行中的工作記錄`)
      }
    }

    // 執行打卡記錄
    const result = await prisma.clock.create({
      data: {
        userId,
        type, // 必須為 "IN" 或 "OUT"
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/clock]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

    const session = await getServerSession()
    if (!session?.user?.id || session.user.id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取今日日期範圍
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 獲取今日的打卡記錄，按時間排序
    const todayClocks = await prisma.clock.findMany({
      where: {
        userId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        timestamp: 'desc', // 最新的在前面
      },
    })

    // 判斷當前狀態
    let clockedIn = false
    let lastClockIn = null
    let lastClockOut = null

    // 找到最後的上班和下班記錄
    for (const clock of todayClocks) {
      if (clock.type === 'IN' && !lastClockIn) {
        lastClockIn = clock
      }
      if (clock.type === 'OUT' && !lastClockOut) {
        lastClockOut = clock
      }
    }

    // 判斷當前是否為上班狀態
    if (lastClockIn && lastClockOut) {
      // 如果都有記錄，比較時間
      clockedIn = lastClockIn.timestamp > lastClockOut.timestamp
    } else if (lastClockIn && !lastClockOut) {
      // 只有上班記錄，沒有下班記錄
      clockedIn = true
    } else {
      // 沒有上班記錄或只有下班記錄
      clockedIn = false
    }

    return NextResponse.json({
      clockedIn,
      lastClockIn: lastClockIn?.timestamp || null,
      lastClockOut: lastClockOut?.timestamp || null,
      todayClocks,
    })
  } catch (error) {
    console.error('[GET /api/clock]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
