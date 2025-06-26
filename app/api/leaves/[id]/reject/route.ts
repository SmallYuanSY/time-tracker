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
      data: { status: 'REJECTED' }
    })

    // 通知申請人
    try {
      const leaveWithDetails = await prisma.leaveRequest.findUnique({
        where: { id: params.id },
        include: {
          requester: true,
          agent: true,
        }
      })
      
      if (leaveWithDetails) {
        await novu.trigger({
          workflowId: 'test-notification',
          to: { subscriberId: `user_${leaveWithDetails.requesterId}` },
          payload: { 
            title: '請假申請已拒絕',
            body: `您的請假申請已被拒絕`,
            message: `您的請假申請已被拒絕`
          }
        })
      }
    } catch (e) {
      console.error('Novu 發送失敗', e)
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('[PUT /api/leaves/[id]/reject]', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
} 