import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { Novu } from '@novu/api'

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

// 檢查管理員權限
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const role = session.user.role as UserRole
  return role === UserRole.ADMIN || role === UserRole.WEB_ADMIN
}

// 發送假日變更通知給所有用戶
async function notifyAllUsers(message: string) {
  try {
    const users = await prisma.user.findMany()
    for (const user of users) {
      await novu.trigger({
        workflowId: 'projoin-notification',
        to: { subscriberId: `user_${user.id}` },
        payload: {
          title: '假日資訊更新',
          body: message,
          message: message,
          tags: ['holiday']
        }
      })
    }
  } catch (error) {
    console.error('發送假日通知失敗:', error)
  }
}

// 獲取所有假日
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取查詢參數
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let where = {}
    
    // 如果提供了月份和年份，則按月份篩選
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const endDate = `${year}-${month.padStart(2, '0')}-31`
      where = {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    }

    // 查詢假日列表
    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: {
        date: 'asc'
      }
    })

    return NextResponse.json(holidays)
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// 新增假日
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const data = await req.json()
    
    // 使用 upsert 來新增或更新假日記錄
    const holiday = await prisma.holiday.upsert({
      where: {
        date: data.date
      },
      update: {
        name: data.name,
        type: data.type,
        isHoliday: data.isHoliday,
        description: data.description
      },
      create: data
    })

    return NextResponse.json(holiday)
  } catch (error) {
    console.error('Error creating/updating holiday:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// 更新假日
export async function PUT(req: NextRequest) {
  try {
    const hasPermission = await checkAdminPermission()
    if (!hasPermission) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id, ...data } = await req.json()
    const holiday = await prisma.holiday.update({
      where: { id },
      data
    })

    // 發送更新假日通知
    await notifyAllUsers(`假日資訊更新：${data.name}（${new Date(data.date).toLocaleDateString()}）`)

    return NextResponse.json(holiday)
  } catch (error) {
    console.error('Error updating holiday:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// 刪除假日
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (!date) {
      return new NextResponse('Date is required', { status: 400 })
    }

    // 刪除指定日期的假日記錄
    await prisma.holiday.delete({
      where: {
        date
      }
    })

    return new NextResponse('Holiday deleted', { status: 200 })
  } catch (error) {
    console.error('Error deleting holiday:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 