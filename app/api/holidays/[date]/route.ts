import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 獲取特定日期的假日資訊
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { date } = await params

    // 驗證日期格式
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new NextResponse('Invalid date format. Expected YYYY-MM-DD', { status: 400 })
    }

    // 查詢指定日期的假日資訊
    const holiday = await prisma.holiday.findUnique({
      where: {
        date: date
      }
    })

    // 如果沒有找到假日記錄，返回默認的工作日資訊
    if (!holiday) {
      return NextResponse.json({
        date,
        isHoliday: false,
        name: null,
        type: null,
        description: null
      })
    }

    return NextResponse.json(holiday)
  } catch (error) {
    console.error('Error fetching holiday:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}