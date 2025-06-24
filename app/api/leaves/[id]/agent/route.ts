import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Novu } from '@novu/api'

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const leave = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status: 'PENDING_ADMIN' }
    })

    // 通知管理員
    try {
      await novu.trigger({
        workflowId: 'leave-agent-confirm',
        to: { subscriberId: 'admin' },
        payload: { message: '代理人已確認請假' }
      })
    } catch (e) {
      console.error('Novu 發送失敗', e)
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('[PUT /api/leaves/[id]/agent]', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
