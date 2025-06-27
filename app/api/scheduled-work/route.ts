import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 取得預定工作
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取當前用戶
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return new NextResponse('用戶不存在', { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date') // 格式應為 YYYY-MM-DD

    let whereCondition: any = {
      userId: currentUser.id,
    }

    // 如果有指定日期，篩選該日期範圍內的預定工作
    if (dateStr) {
      const date = new Date(dateStr)
      const nextDate = new Date(date)
      nextDate.setDate(date.getDate() + 1)
      
      whereCondition.OR = [
        // 預定開始日期在指定日期
        {
          scheduledStartDate: {
            gte: date,
            lt: nextDate,
          }
        },
        // 預定結束日期在指定日期
        {
          scheduledEndDate: {
            gte: date,
            lt: nextDate,
          }
        },
        // 跨越指定日期的工作
        {
          scheduledStartDate: { lte: date },
          scheduledEndDate: { gte: nextDate }
        }
      ]
    }

    const scheduledWorks = await prisma.scheduledWork.findMany({
      where: whereCondition,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json(scheduledWorks)
  } catch (error) {
    console.error('[GET /api/scheduled-work]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 新增預定工作
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取當前用戶
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return new NextResponse('用戶不存在', { status: 404 })
    }

    const { projectCode, projectName, category, content, scheduledStartDate, scheduledEndDate, priority, workType = 'SCHEDULED' } = await req.json()

    if (!projectCode || !projectName || !category || !content || !scheduledStartDate || !scheduledEndDate) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    // 驗證日期格式
    const startDate = new Date(scheduledStartDate)
    const endDate = new Date(scheduledEndDate)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return new NextResponse('無效的日期格式', { status: 400 })
    }

    // 驗證結束日期不能早於開始日期
    if (endDate < startDate) {
      return new NextResponse('結束日期不能早於開始日期', { status: 400 })
    }

          // 建立預定工作
      const scheduledWork = await prisma.scheduledWork.create({
        data: {
          userId: currentUser.id,
          projectCode,
          projectName,
          category,
          content,
          scheduledStartDate: startDate,
          scheduledEndDate: endDate,
          priority: priority || 0,
          workType: workType,
        },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(scheduledWork)
  } catch (error) {
    console.error('[POST /api/scheduled-work]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 更新預定工作 (包含排序)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return new NextResponse('用戶不存在', { status: 404 })
    }

    const body = await req.json()
    
    // 批量更新排序
    if (body.type === 'reorder' && body.items) {
      const updatePromises = body.items.map((item: { id: string; priority: number }) =>
        prisma.scheduledWork.update({
          where: { 
            id: item.id,
            userId: currentUser.id, // 確保只能更新自己的工作
          },
          data: { priority: item.priority },
        })
      )

      await Promise.all(updatePromises)
      return NextResponse.json({ success: true })
    }

    // 單個項目更新
    const { id, ...updateData } = body
    
    if (!id) {
      return new NextResponse('缺少工作 ID', { status: 400 })
    }

    const scheduledWork = await prisma.scheduledWork.update({
      where: { 
        id,
        userId: currentUser.id, // 確保只能更新自己的工作
      },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(scheduledWork)
  } catch (error) {
    console.error('[PUT /api/scheduled-work]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 刪除預定工作
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return new NextResponse('用戶不存在', { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return new NextResponse('缺少工作 ID', { status: 400 })
    }

    await prisma.scheduledWork.delete({
      where: { 
        id,
        userId: currentUser.id, // 確保只能刪除自己的工作
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/scheduled-work]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 