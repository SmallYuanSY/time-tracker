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
    const includeDeviceInfo = searchParams.get('includeDeviceInfo') === 'true'

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查權限：一般用戶只能查看自己的記錄，管理員可以查看設備資訊
    const sessionUserId = (session.user as any).id
    const isOwnRecord = sessionUserId === userId
    
    if (!isOwnRecord && includeDeviceInfo) {
      // 檢查是否為管理員（可以查看其他人的設備資訊）
      const currentUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { role: true }
      })
      
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'WEB_ADMIN')) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    } else if (!isOwnRecord) {
      return new NextResponse('Forbidden', { status: 403 })
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

    // 根據權限決定查詢的欄位
    const selectFields: any = {
      id: true,
      type: true,
      timestamp: true,
    }

    if (includeDeviceInfo) {
      selectFields.ipAddress = true
      selectFields.macAddress = true
      selectFields.userAgent = true
      selectFields.deviceInfo = true
    }

    // 獲取打卡記錄
    const clockRecords = await prisma.clock.findMany({
      where: whereCondition,
      orderBy: {
        timestamp: 'asc',
      },
      select: selectFields,
    })

    return NextResponse.json(clockRecords)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/clock/history]', error)
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 