import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/ip-utils'
import { nowInTaiwan } from '@/lib/timezone'

export async function POST(req: NextRequest) {
  try {
    const { userId, reason, deviceInfo } = await req.json()

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查是否已有進行中的加班
    const ongoingOvertime = await prisma.overtime.findFirst({
      where: {
        userId,
        endTime: null,
      },
      orderBy: { startTime: 'desc' },
    })

    if (ongoingOvertime) {
      return new NextResponse('已有進行中的加班記錄', { status: 400 })
    }

    // 檢查是否已有進行中的加班工作記錄
    const ongoingWork = await prisma.workLog.findFirst({
      where: {
        userId,
        endTime: null,
        projectCode: 'OT',
      },
      orderBy: { startTime: 'desc' },
    })

    if (ongoingWork) {
      return new NextResponse('已有進行中的加班工作記錄', { status: 400 })
    }

    const ipAddress = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || ''
    const startTime = nowInTaiwan()

    // 確保OT專案存在
    let otProject = await prisma.project.findUnique({
      where: { code: 'OT' }
    })

    if (!otProject) {
      // 創建OT專案
      otProject = await prisma.project.create({
        data: {
          code: 'OT',
          name: '加班',
          description: '加班時間記錄',
          category: '管理',
          managerId: userId, // 暫時設為當前用戶，實際上應該是管理員
          status: 'ACTIVE'
        }
      })
    }

    // 使用事務同時創建Overtime記錄和workLog記錄
    const result = await prisma.$transaction(async (tx) => {
      // 創建加班記錄
      const overtimeRecord = await tx.overtime.create({
        data: {
          userId,
          startTime,
          reason: reason || '加班',
          status: 'PENDING',
          startIpAddress: ipAddress,
          startMacAddress: deviceInfo?.macAddress || null,
          startUserAgent: userAgent,
          startDeviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        },
      })

      // 自動將使用者加入OT專案成員（如果尚未加入）
      try {
        await tx.$executeRaw`
          INSERT INTO ProjectToUser (projectId, userId, assignedAt)
          VALUES (${otProject.id}, ${userId}, datetime('now'))
          ON CONFLICT(projectId, userId) DO NOTHING
        `
      } catch (memberError) {
        // 如果加入成員失敗（可能已經是成員），不影響加班記錄創建
        console.log('使用者可能已是OT專案成員')
      }

      // 創建工作記錄
      const workLogRecord = await tx.workLog.create({
        data: {
          userId,
          projectId: otProject.id,
          projectCode: 'OT',
          projectName: '加班',
          category: '管理',
          content: reason || '加班',
          startTime,
        },
      })

      return { overtimeRecord, workLogRecord }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/overtime/start]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
