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
    
    const newStatus = action === 'approve' ? 'PENDING_ADMIN' : 'AGENT_REJECTED'
    
    const leave = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { 
        status: newStatus,
        agentApproved: action === 'approve' // 設置代理人是否批准
      }
    })

    // 通知申請人和管理員
    try {
      const leaveWithDetails = await prisma.leaveRequest.findUnique({
        where: { id: params.id },
        include: {
          requester: true,
          agent: true,
        }
      })
      
      if (leaveWithDetails) {
        // 通知申請人
        const messageToRequester = action === 'approve' 
          ? `代理人已確認您的請假申請，等待管理員最終審核`
          : `代理人已拒絕您的請假申請`
        
        await novu.trigger({
          workflowId: 'projoin-notification',
          to: { subscriberId: `user_${leaveWithDetails.requesterId}` },
          payload: { 
            title: '請假申請進度',
            body: messageToRequester,
            message: messageToRequester,
            primaryAction: {
              label: "查看請假狀態",
              redirect: {
                url: "/leave",
                target: "_self"
              }
            }
          }
        })

        // 如果代理人批准，通知所有管理員（僅 ADMIN 角色）
        if (action === 'approve') {
          const admins = await prisma.user.findMany({
            where: {
              role: 'ADMIN'
            }
          })

          for (const admin of admins) {
            await novu.trigger({
              workflowId: 'projoin-notification',
              to: { subscriberId: `user_${admin.id}` },
              payload: { 
                title: '請假申請待審核',
                body: `${leaveWithDetails.requester.name || leaveWithDetails.requester.email} 的請假申請已由代理人確認，等待您的最終審核`,
                message: `${leaveWithDetails.requester.name || leaveWithDetails.requester.email} 的請假申請已由代理人確認，等待您的最終審核`,
                primaryAction: {
                  label: "處理請假申請",
                  redirect: {
                    url: "/leave",
                    target: "_self"
                  }
                }
              }
            })
          }
        }
      }
    } catch (e) {
      console.error('Novu 發送失敗', e)
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('[PUT /api/leaves/[id]/agent]', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
