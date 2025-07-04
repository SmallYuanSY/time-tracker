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
      const key = `${log.projectCode}|${log.category}|${log.content.trim()}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(log)
      return groups
    }, {} as Record<string, typeof workLogs>)

    // 分析每個組並生成預覽資訊
    const mergePreview = []

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
            if (currentGroup.some(groupLog => groupLog.id === log.id) || log.id === currentLog.id) {
              return false
            }
            return (
              log.startTime > lastLog.startTime &&
              log.endTime! < currentLog.endTime!
            )
          })

          if (potentialOverlaps.length === 0) {
            currentGroup.push(currentLog)
          } else {
            if (currentGroup.length > 1) {
              groupsToMerge.push([...currentGroup])
            }
            currentGroup = [currentLog]
          }
        } else {
          if (currentGroup.length > 1) {
            groupsToMerge.push([...currentGroup])
          }
          currentGroup = [currentLog]
        }
      }

      if (currentGroup.length > 1) {
        groupsToMerge.push(currentGroup)
      }

      // 為每個可合併組生成預覽資訊
      for (const group of groupsToMerge) {
        const firstLog = group[0]
        const totalDuration = group.reduce((total, log) => {
          const duration = (log.endTime!.getTime() - log.startTime.getTime()) / (1000 * 60)
          return total + duration
        }, 0)

        mergePreview.push({
          projectCode: firstLog.projectCode,
          projectName: firstLog.projectName,
          category: firstLog.category,
          content: firstLog.content,
          count: group.length,
          totalDuration: totalDuration < 60
            ? `${Math.round(totalDuration)}分鐘`
            : `${(totalDuration / 60).toFixed(1)}小時`
        })
      }
    }

    return NextResponse.json({
      success: true,
      preview: mergePreview
    })

  } catch (error) {
    console.error('[POST /api/worklog/merge-overlaps/preview]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 