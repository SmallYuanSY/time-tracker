import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defaultProjectTypes } from '@/lib/data/projectTypes'

// 初始化預設案件類別
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查用戶權限
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'WEB_ADMIN')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    let createdCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const projectType of defaultProjectTypes) {
      try {
        // 檢查是否已存在
        const existing = await prisma.projectType.findUnique({
          where: { typeId: projectType.typeId }
        })

        if (existing) {
          skippedCount++
          continue
        }

        // 創建新的案件類別
        await prisma.projectType.create({
          data: projectType
        })

        createdCount++
      } catch (error) {
        console.error(`創建案件類別 ${projectType.typeId} 失敗:`, error)
        errors.push(`${projectType.name}: ${error instanceof Error ? error.message : '未知錯誤'}`)
      }
    }

    const summary = {
      total: defaultProjectTypes.length,
      created: createdCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors
    }

    return NextResponse.json({
      success: true,
      message: `初始化完成！創建了 ${createdCount} 個案件類別，跳過 ${skippedCount} 個已存在的類別${errors.length > 0 ? `，${errors.length} 個錯誤` : ''}`,
      summary
    })
  } catch (error) {
    console.error('[POST /api/project-types/init]', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '初始化失敗'
    }, { status: 500 })
  }
}