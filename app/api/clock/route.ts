// app/api/clock/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { userId, type } = await req.json()

    if (!userId || !type) {
      return new NextResponse('Missing userId or type', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 如果是下班打卡，需要先結算所有進行中的工作記錄
    if (type === 'OUT') {
      const now = new Date()
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      // 取得所有未結束且開始時間早於目前時間的工作記錄
      const ongoingWorkLogs = await prisma.workLog.findMany({
        where: {
          userId,
          endTime: null,
          startTime: { lte: now },
        },
      })

      if (ongoingWorkLogs.length > 0) {
        const { Novu } = await import('@novu/api')
        const novu = new Novu({
          secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY,
        })

        let needNotify = false

        for (const log of ongoingWorkLogs) {
          const limit = new Date(log.startTime)
          limit.setDate(limit.getDate() + 1)
          limit.setHours(8, 0, 0, 0)

          const endTime = now > limit ? limit : now

          if (log.startTime < startOfToday && now > limit) {
            needNotify = true
          }

          await prisma.workLog.update({
            where: { id: log.id },
            data: { endTime },
          })
        }

        if (needNotify) {
          try {
            await novu.trigger({
              workflowId: 'test-notification',
              to: { subscriberId: `user_${userId}` },
              payload: {
                title: '未打下班卡提醒',
                body: '您昨天忘記下班打卡，系統已自動將時間結算至早上 8 點。',
                message: '您昨天忘記下班打卡，系統已自動將時間結算至早上 8 點。',
              },
            })
          } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('發送未打卡通知失敗:', e)
            }
          }
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log(`下班打卡：自動結算了 ${ongoingWorkLogs.length} 個進行中的工作記錄`)
        }
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/clock]', error)
    }
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

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取今日日期範圍
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 獲取昨日日期範圍（用於跨日判斷）
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

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
        timestamp: 'desc',
      },
    })

    // 獲取昨日的打卡記錄（用於跨日判斷）
    const yesterdayClocks = await prisma.clock.findMany({
      where: {
        userId,
        timestamp: {
          gte: yesterday,
          lt: today,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    // 判斷當前狀態
    let clockedIn = false
    let lastClockIn = null
    let lastClockOut = null

    // 先從今日記錄中找最後的上班和下班
    for (const clock of todayClocks) {
      if (clock.type === 'IN' && !lastClockIn) {
        lastClockIn = clock
      }
      if (clock.type === 'OUT' && !lastClockOut) {
        lastClockOut = clock
      }
    }

    // 判斷當前時間
    const now = new Date()
    const hour = now.getHours()

    // 判斷當前是否為上班狀態
    if (lastClockIn && lastClockOut) {
      // 今日都有上班和下班記錄，比較時間
      clockedIn = lastClockIn.timestamp > lastClockOut.timestamp
    } else if (lastClockIn && !lastClockOut) {
      // 今日只有上班記錄，沒有下班記錄
      clockedIn = true
    } else if (!lastClockIn && !lastClockOut) {
      // 今日沒有任何打卡記錄
      // 如果現在是早上（0-8點），需要檢查昨天的狀態
      if (hour < 8) {
        // 檢查昨天最後的打卡記錄
        let yesterdayLastClockIn = null
        let yesterdayLastClockOut = null
        
        for (const clock of yesterdayClocks) {
          if (clock.type === 'IN' && !yesterdayLastClockIn) {
            yesterdayLastClockIn = clock
          }
          if (clock.type === 'OUT' && !yesterdayLastClockOut) {
            yesterdayLastClockOut = clock
          }
        }
        
                 // 如果昨天有上班但沒下班，可能還在上班狀態
         if (yesterdayLastClockIn && !yesterdayLastClockOut) {
           clockedIn = true
         } else if (yesterdayLastClockIn && yesterdayLastClockOut) {
           // 昨天都有記錄，比較時間
           clockedIn = new Date(yesterdayLastClockIn.timestamp) > new Date(yesterdayLastClockOut.timestamp)
         } else {
           // 昨天沒有記錄或只有下班記錄
           clockedIn = false
         }
      } else {
        // 白天或晚上，沒有打卡記錄就是下班狀態
        clockedIn = false
      }
    } else {
      // 今日只有下班記錄，沒有上班記錄
      clockedIn = false
    }

    return NextResponse.json({
      clockedIn,
      lastClockIn: lastClockIn?.timestamp || null,
      lastClockOut: lastClockOut?.timestamp || null,
      todayClocks,
      yesterdayClocks, // 提供昨日記錄供前端參考
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/clock]', error)
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
