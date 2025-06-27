import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE - 刪除工作分類（僅管理員）
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const categoryId = params.id

    // 檢查分類是否存在
    const category = await prisma.workCategory.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: '分類不存在' }, { status: 404 })
    }

    // 檢查是否為系統預設分類
    if (category.isSystem) {
      return NextResponse.json({ error: '無法刪除系統預設分類' }, { status: 400 })
    }

    // 檢查是否有相關的工作紀錄或預定工作使用此分類
    const workLogCount = await prisma.workLog.count({
      where: { category: category.content }
    })

    const scheduledWorkCount = await prisma.scheduledWork.count({
      where: { category: category.content }
    })

    if (workLogCount > 0 || scheduledWorkCount > 0) {
      // 如果有使用紀錄，則設為不活躍而非直接刪除
      const updatedCategory = await prisma.workCategory.update({
        where: { id: categoryId },
        data: { isActive: false }
      })
      
      return NextResponse.json({ 
        message: '由於此分類已被使用，已設為不活躍狀態', 
        category: updatedCategory 
      })
    }

    // 如果沒有使用紀錄，則可以直接刪除
    await prisma.workCategory.delete({
      where: { id: categoryId }
    })

    return NextResponse.json({ message: '工作分類已刪除' })
  } catch (error) {
    console.error('刪除工作分類失敗:', error)
    return NextResponse.json({ error: '刪除工作分類失敗' }, { status: 500 })
  }
} 