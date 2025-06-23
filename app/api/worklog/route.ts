// app/api/worklog/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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

    if (
      !userId || !startTime || !endTime ||
      !projectCode || !projectName || !category || !content
    ) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    const result = await prisma.workLog.create({
      data: {
        userId,
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
    console.error('[POST /api/worklog]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const dateStr = searchParams.get('date') // 格式應為 YYYY-MM-DD

    if (!userId || !dateStr) {
      return new NextResponse('缺少 userId 或 date', { status: 400 })
    }

    const date = new Date(dateStr)
    const nextDay = new Date(date)
    nextDay.setDate(date.getDate() + 1)

    const results = await prisma.workLog.findMany({
      where: {
        userId,
        startTime: {
          gte: date,
          lt: nextDay,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('[GET /api/worklog]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}
