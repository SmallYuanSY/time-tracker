import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientIP } from '@/lib/ip-utils'
import { getTaiwanDayRange } from '@/lib/timezone'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      startTime,
      endTime,
      projectCode,
      projectName,
      category,
      content,
      confirmConflicts,
      isClockMode,
      clockEditReason,
    } = body

    if (!confirmConflicts) {
      return new NextResponse('未確認處理衝突', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    // 獲取當天的開始和結束時間
    const dayStart = new Date(startDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(startDate)
    dayEnd.setHours(23, 59, 59, 999)

    // 重新查找衝突記錄並處理
    const conflictingLogs = await prisma.workLog.findMany({
      where: {
        userId,
        // 只檢查同一天的記錄
        startTime: {
          gte: dayStart,
          lt: dayEnd
        },
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

    // 使用事務來確保工作記錄和打卡記錄的同步更新
    const result = await prisma.$transaction(async (tx) => {
      // 建立新的工作記錄
      const workLogResult = await tx.workLog.create({
        data: {
          userId,
          startTime: startDate,
          endTime: endDate,
          projectCode,
          projectName,
          category,
          content,
        },
      })

      // 如果是打卡模式且有修改原因，同時更新對應的打卡記錄
      if (isClockMode && clockEditReason) {
        // 獲取今日的打卡記錄範圍
        const { start: todayStart, end: todayEnd } = getTaiwanDayRange(startDate)
        
        // 查找今日最近的上班打卡記錄
        const recentClockIn = await tx.clock.findFirst({
          where: {
            userId,
            type: 'IN',
            timestamp: {
              gte: todayStart,
              lt: todayEnd,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        })

        if (recentClockIn) {
          // 更新打卡記錄的時間為工作記錄的開始時間
          await tx.clock.update({
            where: { id: recentClockIn.id },
            data: {
              timestamp: startDate,
              isEdited: true,
              editReason: clockEditReason.trim(),
              editedBy: userId,
              editedAt: new Date(),
              editIpAddress: getClientIP(req),
              // 如果還沒有原始時間戳，保存原始時間
              originalTimestamp: recentClockIn.isEdited ? recentClockIn.originalTimestamp : recentClockIn.timestamp,
            },
          })

          if (process.env.NODE_ENV !== 'production') {
            //console.log('[POST /api/worklog/confirm-conflicts] 同步更新打卡記錄:', recentClockIn.id)
          }
        }
      }

      return workLogResult
    })

    if (process.env.NODE_ENV !== 'production') {
      //console.log(`[POST /api/worklog/confirm-conflicts] 處理了 ${conflictingLogs.length} 個時間衝突並建立新記錄`)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/worklog/confirm-conflicts]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 