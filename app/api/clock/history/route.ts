import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 建立日期範圍查詢條件
    const whereCondition: any = { userId }
    
    if (from || to) {
      whereCondition.timestamp = {}
      if (from) {
        whereCondition.timestamp.gte = new Date(from)
      }
      if (to) {
        whereCondition.timestamp.lte = new Date(to)
      }
    }

    // 獲取打卡記錄
    const clockRecords = await prisma.clock.findMany({
      where: whereCondition,
      orderBy: {
        timestamp: 'asc',
      },
      select: {
        id: true,
        type: true,
        timestamp: true,
      },
    })

    return NextResponse.json(clockRecords)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/clock/history]', error)
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 