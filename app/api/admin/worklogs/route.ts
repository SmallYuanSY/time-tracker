import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查是否為管理員
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // 獲取查詢參數
    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end') || new Date(new Date(start!).getTime() + 24 * 60 * 60 * 1000).toISOString() // 如果沒有提供 end，預設為 start + 1 天
    const isOvertime = searchParams.get('isOvertime') === 'true'
    const userId = searchParams.get('userId')

    if (!start) {
      return new NextResponse('Missing start parameter', { status: 400 })
    }

    // 構建查詢條件
    const where: any = {
      startTime: {
        gte: new Date(start),
        lte: new Date(end)
      },
      ...(isOvertime && { isOvertime: true }),
      ...(userId && { userId })
    }

    // 查詢工作記錄
    const workLogs = await prisma.workLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    })

    return NextResponse.json(workLogs)
  } catch (error) {
    console.error('Error fetching work logs:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 