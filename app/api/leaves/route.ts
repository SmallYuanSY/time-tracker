import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Novu } from '@novu/api'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isWeekend } from 'date-fns'

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

// 取得請假記錄
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取當前用戶
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return new NextResponse('用戶不存在', { status: 404 })
    }

    // 獲取相關的請假記錄
    let whereCondition: any = {
      OR: [
        { requesterId: currentUser.id }, // 我的申請
        { agentId: currentUser.id },     // 我需要審核的
      ],
    }

    // 如果是管理員（僅 ADMIN，不包括 WEB_ADMIN），也顯示等待管理員審核的申請
    if (currentUser.role === 'ADMIN') {
      whereCondition.OR.push({ status: 'PENDING_ADMIN' })
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereCondition,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(leaveRequests)
  } catch (error) {
    console.error('[GET /api/leaves]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 新增請假申請
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { agentId, leaveType, reason, startDate, endDate, startTime, endTime, totalHours } = await req.json()

    if (!agentId || !leaveType || !reason || !startDate || !endDate || !startTime || !endTime) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    // 獲取當前用戶
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return new NextResponse('用戶不存在', { status: 404 })
    }

    // 檢查代理人是否存在
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
    })

    if (!agent) {
      return new NextResponse('代理人不存在', { status: 404 })
    }

    // 檢查不能選擇自己作為代理人
    if (currentUser.id === agentId) {
      return new NextResponse('不能選擇自己作為代理人', { status: 400 })
    }

    // 檢查日期是否合法
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new NextResponse('無效的日期格式', { status: 400 })
    }

    if (end < start) {
      return new NextResponse('結束日期不能早於開始日期', { status: 400 })
    }

    // 檢查是否為週末
    if (isWeekend(start) || isWeekend(end)) {
      return new NextResponse('請假日期不能包含週末', { status: 400 })
    }

    // 檢查時間格式
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return new NextResponse('無效的時間格式', { status: 400 })
    }

    // 檢查是否有重疊的請假記錄
    const overlappingLeaves = await prisma.leaveRequest.findMany({
      where: {
        requesterId: currentUser.id,
        status: {
          in: ['PENDING_AGENT', 'PENDING_ADMIN', 'APPROVED']
        },
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gte: new Date(startDate) } }
            ]
          },
          {
            AND: [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(endDate) } }
            ]
          }
        ]
      }
    })

    if (overlappingLeaves.length > 0) {
      return new NextResponse('已有重疊的請假記錄', { status: 400 })
    }

    // 建立請假申請
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        requesterId: currentUser.id,
        agentId,
        leaveType,
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        totalHours,
        status: 'PENDING_AGENT',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 通知代理人
    try {
      await novu.trigger({
        workflowId: 'projoin-notification',
        to: { subscriberId: `user_${agent.id}` },
        payload: {
          title: '請假代理請求',
          body: `${currentUser.name || currentUser.email} 申請${getLeaveTypeText(leaveType)}，指定您為代理人`,
          message: `${currentUser.name || currentUser.email} 申請${getLeaveTypeText(leaveType)}，指定您為代理人\n時間：${startDate} ${startTime} ~ ${endDate} ${endTime}\n時數：${totalHours} 小時`,
        }
      })
    } catch (e) {
      console.error('Novu 發送失敗', e)
    }

    return NextResponse.json(leaveRequest)
  } catch (error) {
    console.error('[POST /api/leaves]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

function getLeaveTypeText(type: string): string {
  const typeMap: { [key: string]: string } = {
    PERSONAL: '事假',
    SICK: '病假',
    ANNUAL: '特休',
    OFFICIAL: '公假',
    FUNERAL: '喪假',
    MARRIAGE: '婚假',
    MATERNITY: '產假',
    PATERNITY: '陪產假',
    OTHER: '其他假'
  }
  return typeMap[type] || '請假'
}
