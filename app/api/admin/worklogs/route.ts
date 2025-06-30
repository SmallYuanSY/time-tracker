import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: '權限不足，只有管理員可以查看工作記錄' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const userId = searchParams.get('userId')

    if (!start || !end) {
      return NextResponse.json({ error: '缺少時間範圍參數' }, { status: 400 })
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    // 構建查詢條件
    let whereCondition: any = {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    }

    // 如果指定了特定用戶，添加用戶過濾
    if (userId && userId !== 'all') {
      whereCondition.userId = userId
    } else {
      // 只查詢員工的工作記錄
      whereCondition.user = {
        role: 'EMPLOYEE'
      }
    }

    const workLogs = await prisma.workLog.findMany({
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
        startTime: 'desc',
      },
      take: 100, // 限制返回數量避免過多數據
    })

    return NextResponse.json(workLogs)
  } catch (error) {
    console.error('獲取工作記錄失敗:', error)
    return NextResponse.json({ error: '獲取工作記錄失敗' }, { status: 500 })
  }
} 