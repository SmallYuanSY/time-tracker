import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

type RouteParams = {
  params: Promise<{
    code: string
  }>
}

const projectInclude = {
  Contact: true,
  projectType: true,
  manager: {
    select: {
      id: true,
      name: true,
      email: true,
    }
  },
  userAssignments: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  },
  workCategories: {
    include: {
      category: true
    }
  }
} as const

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: typeof projectInclude
}>

type UserInfo = {
  id: string
  name: string | null
  email: string
}

interface ProjectResponse extends Omit<ProjectWithRelations, 'userAssignments'> {
  users: UserInfo[]
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { params } = context
    if (!(await params)?.code) {
      return new NextResponse('Project code is required', { status: 400 })
    }

    const code = (await params).code

    // 先從 Project 表中查找
    let project = await prisma.project.findUnique({
      where: {
        code,
      },
      include: projectInclude,
    }) as ProjectWithRelations | null

    if (!project) {
      // 如果在 Project 表中找不到，從 WorkLog 表中查找
      const workLog = await prisma.workLog.findFirst({
        where: { projectCode: code },
        orderBy: { startTime: 'desc' },
      })

      if (workLog) {
        // 從工作記錄創建一個新的 Project 記錄
        project = await prisma.project.create({
          data: {
            code: workLog.projectCode,
            name: workLog.projectName,
            category: workLog.category,
            projectTypeId: null, // 從 workLog 創建的專案暫時沒有 projectType
            managerId: workLog.userId,
            status: 'ACTIVE',
            description: '從工作記錄自動創建',
          },
          include: projectInclude,
        }) as ProjectWithRelations
      } else {
        return new NextResponse('Project not found', { status: 404 })
      }
    }

    // 轉換回應格式
    const { userAssignments, ...projectData } = project
    const users: UserInfo[] = (userAssignments as any[]).map(assignment => ({
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
    }))
    const response: ProjectResponse = {
      ...projectData,
      users,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching project:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const body = await request.json()
    const { managerId, projectTypeId, name, description, status, workCategoryIds = [] } = body

    // 驗證管理者是否存在（如果有提供的話）
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      })

      if (!manager) {
        return NextResponse.json(
          { error: '找不到指定的管理者' },
          { status: 404 }
        )
      }
    }

    const { code } = await params

    // 更新專案
    const updateData: any = {}
    if (managerId) updateData.managerId = managerId
    if (projectTypeId !== undefined) updateData.projectTypeId = projectTypeId
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status

    const updatedProject = await prisma.project.update({
      where: { code },
      data: updateData,
      include: projectInclude
    }) as ProjectWithRelations

    // 更新工作分類關聯
    if (workCategoryIds.length >= 0) {
      // 先删除現有的關聯
      await prisma.projectWorkCategory.deleteMany({
        where: { projectId: updatedProject.id }
      })

      // 如果有新的工作分類，建立關聯
      if (workCategoryIds.length > 0) {
        await prisma.projectWorkCategory.createMany({
          data: workCategoryIds.map((categoryId: string) => ({
            projectId: updatedProject.id,
            categoryId
          })),
          skipDuplicates: true
        })
      }
    }

    // 轉換回應格式
    const { userAssignments, ...projectData } = updatedProject
    const users: UserInfo[] = (userAssignments as any[]).map(assignment => ({
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
    }))

    const response: ProjectResponse = {
      ...projectData,
      users,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: '更新專案失敗' },
      { status: 500 }
    )
  }
} 