import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, projectCode, projectName, category, content } = body

    if (!userId || !projectCode || !projectName || !category || !content) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id || (session.user as any).id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const now = new Date()

    // 結束所有未完成的紀錄
    const ongoingLogs = await prisma.workLog.findMany({
      where: { userId, endTime: null },
    })

    if (ongoingLogs.length > 0) {
      await prisma.workLog.updateMany({
        where: { 
          userId, 
          endTime: null 
        },
        data: { endTime: now },
      })
      
      if (process.env.NODE_ENV !== 'production') {
        //console.log(`[快速新增] 結束了 ${ongoingLogs.length} 個進行中的工作記錄`)
      }
    }

    // 使用事務來確保專案成員加入和工作記錄創建的一致性
    const result = await prisma.$transaction(async (tx) => {
      // 檢查或創建專案
      let project = await tx.project.findUnique({
        where: { code: projectCode },
      })

      if (!project) {
        try {
          project = await tx.project.create({
            data: {
              code: projectCode,
              name: projectName,
              category: category || '',
              description: `從快速工作記錄自動創建 - ${content}`,
              managerId: userId,
              status: 'ACTIVE',
            },
          })
        } catch (error) {
          // 如果創建失敗，重新查詢
          project = await tx.project.findUnique({
            where: { code: projectCode },
          })
          
          if (!project) {
            throw error
          }
        }
      }

      // 自動將使用者加入專案成員（如果尚未加入）
      try {
        await tx.$executeRaw`
          INSERT INTO ProjectToUser (projectId, userId, assignedAt)
          VALUES (${project.id}, ${userId}, datetime('now'))
          ON CONFLICT(projectId, userId) DO NOTHING
        `
        
        if (process.env.NODE_ENV !== 'production') {
          //console.log('[快速新增] 自動將使用者加入專案成員:', userId, 'to project:', project.code)
        }
      } catch (memberError) {
        // 如果加入成員失敗（可能已經是成員），不影響工作記錄創建
        if (process.env.NODE_ENV !== 'production') {
          //console.log('[快速新增] 使用者可能已是專案成員:', memberError)
        }
      }

      // 創建工作記錄
      const workLogResult = await tx.workLog.create({
        data: {
          userId,
          projectCode,
          projectName,
          category,
          content,
          startTime: now,
          projectId: project.id,
        },
      })

      return workLogResult
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/worklog/quick]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}
