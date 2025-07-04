import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hash, compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: '請先登入' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    // 驗證輸入
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: '請填寫所有必填欄位' }, { status: 400 })
    }

    // 檢查密碼長度
    if (newPassword.length < 8) {
      return NextResponse.json({ message: '新密碼長度必須至少為 8 個字元' }, { status: 400 })
    }

    // 驗證當前密碼
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })
    if (!user) {
      return NextResponse.json({ message: '使用者不存在' }, { status: 404 })
    }

    const isPasswordValid = await compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ message: '當前密碼不正確' }, { status: 400 })
    }

    // 更新密碼
    const hashedPassword = await hash(newPassword, 12)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    })

    return NextResponse.json({ message: '密碼更新成功' })
  } catch (error) {
    console.error('更新密碼失敗:', error)
    return NextResponse.json({ message: '更新失敗' }, { status: 500 })
  }
} 