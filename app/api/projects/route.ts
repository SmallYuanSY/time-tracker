import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 獲取用戶的案件列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const projectCode = searchParams.get('projectCode')

    if (!userId) {
      return new NextResponse('缺少 userId', { status: 400 })
    }

    // 如果提供了案件編號，搜尋特定案件
    if (projectCode) {
      const project = await prisma.workLog.findFirst({
        where: {
          userId,
          projectCode,
        },
        select: {
          projectCode: true,
          projectName: true,
          category: true,
        },
      })

      return NextResponse.json(project)
    }

    // 獲取用戶所有的案件列表（去重）
    const workLogs = await prisma.workLog.findMany({
      where: {
        userId,
      },
      select: {
        projectCode: true,
        projectName: true,
        category: true,
      },
      distinct: ['projectCode'],
      orderBy: {
        projectCode: 'asc',
      },
    })

    // 手動去重（因為 Prisma 的 distinct 可能不完全可靠）
    const projectsMap = new Map()
    workLogs.forEach(log => {
      if (!projectsMap.has(log.projectCode)) {
        projectsMap.set(log.projectCode, log)
      }
    })
    
    const projects = Array.from(projectsMap.values())

    return NextResponse.json(projects)
  } catch (error) {
    console.error('[GET /api/projects]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 創建新案件（當輸入新的案件編號時）
export async function POST(req: NextRequest) {
  try {
    const { userId, projectCode, projectName, category } = await req.json()

    if (!userId || !projectCode || !projectName) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    // 檢查案件是否已存在
    const existingProject = await prisma.workLog.findFirst({
      where: {
        userId,
        projectCode,
      },
    })

    if (existingProject) {
      return NextResponse.json({
        projectCode: existingProject.projectCode,
        projectName: existingProject.projectName,
        category: existingProject.category,
      })
    }

    // 如果是新案件，暫時回傳案件資訊（實際創建會在工作記錄中發生）
    return NextResponse.json({
      projectCode,
      projectName,
      category: category || '',
      isNew: true,
    })
  } catch (error) {
    console.error('[POST /api/projects]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 