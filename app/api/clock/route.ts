// app/api/clock/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, type } = await req.json()

    if (!userId || !type) {
      return new NextResponse('Missing userId or type', { status: 400 })
    }

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
