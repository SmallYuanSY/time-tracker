// app/api/worklog/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/worklog] 收到的資料:', body)
    }
    
    const {
      userId,
      startTime,
      endTime,
      projectCode,
      projectName,
      category,
      content,
    } = body

    if (
      !userId || !startTime ||
      !projectCode || !projectName || !category || !content
    ) {
      const missingFields = []
      if (!userId) missingFields.push('userId')
      if (!startTime) missingFields.push('startTime')
      if (!projectCode) missingFields.push('projectCode')
      if (!projectName) missingFields.push('projectName')
      if (!category) missingFields.push('category')
      if (!content) missingFields.push('content')
      
      if (process.env.NODE_ENV !== 'production') {
        console.error('[POST /api/worklog] 缺少必要欄位:', missingFields)
      }
      return new NextResponse(`缺少必要欄位: ${missingFields.join(', ')}`, { status: 400 })
    }

    // 驗證日期格式
    const startDate = new Date(startTime)
    const endDate = endTime ? new Date(endTime) : null
    
    if (isNaN(startDate.getTime())) {
      console.error('[POST /api/worklog] 無效的開始時間:', startTime)
      return new NextResponse('無效的開始時間格式', { status: 400 })
    }
    
    if (endTime && isNaN(endDate!.getTime())) {
      console.error('[POST /api/worklog] 無效的結束時間:', endTime)
      return new NextResponse('無效的結束時間格式', { status: 400 })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/worklog] 嘗試建立工作記錄...')
      console.log('[POST /api/worklog] startDate:', startDate)
      console.log('[POST /api/worklog] endDate:', endDate)
    }
    
    const result = await prisma.workLog.create({
      data: {
        userId,
        startTime: startDate,
        endTime: endDate as any,
        projectCode,
        projectName,
        category,
        content,
      },
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/worklog] 成功建立工作記錄:', result.id)
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/worklog] 錯誤詳情:', error)
    
    // 更具體的錯誤處理
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return new NextResponse('資料重複錯誤', { status: 409 })
      }
      if (error.message.includes('Foreign key constraint')) {
        return new NextResponse('用戶不存在', { status: 400 })
      }
      return new NextResponse(`資料庫錯誤: ${error.message}`, { status: 500 })
    }
    
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
