import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Novu } from '@novu/api'

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

export async function POST(req: NextRequest) {
  try {
    const { userId, agentEmail, reason, startDate, endDate } = await req.json()
    if (!userId || !agentEmail || !reason || !startDate || !endDate) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const agent = await prisma.user.findUnique({ where: { email: agentEmail } })
    if (!agent) {
      return NextResponse.json({ error: '代理人不存在' }, { status: 400 })
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        requesterId: userId,
        agentId: agent.id,
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    })

    // 通知代理人
    try {
      await novu.trigger({
        workflowId: 'leave-request',
        to: { subscriberId: `user_${agent.id}` },
        payload: {
          message: `收到請假代理請求`,
        }
      })
    } catch (e) {
      console.error('Novu 發送失敗', e)
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('[POST /api/leaves]', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
