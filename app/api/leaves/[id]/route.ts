import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 獲取單個請假申請詳情
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    // 獲取請假申請詳情
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!leaveRequest) {
      return new NextResponse('請假申請不存在', { status: 404 })
    }

    // 檢查權限：只有申請人、代理人或管理員（僅 ADMIN）可以查看
    const isRequester = leaveRequest.requesterId === currentUser.id
    const isAgent = leaveRequest.agentId === currentUser.id
    const isAdmin = currentUser.role === 'ADMIN'

    if (!isRequester && !isAgent && !isAdmin) {
      return new NextResponse('無權限查看此請假申請', { status: 403 })
    }

    return NextResponse.json(leaveRequest)
  } catch (error) {
    console.error('[GET /api/leaves/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 