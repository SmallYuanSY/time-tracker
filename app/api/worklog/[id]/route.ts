import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 更新工作記錄
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      userId,
      startTime,
      endTime,
      projectCode,
      projectName,
      category,
      content,
    } = await req.json()

    const { id } = params

    if (
      !userId || !startTime || !endTime ||
      !projectCode || !projectName || !category || !content
    ) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查工作記錄是否存在且屬於該用戶
    const existingLog = await prisma.workLog.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingLog) {
      return new NextResponse('工作記錄不存在或無權限編輯', { status: 404 })
    }

    const result = await prisma.workLog.update({
      where: { id },
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        projectCode,
        projectName,
        category,
        content,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PUT /api/worklog/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 刪除工作記錄
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const { id } = params

    if (!userId) {
      return new NextResponse('缺少 userId', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查工作記錄是否存在且屬於該用戶
    const existingLog = await prisma.workLog.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingLog) {
      return new NextResponse('工作記錄不存在或無權限刪除', { status: 404 })
    }

    await prisma.workLog.delete({
      where: { id },
    })

    return new NextResponse('刪除成功', { status: 200 })
  } catch (error) {
    console.error('[DELETE /api/worklog/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 