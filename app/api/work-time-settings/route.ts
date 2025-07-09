import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 獲取工作時間設定（只讀，所有登入使用者都可以讀取）
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const settings = await prisma.workTimeSettings.findFirst({
      where: { id: 1 }
    })

    if (!settings) {
      // 如果沒有設定，返回預設設定
      const defaultSettings = {
        id: 1,
        normalWorkStart: '09:00',
        normalWorkEnd: '18:00',
        lunchBreakStart: '12:30',
        lunchBreakEnd: '13:30',
        overtimeStart: '18:00',
        minimumOvertimeUnit: 30
      }
      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('獲取工作時間設定失敗:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 