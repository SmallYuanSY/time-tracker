import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 取得所有已批准的請假記錄
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取所有已批准的請假記錄
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    return NextResponse.json(approvedLeaves)
  } catch (error) {
    console.error('[GET /api/leaves/approved]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 