import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查管理員權限
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, dates, password, note, signedBy } = body

    if (!userId || !dates || !Array.isArray(dates) || dates.length === 0 || !password || !signedBy) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 驗證管理員密碼
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: '密碼錯誤' }, { status: 401 })
    }

    // 檢查目標用戶是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: '目標用戶不存在' }, { status: 404 })
    }

    // 檢查同一管理員是否已經簽名過
    const existingSignatures = await prisma.attendanceSignature.findMany({
      where: {
        userId,
        signedBy,
        date: {
          in: dates,
        },
      },
    })

    if (existingSignatures.length > 0) {
      const duplicateDates = existingSignatures.map(sig => sig.date)
      return NextResponse.json({ 
        error: `您已經對以下日期簽名過了: ${duplicateDates.join(', ')}` 
      }, { status: 400 })
    }

    // 驗證每個日期都有打卡記錄
    for (const dateStr of dates) {
      const date = new Date(dateStr)
      const nextDay = new Date(date)
      nextDay.setDate(date.getDate() + 1)

      const clockRecords = await prisma.clock.findMany({
        where: {
          userId,
          timestamp: {
            gte: date,
            lt: nextDay,
          },
        },
      })

      if (clockRecords.length === 0) {
        return NextResponse.json({ 
          error: `日期 ${dateStr} 沒有打卡記錄，無法簽名` 
        }, { status: 400 })
      }
    }

    // 批量創建簽名記錄
    const signatureData = dates.map(date => ({
      userId,
      date,
      signedBy,
      note: note || null,
    }))

    await prisma.attendanceSignature.createMany({
      data: signatureData,
    })

    return NextResponse.json({ 
      message: `成功簽名 ${dates.length} 個日期的考勤記錄`,
      signedDates: dates,
    })
  } catch (error) {
    console.error('考勤簽名失敗:', error)
    return NextResponse.json({ error: '考勤簽名失敗' }, { status: 500 })
  }
} 