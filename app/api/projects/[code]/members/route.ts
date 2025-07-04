import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: '缺少使用者 ID' }, { status: 400 })
    }

    const { code } = await params

    // 查找專案
    const project = await prisma.project.findUnique({
      where: { code }
    })

    if (!project) {
      return NextResponse.json({ error: '找不到專案' }, { status: 404 })
    }

    // 檢查使用者是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: '找不到使用者' }, { status: 404 })
    }

    // 使用 upsert 來處理成員新增
    try {
      await prisma.$executeRaw`
        INSERT INTO ProjectToUser (projectId, userId, assignedAt)
        VALUES (${project.id}, ${userId}, datetime('now'))
        ON CONFLICT(projectId, userId) DO NOTHING
      `
      
      return NextResponse.json({ message: '成員新增成功' })
    } catch (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: '使用者可能已經是專案成員' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error adding project member:', error)
    return NextResponse.json(
      { error: '新增成員失敗' },
      { status: 500 }
    )
  }
} 