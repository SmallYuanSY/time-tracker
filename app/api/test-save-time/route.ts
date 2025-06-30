// 測試時間儲存的 API
import { NextRequest, NextResponse } from 'next/server'
import { nowInTaiwan } from '@/lib/timezone'

export async function POST(req: NextRequest) {
  try {
    const { testTime } = await req.json()
    
    const savedTime = new Date(testTime)
    const currentTaiwanTime = nowInTaiwan()
    
    return NextResponse.json({
      success: true,
      data: {
        inputTime: testTime,
        savedTime: savedTime.toISOString(),
        currentTaiwanTime: currentTaiwanTime.toISOString(),
        message: '這些時間在 Prisma Studio 中會直接顯示為台灣時間'
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
} 