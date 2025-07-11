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
    const endTime = nowInTaiwan()

    // 查找進行中的加班工作記錄 - 支援兩種方式
    // 1. 透過 /api/overtime/start 創建的 OT 專案記錄
    const ongoingOTWork = await prisma.workLog.findFirst({
      where: {
        userId,
        endTime: null,
        projectCode: 'OT',
      },
      orderBy: { startTime: 'desc' },
    })

    // 2. 透過工作記錄模態視窗標記為加班的記錄
    const ongoingOvertimeWork = await prisma.workLog.findFirst({
      where: {
        userId,
        endTime: null,
        isOvertime: true,
      },
      orderBy: { startTime: 'desc' },
    })

    // 找到任一進行中的加班記錄
    const ongoingWork = ongoingOTWork || ongoingOvertimeWork

    if (!ongoingWork) {
      return new NextResponse('找不到進行中的加班記錄', { status: 400 })
    }

    // 查找對應的 Overtime 記錄（只有透過 /api/overtime/start 創建的才有）
    const ongoingOvertime = await prisma.overtime.findFirst({
      where: {
        userId,
        endTime: null,
      },
      orderBy: { startTime: 'desc' },
    })

    // 使用事務同時更新記錄
    const result = await prisma.$transaction(async (tx) => {
      // 更新工作記錄
      const updatedWorkLog = await tx.workLog.update({
        where: { id: ongoingWork.id },
        data: { endTime },
      })

      // 更新 Overtime 記錄（如果存在）
      let updatedOvertime = null
      if (ongoingOvertime) {
        updatedOvertime = await tx.overtime.update({
          where: { id: ongoingOvertime.id },
          data: {
            endTime,
            endIpAddress: ipAddress,
            endMacAddress: deviceInfo?.macAddress || null,
            endUserAgent: userAgent,
            endDeviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
            status: 'COMPLETED', // 更新狀態為已完成
          },
        })
      }

      return { workLog: updatedWorkLog, overtime: updatedOvertime }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/overtime/end]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
