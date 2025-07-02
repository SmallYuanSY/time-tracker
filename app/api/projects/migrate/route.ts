import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 將現有的工作記錄遷移到案件管理系統
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 檢查用戶權限（只有 WEB_ADMIN 可以執行遷移）
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!currentUser || currentUser.role !== 'WEB_ADMIN') {
      return NextResponse.json({ error: "只有網頁管理員可以執行資料遷移" }, { status: 403 })
    }

    //console.log('🔄 開始遷移現有工作記錄到案件管理系統...')

    // 獲取所有不重複的案件資訊
    const distinctProjects = await prisma.workLog.groupBy({
      by: ['projectCode', 'projectName', 'category'],
      _count: {
        id: true,
      },
      orderBy: {
        projectCode: 'asc',
      },
    })

    //console.log(`📊 找到 ${distinctProjects.length} 個不重複的案件`)

    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // 為每個不重複的案件創建 Project 記錄
    for (const projectData of distinctProjects) {
      try {
        // 檢查案件是否已存在
        const existingProject = await prisma.project.findUnique({
          where: { code: projectData.projectCode },
        })

        if (existingProject) {
          //console.log(`⏭️  案件 ${projectData.projectCode} 已存在，跳過`)
          skippedCount++
          continue
        }

        // 獲取該案件的第一個工作記錄來確定管理員
        const firstWorkLog = await prisma.workLog.findFirst({
          where: {
            projectCode: projectData.projectCode,
          },
          orderBy: {
            startTime: 'asc',
          },
          select: {
            userId: true,
            content: true,
          },
        })

        if (!firstWorkLog) {
          //console.log(`❌ 案件 ${projectData.projectCode} 找不到對應的工作記錄`)
          errorCount++
          errors.push(`案件 ${projectData.projectCode} 找不到對應的工作記錄`)
          continue
        }

        // 創建新的 Project 記錄
        const newProject = await prisma.project.create({
          data: {
            code: projectData.projectCode,
            name: projectData.projectName,
            category: projectData.category || '',
            description: `從工作記錄遷移 - 包含 ${projectData._count.id} 筆工作記錄`,
            managerId: firstWorkLog.userId,
            status: 'ACTIVE',
          },
        })

        //console.log(`✅ 成功創建案件: ${newProject.code} - ${newProject.name}`)
        createdCount++

        // 更新該案件的所有工作記錄，關聯到新創建的 Project
        await prisma.workLog.updateMany({
          where: {
            projectCode: projectData.projectCode,
          },
          data: {
            projectId: newProject.id,
          },
        })

        //console.log(`🔗 已關聯 ${projectData._count.id} 筆工作記錄到案件 ${newProject.code}`)

      } catch (error) {
        console.error(`❌ 創建案件 ${projectData.projectCode} 時發生錯誤:`, error)
        errorCount++
        errors.push(`案件 ${projectData.projectCode}: ${error instanceof Error ? error.message : '未知錯誤'}`)
      }
    }

    const summary = {
      total: distinctProjects.length,
      created: createdCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors,
    }

    //console.log('🎉 遷移完成:', summary)

    return NextResponse.json({
      success: true,
      message: `遷移完成！創建了 ${createdCount} 個案件，跳過 ${skippedCount} 個已存在的案件${errorCount > 0 ? `，${errorCount} 個錯誤` : ''}`,
      summary,
    })

  } catch (error) {
    console.error('❌ 遷移過程中發生錯誤:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '遷移失敗',
    }, { status: 500 })
  }
} 