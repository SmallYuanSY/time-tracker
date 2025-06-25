import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, projectCode, projectName, category, content } = body

    if (!userId || !projectCode || !projectName || !category || !content) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    const now = new Date()

    // 結束上一筆未完成的紀錄
    const lastLog = await prisma.workLog.findFirst({
      where: { userId, endTime: null },
      orderBy: { startTime: 'desc' },
    })

    if (lastLog) {
      await prisma.workLog.update({
        where: { id: lastLog.id },
        data: { endTime: now },
      })
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
