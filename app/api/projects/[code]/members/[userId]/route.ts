import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { code, userId } = await params

    // 查找專案
    const project = await prisma.project.findUnique({
      where: { code }
    })

    if (!project) {
      return NextResponse.json({ error: '找不到專案' }, { status: 404 })
    }

    // 使用 raw SQL 來刪除成員關聯
    const result = await prisma.$executeRaw`
      DELETE FROM ProjectToUser 
      WHERE projectId = ${project.id} AND userId = ${userId}
    `

    return NextResponse.json({ message: '成員移除成功' })
  } catch (error) {
    console.error('Error removing project member:', error)
    return NextResponse.json(
      { error: '移除成員失敗' },
      { status: 500 }
    )
  }
} 