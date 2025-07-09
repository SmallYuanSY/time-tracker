import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 獲取工作時間設定
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const settings = await prisma.workTimeSettings.findFirst({
      where: { id: 1 }
    })

    if (!settings) {
      // 如果沒有設定，創建預設設定
      const defaultSettings = await prisma.workTimeSettings.create({
        data: {
          id: 1,
          normalWorkStart: '09:00',
          normalWorkEnd: '18:00',
          lunchBreakStart: '12:30',
          lunchBreakEnd: '13:30',
          overtimeStart: '18:00',
          minimumOvertimeUnit: 30
        }
      })
      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('獲取工作時間設定失敗:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// 更新工作時間設定
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const data = await request.json()

    // 驗證時間格式
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(data.normalWorkStart) ||
        !timeRegex.test(data.normalWorkEnd) ||
        !timeRegex.test(data.lunchBreakStart) ||
        !timeRegex.test(data.lunchBreakEnd) ||
        !timeRegex.test(data.overtimeStart)) {
      return new NextResponse('Invalid time format', { status: 400 })
    }

    // 驗證最小加班計算單位
    if (typeof data.minimumOvertimeUnit !== 'number' ||
        data.minimumOvertimeUnit < 1 ||
        data.minimumOvertimeUnit > 60) {
      return new NextResponse('Invalid minimum overtime unit', { status: 400 })
    }

    const settings = await prisma.workTimeSettings.upsert({
      where: { id: 1 },
      update: {
        normalWorkStart: data.normalWorkStart,
        normalWorkEnd: data.normalWorkEnd,
        lunchBreakStart: data.lunchBreakStart,
        lunchBreakEnd: data.lunchBreakEnd,
        overtimeStart: data.overtimeStart,
        minimumOvertimeUnit: data.minimumOvertimeUnit
      },
      create: {
        id: 1,
        normalWorkStart: data.normalWorkStart,
        normalWorkEnd: data.normalWorkEnd,
        lunchBreakStart: data.lunchBreakStart,
        lunchBreakEnd: data.lunchBreakEnd,
        overtimeStart: data.overtimeStart,
        minimumOvertimeUnit: data.minimumOvertimeUnit
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('更新工作時間設定失敗:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 