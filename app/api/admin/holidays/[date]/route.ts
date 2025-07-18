import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type RouteParams = {
  params: Promise<{
    date: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date } = await context.params
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // 查詢指定日期的假日資訊
    const holiday = await prisma.holiday.findUnique({
      where: {
        date,
      },
    })

    // 不論是否找到假日記錄，都返回 JSON 格式的回應
    return NextResponse.json({
      date,
      isHoliday: !!holiday,
      holiday: holiday || null
    })
  } catch (error) {
    console.error('Error fetching holiday:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
} 