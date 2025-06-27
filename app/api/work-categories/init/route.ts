import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { workCategories } from '@/lib/data/workCategories'

// POST - 初始化預設工作分類（僅管理員）
export async function POST() {
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
      return NextResponse.json({ error: '權限不足，只有管理員可以初始化工作分類' }, { status: 403 })
    }

    // 檢查是否已經有分類
    const existingCount = await prisma.workCategory.count()
    if (existingCount > 0) {
      // 如果已有分類，詢問是否要重新初始化
      // 這裡我們先刪除所有非系統分類，然後重新建立系統分類
      await prisma.workCategory.deleteMany({
        where: { isSystem: true }
      })
    }

    // 將硬編碼的分類插入資料庫
    const createdCategories = []
    for (let i = 0; i < workCategories.length; i++) {
      const category = workCategories[i]
      
      try {
        const newCategory = await prisma.workCategory.create({
          data: {
            categoryId: category.id,
            title: category.title,
            content: category.content,
            icon: category.icon,
            description: category.description,
            colorBg: category.color.bg,
            colorText: category.color.text,
            colorBorder: category.color.border,
            colorAccent: category.color.accent,
            isActive: true,
            isSystem: true, // 標記為系統預設分類
            sortOrder: i
          }
        })
        
        createdCategories.push(newCategory)
      } catch (error) {
        console.error(`創建分類失敗 ${category.title}:`, error)
      }
    }
    
    return NextResponse.json({ 
      message: '工作分類初始化完成',
      count: createdCategories.length,
      categories: createdCategories
    })
  } catch (error) {
    console.error('初始化工作分類失敗:', error)
    return NextResponse.json({ error: '初始化工作分類失敗' }, { status: 500 })
  }
} 