import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Novu } from '@novu/api'

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { action } = await req.json()
    
    const newStatus = action === 'approve' ? 'APPROVED' : 'ADMIN_REJECTED'
    
    const leave = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status: newStatus }
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
        const message = action === 'approve' 
          ? `您的請假申請已獲得最終批准`
          : `您的請假申請已被管理員拒絕`
        
        await novu.trigger({
          workflowId: 'projoin-notification',
          to: { subscriberId: `user_${leaveWithDetails.requesterId}` },
          payload: { 
            title: '請假申請結果',
            body: message,
            message: message,
            primaryAction: {
              label: "查看請假狀態",
              redirect: {
                url: "/leave",
                target: "_self"
              }
            }
          }
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
