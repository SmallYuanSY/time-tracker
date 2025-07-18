import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defaultProjectTypes } from '@/lib/data/projectTypes'

// 建立資料遷移 API：將現有 Project.category 轉換為 ProjectType
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // 權限檢查：只有管理員和網頁管理員可以執行遷移
    if (!session?.user || !((session.user as any).role === 'ADMIN' || (session.user as any).role === 'WEB_ADMIN')) {
      return NextResponse.json(
        { error: '權限不足，只有管理員和網頁管理員可以執行資料遷移' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { dryRun = false, force = false } = body

    // 1. 檢查是否已經有 ProjectType 資料
    const existingProjectTypes = await prisma.projectType.findMany()
    
    if (existingProjectTypes.length === 0) {
      // 如果沒有 ProjectType 資料，先建立預設的 ProjectType
      console.log('建立預設的 ProjectType...')
      await prisma.projectType.createMany({
        data: defaultProjectTypes
      })
    }

    // 2. 獲取所有有 category 但沒有 projectTypeId 的專案
    const projectsToMigrate = await prisma.project.findMany({
      where: {
        AND: [
          { category: { not: null } },
          { category: { not: '' } },
          { 
            OR: [
              { projectTypeId: null },
              { projectTypeId: '' }
            ]
          }
        ]
      },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        projectTypeId: true
      }
    })

    console.log(`找到 ${projectsToMigrate.length} 個需要遷移的專案`)

    // 3. 分析現有的 category 值，建立對應的 ProjectType
    const categoryMap = new Map<string, string>()
    const uniqueCategories = Array.from(new Set(projectsToMigrate.map(p => p.category).filter(Boolean)))
    
    console.log('現有的 category 值：', uniqueCategories)

    // 4. 為每個獨特的 category 建立或找到對應的 ProjectType
    const allProjectTypes = await prisma.projectType.findMany()
    const migrationResults = []

    for (const category of uniqueCategories) {
      if (!category) continue

      // 嘗試找到匹配的 ProjectType
      let matchedType = allProjectTypes.find(pt => 
        pt.name.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(pt.name.toLowerCase())
      )

      if (!matchedType) {
        // 如果找不到匹配的 ProjectType，建立新的
        const newProjectType = {
          typeId: `custom_${category.toLowerCase().replace(/\s+/g, '_')}`,
          name: category,
          description: `從舊分類 "${category}" 自動轉換`,
          color: '#6B7280', // 預設灰色
          icon: '📁',
          isActive: true,
          sortOrder: 999
        }

        if (!dryRun) {
          matchedType = await prisma.projectType.create({
            data: newProjectType
          })
          console.log(`建立新的 ProjectType: ${matchedType.name}`)
        } else {
          console.log(`[DRY RUN] 將建立新的 ProjectType: ${newProjectType.name}`)
        }
      }

      if (matchedType) {
        categoryMap.set(category, matchedType.id)
      }
    }

    // 5. 更新專案的 projectTypeId
    const updateResults = []
    for (const project of projectsToMigrate) {
      if (!project.category) continue

      const projectTypeId = categoryMap.get(project.category)
      if (!projectTypeId) continue

      const updateData = {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        oldCategory: project.category,
        newProjectTypeId: projectTypeId
      }

      if (!dryRun) {
        await prisma.project.update({
          where: { id: project.id },
          data: { projectTypeId }
        })
        console.log(`更新專案 ${project.code}: ${project.category} -> ${projectTypeId}`)
      } else {
        console.log(`[DRY RUN] 將更新專案 ${project.code}: ${project.category} -> ${projectTypeId}`)
      }

      updateResults.push(updateData)
    }

    // 6. 驗證遷移結果
    let verificationResults = null
    if (!dryRun) {
      const updatedProjects = await prisma.project.findMany({
        where: {
          id: { in: projectsToMigrate.map(p => p.id) }
        },
        include: {
          projectType: true
        }
      })

      verificationResults = updatedProjects.map(p => ({
        projectCode: p.code,
        projectName: p.name,
        oldCategory: projectsToMigrate.find(old => old.id === p.id)?.category,
        newProjectType: p.projectType ? {
          id: p.projectType.id,
          name: p.projectType.name,
          typeId: p.projectType.typeId
        } : null
      }))
    }

    const result = {
      dryRun,
      summary: {
        totalProjectsToMigrate: projectsToMigrate.length,
        uniqueCategories: uniqueCategories.length,
        projectTypesCreated: dryRun ? 0 : allProjectTypes.length,
        projectsUpdated: updateResults.length
      },
      categoriesFound: uniqueCategories,
      categoryMapping: Object.fromEntries(categoryMap),
      migrationDetails: updateResults,
      ...(verificationResults && { verificationResults })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('資料遷移失敗:', error)
    return NextResponse.json(
      { error: '資料遷移失敗：' + (error instanceof Error ? error.message : '未知錯誤') },
      { status: 500 }
    )
  }
}

// 獲取遷移狀態
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !((session.user as any).role === 'ADMIN' || (session.user as any).role === 'WEB_ADMIN')) {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      )
    }

    // 統計資料
    const stats = await prisma.$transaction([
      // 總專案數
      prisma.project.count(),
      // 有 category 的專案數
      prisma.project.count({
        where: {
          AND: [
            { category: { not: null } },
            { category: { not: '' } }
          ]
        }
      }),
      // 有 projectTypeId 的專案數
      prisma.project.count({
        where: {
          AND: [
            { projectTypeId: { not: null } },
            { projectTypeId: { not: '' } }
          ]
        }
      }),
      // 需要遷移的專案數（有 category 但沒有 projectTypeId）
      prisma.project.count({
        where: {
          AND: [
            { category: { not: null } },
            { category: { not: '' } },
            { 
              OR: [
                { projectTypeId: null },
                { projectTypeId: '' }
              ]
            }
          ]
        }
      }),
      // ProjectType 總數
      prisma.projectType.count()
    ])

    // 獲取獨特的 category 值
    const uniqueCategories = await prisma.project.groupBy({
      by: ['category'],
      where: {
        AND: [
          { category: { not: null } },
          { category: { not: '' } }
        ]
      },
      _count: {
        category: true
      }
    })

    return NextResponse.json({
      stats: {
        totalProjects: stats[0],
        projectsWithCategory: stats[1],
        projectsWithProjectType: stats[2],
        projectsNeedingMigration: stats[3],
        totalProjectTypes: stats[4]
      },
      uniqueCategories: uniqueCategories.map(c => ({
        category: c.category,
        count: c._count.category
      })),
      migrationNeeded: stats[3] > 0,
      migrationComplete: stats[3] === 0
    })

  } catch (error) {
    console.error('獲取遷移狀態失敗:', error)
    return NextResponse.json(
      { error: '獲取遷移狀態失敗' },
      { status: 500 }
    )
  }
}