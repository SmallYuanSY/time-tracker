import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface WhereCondition {
  userId?: string;
  date?: {
    gte?: Date;
    lte?: Date;
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查用戶權限
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return NextResponse.json({ error: '權限不足，只有管理員可以查看考勤記錄' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereCondition: WhereCondition = {}

    if (userId) {
      whereCondition.userId = userId
    }

    if (startDate && endDate) {
      whereCondition.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const clockRecords = await prisma.clock.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 200, // 限制返回數量避免過多數據
    })

    return NextResponse.json(clockRecords)
  } catch (error) {
    console.error('獲取考勤記錄失敗:', error)
    return NextResponse.json({ error: '獲取考勤記錄失敗' }, { status: 500 })
  }
} 