import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 獲取用戶的案件列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const projectCode = searchParams.get('projectCode')
    const includeContacts = searchParams.get('includeContacts') === 'true'

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 如果是案件管理頁面（不需要 userId）
    if (!userId && includeContacts) {
      // 取得所有已使用的案件及其聯絡人資訊
      const distinctProjects = await prisma.workLog.groupBy({
        by: ['projectCode', 'projectName', 'category'],
        orderBy: {
          projectCode: 'asc',
        },
      })

      // 對每個案件查找關聯的 Project 記錄和聯絡人
      const projectsWithContacts = await Promise.all(
        distinctProjects.map(async (project) => {
          const projectRecord = await prisma.project.findUnique({
            where: { code: project.projectCode },
            include: {
              Contact: true,
            },
          })

          return {
            projectCode: project.projectCode,
            projectName: project.projectName,
            category: project.category,
            contact: projectRecord?.Contact || null,
          }
        })
      )

      return NextResponse.json(projectsWithContacts)
    }

    if (!userId) {
      return new NextResponse('缺少 userId', { status: 400 })
    }

    // 如果提供了案件編號，搜尋特定案件
    if (projectCode) {
      // 先從 Project 表查找
      const project = await prisma.project.findUnique({
        where: { code: projectCode },
        select: {
          code: true,
          name: true,
          category: true,
          status: true,
        },
      })

      if (project) {
        return NextResponse.json({
          projectCode: project.code,
          projectName: project.name,
          category: project.category,
          status: project.status,
        })
      }

      // 如果 Project 表沒有，回退到 workLog 表（兼容舊資料）
      const workLogProject = await prisma.workLog.findFirst({
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

      return NextResponse.json(workLogProject)
    }

    // 獲取用戶所有的案件列表
    // 先從 Project 表取得所有專案
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { managerId: userId },
          { workLogs: { some: { userId } } }
        ]
      },
      select: {
        code: true,
        name: true,
        category: true,
        status: true,
      },
      orderBy: { code: 'asc' },
    })

    // 轉換格式以兼容前端
    const formattedProjects = projects.map(p => ({
      projectCode: p.code,
      projectName: p.name,
      category: p.category,
      status: p.status,
    }))

    // 如果 Project 表沒有資料，回退到 workLog 表
    if (formattedProjects.length === 0) {
      const workLogs = await prisma.workLog.findMany({
        where: { userId },
        select: {
          projectCode: true,
          projectName: true,
          category: true,
        },
        distinct: ['projectCode'],
        orderBy: { projectCode: 'asc' },
      })

      const projectsMap = new Map()
      workLogs.forEach(log => {
        if (!projectsMap.has(log.projectCode)) {
          projectsMap.set(log.projectCode, log)
        }
      })
      
      return NextResponse.json(Array.from(projectsMap.values()))
    }

    return NextResponse.json(formattedProjects)
  } catch (error) {
    console.error('[GET /api/projects]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
}

// 創建新案件
export async function POST(req: NextRequest) {
  try {
    const { userId, projectCode, projectName, category, description } = await req.json()

    if (!userId || !projectCode || !projectName) {
      return new NextResponse('缺少必要欄位', { status: 400 })
    }

    // 檢查案件是否已存在
    const existingProject = await prisma.project.findUnique({
      where: { code: projectCode },
    })

    if (existingProject) {
      return NextResponse.json({
        projectCode: existingProject.code,
        projectName: existingProject.name,
        category: existingProject.category,
        status: existingProject.status,
      })
    }

    // 創建新專案
    const newProject = await prisma.project.create({
      data: {
        code: projectCode,
        name: projectName,
        category: category || '',
        description: description || '',
        managerId: userId,
      },
    })

    return NextResponse.json({
      projectCode: newProject.code,
      projectName: newProject.name,
      category: newProject.category,
      status: newProject.status,
      isNew: true,
    })
  } catch (error) {
    console.error('[POST /api/projects]', error)
    return new NextResponse('伺服器內部錯誤', { status: 500 })
  }
} 