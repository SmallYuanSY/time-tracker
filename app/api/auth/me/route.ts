import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - 獲取當前用戶資訊
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('獲取用戶資訊失敗:', error)
    return NextResponse.json({ error: '獲取用戶資訊失敗' }, { status: 500 })
  }
} 