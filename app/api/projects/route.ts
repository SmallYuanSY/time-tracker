import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 獲取專案列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 從 Project 表獲取專案，包含案件類別和工作分類
    const projects = await prisma.project.findMany({
      include: {
        Contact: true,
        projectType: true,
        workCategories: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        code: 'asc',
      },
    })

    // 從 workLog 表獲取所有不重複的專案
    const distinctWorkLogProjects = await prisma.workLog.groupBy({
      by: ['projectCode', 'projectName', 'category'],
    })

    // 建立一個 Set 來追蹤已經存在的專案代號
    const existingCodes = new Set(projects.map(p => p.code))

    // 過濾並轉換 workLog 中的專案
    const workLogProjects = distinctWorkLogProjects
      .filter(p => !existingCodes.has(p.projectCode))
      .map(p => ({
        id: p.projectCode,
        code: p.projectCode,
        name: p.projectName,
        category: p.category, // 保留向後相容
        status: 'ACTIVE', // 從工作記錄來的案件預設為進行中
        Contact: null,
        projectType: null, // 從 workLog 來的案件暫時沒有 projectType
      }))

    // 合併兩個來源的專案並排序
    const allProjects = [
      ...projects,
      ...workLogProjects
    ].sort((a, b) => a.code.localeCompare(b.code))

    return NextResponse.json(allProjects)
  } catch (error) {
    console.error('[GET /api/projects]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 創建新案件
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { code, name, category, description, projectTypeId, workCategoryIds = [] } = await req.json()

    if (!code || !name) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    // 檢查案件是否已存在於 Project 表
    const existingProject = await prisma.project.findUnique({
      where: { code },
    })

    if (existingProject) {
      return new NextResponse('案件代號已存在', { status: 400 })
    }

    // 檢查案件是否存在於 workLog 表
    const existingWorkLog = await prisma.workLog.findFirst({
      where: { projectCode: code },
    })

    if (existingWorkLog) {
      return new NextResponse('案件代號已在工作記錄中使用', { status: 400 })
    }

    // 創建新專案
    const newProject = await prisma.project.create({
      data: {
        code,
        name,
        category: category || '', // 保留向後相容
        description,
        projectTypeId: projectTypeId || null,
        managerId: (session.user as any).id,
        status: 'ACTIVE',
      },
      include: {
        projectType: true,
        Contact: true,
        workCategories: {
          include: {
            category: true
          }
        }
      },
    })

    // 如果有提供工作分類，建立關聯
    if (workCategoryIds.length > 0) {
      await prisma.projectWorkCategory.createMany({
        data: workCategoryIds.map((categoryId: string) => ({
          projectId: newProject.id,
          categoryId
        })),
        skipDuplicates: true
      })

      // 重新查詢以獲取完整的關聯資料
      const updatedProject = await prisma.project.findUnique({
        where: { id: newProject.id },
        include: {
          projectType: true,
          Contact: true,
          workCategories: {
            include: {
              category: true
            }
          }
        }
      })

      return NextResponse.json(updatedProject)
    }

    return NextResponse.json(newProject)
  } catch (error) {
    console.error('[POST /api/projects]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 