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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!userId || !start || !end) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 載入簽名記錄
    const signatures = await prisma.attendanceSignature.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        signer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        signedAt: 'desc',
      },
    })

    // 格式化回應
    const formattedSignatures = signatures.map(signature => ({
      id: signature.id,
      userId: signature.userId,
      date: signature.date,
      signedBy: signature.signedBy,
      signedAt: signature.signedAt.toISOString(),
      note: signature.note,
      signerName: signature.signer.name || signature.signer.email,
    }))

    return NextResponse.json(formattedSignatures)
  } catch (error) {
    console.error('載入簽名記錄失敗:', error)
    return NextResponse.json({ error: '載入簽名記錄失敗' }, { status: 500 })
  }
} 