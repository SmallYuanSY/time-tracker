// API 端點：執行時區遷移
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runTimezoneMigration } from '@/lib/scripts/migrate-timezone'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // 只有管理員可以執行遷移
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return new NextResponse('需要管理員權限', { status: 403 })
    }

    console.log('🚀 開始執行時區遷移...')
    const stats = await runTimezoneMigration()
    
    return NextResponse.json({
      success: true,
      message: '時區遷移完成',
      stats
    })
    
  } catch (error) {
    console.error('時區遷移失敗:', error)
    return NextResponse.json({
      success: false,
      message: '遷移失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: '使用 POST 方法執行時區遷移',
    warning: '這個操作會永久修改資料庫，請確保已備份'
  })
} 