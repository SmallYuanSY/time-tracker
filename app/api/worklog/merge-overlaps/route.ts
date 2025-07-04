import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()
    const { date } = body

    // 獲取指定日期的開始和結束時間
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    // 獲取該日期的所有工作記錄
    const workLogs = await prisma.workLog.findMany({
      where: {
        userId,
        startTime: {
          gte: dayStart,
          lt: dayEnd
        },
        // 只處理已完成的記錄
        endTime: {
          not: null
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // 按專案和分類分組，並加入內容作為分組條件
    const groupedLogs = workLogs.reduce((groups, log) => {
      // 使用專案代碼、分類和內容作為分組鍵
      const key = `${log.projectCode}|${log.category}|${log.content.trim()}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(log)
      return groups
    }, {} as Record<string, typeof workLogs>)

    // 使用事務處理合併操作
    const result = await prisma.$transaction(async (tx) => {
      const mergedResults = []

      for (const [key, logs] of Object.entries(groupedLogs)) {
        if (logs.length < 2) continue // 跳過不需要合併的記錄

        const sortedLogs = [...logs].sort((a, b) => 
          a.startTime.getTime() - b.startTime.getTime()
        )

        let currentGroup = [sortedLogs[0]]
        const groupsToMerge = []

        // 尋找可以合併的記錄組
        for (let i = 1; i < sortedLogs.length; i++) {
          const currentLog = sortedLogs[i]
          const lastLog = currentGroup[currentGroup.length - 1]

          // 檢查是否有重疊或相鄰（允許 1 分鐘的間隔）
          const timeDiff = (currentLog.startTime.getTime() - lastLog.endTime!.getTime()) / (1000 * 60)
          const hasOverlap = currentLog.startTime <= lastLog.endTime!
          
          if (hasOverlap || (timeDiff > 0 && timeDiff <= 1)) {
            // 檢查是否會跨越其他專案的記錄
            const potentialOverlaps = workLogs.filter(log => {
              // 排除當前組的記錄
              if (currentGroup.some(groupLog => groupLog.id === log.id) || log.id === currentLog.id) {
                return false
              }
              
              // 檢查是否在當前記錄和最後一條記錄之間
              return (
                log.startTime > lastLog.startTime &&
                log.endTime! < currentLog.endTime!
              )
            })

            // 如果沒有跨越其他記錄，則可以合併
            if (potentialOverlaps.length === 0) {
              currentGroup.push(currentLog)
            } else {
              // 如果有其他記錄，結束當前組並開始新組
              if (currentGroup.length > 1) {
                groupsToMerge.push([...currentGroup])
              }
              currentGroup = [currentLog]
            }
          } else {
            // 時間間隔超過 1 分鐘，結束當前組並開始新組
            if (currentGroup.length > 1) {
              groupsToMerge.push([...currentGroup])
            }
            currentGroup = [currentLog]
          }
        }

        // 處理最後一組
        if (currentGroup.length > 1) {
          groupsToMerge.push(currentGroup)
        }

        // 處理每個需要合併的組
        for (const group of groupsToMerge) {
          const firstLog = group[0]
          const lastLog = group[group.length - 1]

          // 建立合併後的記錄（內容已經相同，直接使用第一條記錄的內容）
          const mergedLog = await tx.workLog.create({
            data: {
              userId,
              projectCode: firstLog.projectCode,
              projectName: firstLog.projectName,
              category: firstLog.category,
              content: firstLog.content,
              startTime: firstLog.startTime,
              endTime: lastLog.endTime,
            }
          })

          // 刪除原始記錄
          await tx.workLog.deleteMany({
            where: {
              id: {
                in: group.map(log => log.id)
              }
            }
          })

          mergedResults.push({
            originalCount: group.length,
            mergedLog
          })
        }
      }

      return mergedResults
    })

    return NextResponse.json({
      success: true,
      mergedCount: result.length,
      details: result
    })

  } catch (error) {
    console.error('[POST /api/worklog/merge-overlaps]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 