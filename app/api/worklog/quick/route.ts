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

    const result = await prisma.workLog.create({
      data: {
        userId,
        projectCode,
        projectName,
        category,
        content,
        startTime: now,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/worklog/quick]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}
