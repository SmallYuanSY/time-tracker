import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - 獲取所有工作分類
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // 檢查是否為管理員，如果是管理員且要求包含停用分類，則返回所有分類
    let whereClause = {}
    if (!includeInactive) {
      whereClause = { isActive: true }
    } else {
      // 檢查用戶權限
      const user = await prisma.user.findUnique({
        where: { email: session.user?.email || '' }
      })

      if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
        // 非管理員只能看到啟用的分類
        whereClause = { isActive: true }
      }
    }

    const categories = await prisma.workCategory.findMany({
      where: whereClause,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('獲取工作分類失敗:', error)
    return NextResponse.json({ error: '獲取工作分類失敗' }, { status: 500 })
  }
}

// POST - 新增工作分類（僅管理員）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查用戶權限
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return NextResponse.json({ error: '權限不足，只有管理員可以管理工作分類' }, { status: 403 })
    }

    const data = await request.json()
    const { categoryId, title, content, icon, description, colorBg, colorText, colorBorder, colorAccent, sortOrder } = data

    // 驗證必要欄位
    if (!categoryId || !title || !content || !colorBg || !colorText || !colorBorder || !colorAccent) {
      return NextResponse.json({ error: '請填寫所有必要欄位' }, { status: 400 })
    }

    // 檢查分類 ID 是否已存在
    const existingCategory = await prisma.workCategory.findUnique({
      where: { categoryId }
    })

    if (existingCategory) {
      return NextResponse.json({ error: '分類 ID 已存在' }, { status: 400 })
    }

    const category = await prisma.workCategory.create({
      data: {
        categoryId,
        title,
        content,
        icon,
        description,
        colorBg,
        colorText,
        colorBorder,
        colorAccent,
        sortOrder: sortOrder || 0,
        isSystem: false
      }
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('新增工作分類失敗:', error)
    return NextResponse.json({ error: '新增工作分類失敗' }, { status: 500 })
  }
}

// PUT - 更新工作分類（僅管理員）
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查用戶權限
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return NextResponse.json({ error: '權限不足，只有管理員可以管理工作分類' }, { status: 403 })
    }

    const data = await request.json()
    const { id, title, content, icon, description, colorBg, colorText, colorBorder, colorAccent, sortOrder, isActive } = data

    if (!id) {
      return NextResponse.json({ error: '缺少分類 ID' }, { status: 400 })
    }

    const category = await prisma.workCategory.update({
      where: { id },
      data: {
        title,
        content,
        icon,
        description,
        colorBg,
        colorText,
        colorBorder,
        colorAccent,
        sortOrder,
        isActive
      }
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('更新工作分類失敗:', error)
    return NextResponse.json({ error: '更新工作分類失敗' }, { status: 500 })
  }
} 