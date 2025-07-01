import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type RouteParams = {
  params: {
    date: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 查詢指定日期的假日資訊
    const holiday = await prisma.holiday.findUnique({
      where: {
        date: params.date,
      },
    })

    if (!holiday) {
      return new NextResponse('Holiday not found', { status: 404 })
    }

    return NextResponse.json(holiday)
  } catch (error) {
    console.error('Error fetching holiday:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 