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
    const fromStr = searchParams.get('from') // ISO 字串
    const toStr = searchParams.get('to') // ISO 字串
    const ongoingOnly = searchParams.get('ongoingOnly') === 'true'

    if (!userId) {
      return new NextResponse('缺少 userId', { status: 400 })
    }

    let startDate: Date
    let endDate: Date

    // 支援兩種查詢模式：按日期 或 按時間範圍
    if (fromStr && toStr) {
      // 使用 from/to 範圍查詢
      startDate = new Date(fromStr)
      endDate = new Date(toStr)
    } else if (dateStr) {
      // 使用日期查詢（向後兼容）
      startDate = new Date(dateStr)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 1)
    } else {
      return new NextResponse('缺少 date 或 from/to 參數', { status: 400 })
    }

    // 建立查詢條件
    const whereConditions: any = {
      userId,
      startTime: {
        gte: startDate,
        lt: endDate,
      },
    }

    // 如果只要進行中的記錄（沒有結束時間）
    if (ongoingOnly) {
      whereConditions.endTime = null
    }

    const results = await prisma.workLog.findMany({
      where: whereConditions,
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
