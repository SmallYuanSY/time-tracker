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
      data: { status: 'APPROVED' }
    })

    // 通知所有人
    try {
      const users = await prisma.user.findMany()
      for (const u of users) {
        await novu.trigger({
          workflowId: 'leave-approved',
          to: { subscriberId: `user_${u.id}` },
          payload: { message: '同事請假已通過' }
        })
      }
    } catch (e) {
      console.error('Novu 發送失敗', e)
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('[PUT /api/leaves/[id]/admin]', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
