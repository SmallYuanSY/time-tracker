import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientIP } from '@/lib/ip-utils'

// 更新打卡記錄
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const {
      userId,
      timestamp,
      editReason,
    } = await req.json()

    const { id } = params

    if (!userId || !timestamp) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    // 編輯原因為必填
    if (!editReason || editReason.trim() === '') {
      return new NextResponse('編輯原因為必填欄位', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查權限：只有管理員或記錄所有者可以編輯
    const sessionUserId = (session.user as any).id
    const sessionUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { role: true }
    })

    const isAdmin = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'WEB_ADMIN'
    const isOwner = sessionUserId === userId

    if (!isAdmin && !isOwner) {
      return new NextResponse('無權限編輯此打卡記錄', { status: 403 })
    }

    // 檢查打卡記錄是否存在
    const existingRecord = await prisma.clock.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingRecord) {
      return new NextResponse('打卡記錄不存在', { status: 404 })
    }

    // 更新打卡記錄
    const result = await prisma.clock.update({
      where: { id },
      data: {
        timestamp: new Date(timestamp),
        // 編輯追蹤資訊
        isEdited: true,
        editReason: editReason.trim(),
        editedBy: sessionUserId,
        editedAt: new Date(),
        editIpAddress: getClientIP(req),
        // 如果是第一次編輯，保存原始時間
        originalTimestamp: existingRecord.isEdited ? existingRecord.originalTimestamp : existingRecord.timestamp,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PUT /api/clock/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 刪除打卡記錄
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const editReason = searchParams.get('editReason')
    const { id } = params

    if (!userId) {
      return new NextResponse('缺少 userId', { status: 400 })
    }

    // 刪除也需要編輯原因
    if (!editReason || editReason.trim() === '') {
      return new NextResponse('刪除原因為必填欄位', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查權限：只有管理員或記錄所有者可以刪除
    const sessionUserId = (session.user as any).id
    const sessionUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { role: true }
    })

    const isAdmin = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'WEB_ADMIN'
    const isOwner = sessionUserId === userId

    if (!isAdmin && !isOwner) {
      return new NextResponse('無權限刪除此打卡記錄', { status: 403 })
    }

    // 檢查打卡記錄是否存在
    const existingRecord = await prisma.clock.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingRecord) {
      return new NextResponse('打卡記錄不存在', { status: 404 })
    }

    await prisma.clock.delete({
      where: { id },
    })

    return new NextResponse('刪除成功', { status: 200 })
  } catch (error) {
    console.error('[DELETE /api/clock/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 