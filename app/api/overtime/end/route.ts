import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/ip-utils'
import { nowInTaiwan } from '@/lib/timezone'

export async function POST(req: NextRequest) {
  try {
    const { userId, deviceInfo } = await req.json()

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const ipAddress = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || ''

    const ongoing = await prisma.workLog.findFirst({
      where: {
        userId,
        endTime: null,
        projectCode: 'OT',
      },
      orderBy: { startTime: 'desc' },
    })

    if (!ongoing) {
      return new NextResponse('No ongoing overtime', { status: 400 })
    }

    const endTime = nowInTaiwan()

    // 更新工作記錄
    const result = await prisma.workLog.update({
      where: { id: ongoing.id },
      data: { endTime },
    })

    // 同時更新加班記錄（如果存在）
    const ongoingOvertime = await prisma.overtime.findFirst({
      where: {
        userId,
        endTime: null,
      },
      orderBy: { startTime: 'desc' },
    })

    if (ongoingOvertime) {
      await prisma.overtime.update({
        where: { id: ongoingOvertime.id },
        data: {
          endTime,
          endIpAddress: ipAddress,
          endMacAddress: deviceInfo?.macAddress || null,
          endUserAgent: userAgent,
          endDeviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        },
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/overtime/end]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
