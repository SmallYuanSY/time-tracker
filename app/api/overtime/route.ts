import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

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

    // 查找進行中的加班工作記錄
    const ongoingWork = await prisma.workLog.findFirst({
      where: {
        userId,
        endTime: null,
        projectCode: 'OT',
      },
      orderBy: { startTime: 'desc' },
    })

    // 查找對應的加班記錄
    const ongoingOvertime = await prisma.overtime.findFirst({
      where: {
        userId,
        endTime: null,
      },
      orderBy: { startTime: 'desc' },
    })

    // 如果有任一記錄存在，表示正在加班
    const isOngoing = ongoingWork || ongoingOvertime
    const startTime = ongoingWork?.startTime || ongoingOvertime?.startTime

    return NextResponse.json({ 
      ongoing: isOngoing ? {
        startTime,
        workLog: ongoingWork,
        overtime: ongoingOvertime
      } : null
    })
  } catch (error) {
    console.error('[GET /api/overtime]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
