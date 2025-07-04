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

    const { email, currentPassword } = await request.json()

    // 驗證輸入
    if (!email || !currentPassword) {
      return NextResponse.json({ message: '請填寫所有必填欄位' }, { status: 400 })
    }

    // 檢查信箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: '信箱格式不正確' }, { status: 400 })
    }

    // 檢查信箱是否已被使用
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json({ message: '此信箱已被使用' }, { status: 400 })
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

    // 更新信箱
    await prisma.user.update({
      where: { id: session.user.id },
      data: { email }
    })

    return NextResponse.json({ message: '信箱更新成功' })
  } catch (error) {
    console.error('更新信箱失敗:', error)
    return NextResponse.json({ message: '更新失敗' }, { status: 500 })
  }
} 