import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientIP } from '@/lib/ip-utils'

// 更新工作記錄
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      editReason,
    } = await req.json()

    const { id } = await params

    if (
      !userId || !startTime || !endTime ||
      !projectCode || !projectName || !category || !content
    ) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    if (!editReason || editReason.trim() === '') {
      return new NextResponse('編輯原因為必填欄位', { status: 400 })
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

    // 時間衝突檢查和處理（排除當前編輯的記錄）
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)
    
    // 獲取當天的開始和結束時間
    const dayStart = new Date(startDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(startDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    const conflictingLogs = await prisma.workLog.findMany({
      where: {
        userId,
        id: { not: id }, // 排除當前編輯的記錄
        // 只檢查同一天的記錄
        startTime: {
          gte: dayStart,
          lt: dayEnd
        },
        OR: [
          // 現有記錄的開始時間在新記錄時間範圍內
          {
            startTime: {
              gte: startDate,
              lt: endDate,
            },
          },
          // 現有記錄的結束時間在新記錄時間範圍內
          {
            endTime: {
              gt: startDate,
              lte: endDate,
            },
          },
          // 現有記錄完全包含新記錄
          {
            startTime: {
              lte: startDate,
            },
            endTime: {
              gte: endDate,
            },
          },
          // 現有記錄跨越新記錄開始時間（進行中的記錄）
          {
            startTime: {
              lt: endDate,
            },
            endTime: null,
          },
        ],
      },
    })

    // 如果有衝突，返回衝突資訊讓前端確認
    if (conflictingLogs.length > 0) {
      const conflictDetails = conflictingLogs.map(log => {
        let action = ''
        if (!log.endTime) {
          action = `結束時間設為 ${startDate.toTimeString().slice(0, 5)}`
        } else if (log.startTime < startDate && log.endTime > endDate) {
          action = `分割為兩段：${log.startTime.toTimeString().slice(0, 5)}-${startDate.toTimeString().slice(0, 5)} 和 ${endDate.toTimeString().slice(0, 5)}-${log.endTime.toTimeString().slice(0, 5)}`
        } else if (log.startTime < startDate) {
          action = `縮短結束時間至 ${startDate.toTimeString().slice(0, 5)}`
        } else if (log.endTime > endDate) {
          action = `調整開始時間至 ${endDate.toTimeString().slice(0, 5)}`
        } else {
          action = '完全刪除'
        }
        
        return {
          id: log.id,
          projectCode: log.projectCode,
          projectName: log.projectName,
          category: log.category,
          content: log.content,
          startTime: log.startTime.toTimeString().slice(0, 5),
          endTime: log.endTime ? log.endTime.toTimeString().slice(0, 5) : '進行中',
          action
        }
      })

      return NextResponse.json({
        conflicts: conflictDetails,
        message: '檢測到時間衝突，需要確認處理方式'
      }, { status: 409 })
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
        // 編輯追蹤資訊
        isEdited: true,
        editReason: editReason.trim(),
        editedBy: userId,
        editedAt: new Date(),
        editIpAddress: getClientIP(req),
        // 如果是第一次編輯，保存原始時間
        originalStartTime: existingLog.isEdited ? existingLog.originalStartTime : existingLog.startTime,
        originalEndTime: existingLog.isEdited ? existingLog.originalEndTime : existingLog.endTime,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PUT /api/worklog/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 部分更新工作記錄（例如結束時間、加班狀態等）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()
    const { userId, endTime, isOvertime } = body
    const { id } = await params

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
      return new NextResponse('工作記錄不存在或無權限編輯', { status: 404 })
    }

    // 準備更新數據
    const updateData: any = {}
    
    if (endTime !== undefined) {
      updateData.endTime = new Date(endTime)
    }
    
    if (isOvertime !== undefined) {
      updateData.isOvertime = isOvertime
    }

    const result = await prisma.workLog.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PATCH /api/worklog/[id]]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 刪除工作記錄
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const { id } = await params

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