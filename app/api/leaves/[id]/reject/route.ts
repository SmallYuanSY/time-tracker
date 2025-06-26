import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Novu } from '@novu/api'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

    // 獲取請假申請
    const existingLeave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        requester: true,
        agent: true,
      }
    })

    if (!existingLeave) {
      return new NextResponse('請假申請不存在', { status: 404 })
    }

    // 根據當前狀態和用戶權限決定拒絕狀態
    let rejectionStatus: 'AGENT_REJECTED' | 'ADMIN_REJECTED'
    
    if (existingLeave.status === 'PENDING_AGENT' && existingLeave.agentId === currentUser.id) {
      rejectionStatus = 'AGENT_REJECTED'
    } else if (existingLeave.status === 'PENDING_ADMIN' && currentUser.role === 'ADMIN') {
      rejectionStatus = 'ADMIN_REJECTED'
    } else {
      return new NextResponse('無權限拒絕此請假申請', { status: 403 })
    }

    const leave = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status: rejectionStatus }
    })

    // 通知申請人
    try {
      const messageTitle = rejectionStatus === 'AGENT_REJECTED' 
        ? '請假申請已被代理人拒絕'
        : '請假申請已被管理員拒絕'
      
      const messageBody = rejectionStatus === 'AGENT_REJECTED'
        ? `代理人已拒絕您的請假申請`
        : `管理員已拒絕您的請假申請`

      await novu.trigger({
        workflowId: 'test-notification',
        to: { subscriberId: `user_${existingLeave.requesterId}` },
        payload: { 
          title: messageTitle,
          body: messageBody,
          message: messageBody
        }
      })
    } catch (e) {
      console.error('Novu 發送失敗', e)
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('[PUT /api/leaves/[id]/reject]', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
} 