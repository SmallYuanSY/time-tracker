import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Novu } from '@novu/api'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    const { agentId, reason, startDate, endDate } = await req.json()

    if (!agentId || !reason || !startDate || !endDate) {
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

    // 建立請假申請
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        requesterId: currentUser.id,
        agentId,
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
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
        workflowId: 'test-notification',
        to: { subscriberId: `user_${agent.id}` },
        payload: {
          title: '請假代理請求',
          body: `${currentUser.name || currentUser.email} 申請請假，指定您為代理人`,
          message: `${currentUser.name || currentUser.email} 申請請假，指定您為代理人`,
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
