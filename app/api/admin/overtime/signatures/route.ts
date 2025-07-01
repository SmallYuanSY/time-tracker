import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查管理員權限
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const date = searchParams.get('date')

    const where: any = {}
    if (userId) {
      where.userId = userId
    }
    if (date) {
      where.date = date
    }

    const signatures = await prisma.overtimeSignature.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        signer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(signatures)
  } catch (error) {
    console.error('獲取加班簽名列表失敗:', error)
    return NextResponse.json({ error: '獲取加班簽名列表失敗' }, { status: 500 })
  }
} 