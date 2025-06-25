import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
      confirmConflicts,
    } = await req.json()

    const { id } = params

    if (
      !userId || !startTime || !endTime ||
      !projectCode || !projectName || !category || !content ||
      !confirmConflicts
    ) {
      return new NextResponse('缺少必要欄位或未確認處理衝突', { status: 400 })
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

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)
    
    // 重新查找衝突記錄並處理
    const conflictingLogs = await prisma.workLog.findMany({
      where: {
        userId,
        id: { not: id },
        OR: [
          {
            startTime: {
              gte: startDate,
              lt: endDate,
            },
          },
          {
            endTime: {
              gt: startDate,
              lte: endDate,
            },
          },
          {
            startTime: {
              lte: startDate,
            },
            endTime: {
              gte: endDate,
            },
          },
          {
            startTime: {
              lt: endDate,
            },
            endTime: null,
          },
        ],
      },
    })

    // 處理衝突的記錄
    for (const conflictLog of conflictingLogs) {
      if (!conflictLog.endTime) {
        // 進行中的記錄：設定結束時間為新記錄的開始時間
        await prisma.workLog.update({
          where: { id: conflictLog.id },
          data: { endTime: startDate },
        })
      } else {
        // 已完成的記錄：調整時間或分割
        if (conflictLog.startTime < startDate && conflictLog.endTime > endDate) {
          // 現有記錄完全包含新記錄：分割為兩段
          await prisma.workLog.update({
            where: { id: conflictLog.id },
            data: { endTime: startDate },
          })
          // 建立後半段
          await prisma.workLog.create({
            data: {
              userId: conflictLog.userId,
              projectCode: conflictLog.projectCode,
              projectName: conflictLog.projectName,
              category: conflictLog.category,
              content: conflictLog.content,
              startTime: endDate,
              endTime: conflictLog.endTime,
            },
          })
        } else if (conflictLog.startTime < startDate) {
          // 現有記錄跨越新記錄開始：縮短結束時間
          await prisma.workLog.update({
            where: { id: conflictLog.id },
            data: { endTime: startDate },
          })
        } else if (conflictLog.endTime > endDate) {
          // 現有記錄跨越新記錄結束：調整開始時間
          await prisma.workLog.update({
            where: { id: conflictLog.id },
            data: { startTime: endDate },
          })
        } else {
          // 現有記錄完全在新記錄範圍內：刪除
          await prisma.workLog.delete({
            where: { id: conflictLog.id },
          })
        }
      }
    }

    // 更新目標記錄
    const result = await prisma.workLog.update({
      where: { id },
      data: {
        startTime: startDate,
        endTime: endDate,
        projectCode,
        projectName,
        category,
        content,
      },
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PUT /api/worklog/[id]/confirm-conflicts] 處理了 ${conflictingLogs.length} 個時間衝突並更新記錄`)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PUT /api/worklog/[id]/confirm-conflicts]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 