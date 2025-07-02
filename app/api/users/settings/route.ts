import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { SettingKey } from '@prisma/client'

// 獲取使用者設定
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const settings = await prisma.userSetting.findMany({
      where: {
        userId
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('獲取使用者設定失敗:', error)
    return NextResponse.json({ error: '獲取使用者設定失敗' }, { status: 500 })
  }
}

// 更新使用者設定
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { key, value } = await request.json()

    // 驗證設定鍵是否有效
    if (!Object.values(SettingKey).includes(key)) {
      return NextResponse.json({ error: '無效的設定鍵' }, { status: 400 })
    }

    // 使用 upsert 來新增或更新設定
    const setting = await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: key as SettingKey
        }
      },
      update: {
        value
      },
      create: {
        userId,
        key: key as SettingKey,
        value
      }
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('更新使用者設定失敗:', error)
    return NextResponse.json({ error: '更新使用者設定失敗' }, { status: 500 })
  }
}

// 刪除使用者設定
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { key } = await request.json()

    // 驗證設定鍵是否有效
    if (!Object.values(SettingKey).includes(key)) {
      return NextResponse.json({ error: '無效的設定鍵' }, { status: 400 })
    }

    await prisma.userSetting.delete({
      where: {
        userId_key: {
          userId,
          key: key as SettingKey
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('刪除使用者設定失敗:', error)
    return NextResponse.json({ error: '刪除使用者設定失敗' }, { status: 500 })
  }
} 